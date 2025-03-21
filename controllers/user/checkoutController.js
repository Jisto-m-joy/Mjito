const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");  
const Product = require("../../models/productSchema");
const Coupon = require("../../models/couponSchema");
const Wallet = require("../../models/walletSchema");
const mongoose = require('mongoose');
const razorpay = require('../../config/razorpay');
const crypto = require('crypto');

const loadCheckoutPage = async (req, res, next) => {
  try {
      const userId = req.session.user._id;
      
      // Fetch user's addresses
      const userAddresses = await Address.findOne({ userId });
      
      // Fetch cart with populated product details
      const cart = await Cart.findOne({ userId }).populate({
          path: 'items.productId',
          select: 'name images combos'
      });

      const activeCoupons = await Coupon.find({
          isListed: true,
          isDeleted: false,
          startOn: { $lte: new Date() },
          expireOn: { $gte: new Date() }
      });

      // Calculate totals
      let subtotal = cart ? cart.items.reduce((total, item) => total + item.totalPrice, 0) : 0;
      let discount = 0;
      let appliedCoupon = null;

      // Check if there's a session-stored coupon from a previous application
      if (req.session.appliedCoupon) {
          const coupon = await Coupon.findOne({
              code: req.session.appliedCoupon.toUpperCase(),
              isListed: true,
              isDeleted: false,
              startOn: { $lte: new Date() },
              expireOn: { $gte: new Date() }
          });
          if (coupon && subtotal >= coupon.minimumPrice) {
              discount = Math.min(coupon.offerPrice, subtotal);
              appliedCoupon = coupon.code;
          }
      }

      const finalAmount = subtotal - discount;
      
      res.render('checkout', {
          addresses: userAddresses ? userAddresses.address : [],
          cartItems: cart ? cart.items : [],
          subtotal: subtotal.toFixed(2),
          discount: discount.toFixed(2),
          finalAmount: finalAmount.toFixed(2),
          coupons: activeCoupons,
          appliedCoupon 
      });
      
  } catch (error) {
      next(error);
  }
}

const loadOrderPlacedPage = async (req, res) => {
    try {
        res.render('order-placed');
    } catch (error) {
        console.error('Error loading order placed page:', error);
        res.status(500).render('error', { message: 'Internal server error' });
    }
};

const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const { paymentMethod, addressId, couponCode } = req.body;

    const userAddress = await Address.findOne({ userId });
    if (!userAddress || !userAddress.address.length) {
      return res.status(400).json({ error: 'No address found for user' });
    }

    const selectedAddress = userAddress.address.find(addr => addr._id.toString() === addressId);
    if (!selectedAddress) {
      return res.status(400).json({ error: 'Selected address not found' });
    }

    // Get cart items with complete product details
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Calculate totals
    let totalPrice = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
    let shippingCharge = 0;
    let discount = 0;

    // Apply coupon if provided
    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        isListed: true,
        isDeleted: false,
        startOn: { $lte: new Date() },
        expireOn: { $gte: new Date() }
      });

      if (coupon && totalPrice >= coupon.minimumPrice) {
        discount = Math.min(coupon.offerPrice, totalPrice);
        const userUsage = coupon.userUses.find(u => u.userId.toString() === userId.toString());
        if (userUsage) {
          userUsage.count += 1;
        } else {
          coupon.userUses.push({ userId, count: 1 });
        }
        coupon.usesCount += 1;
        if (coupon.usesCount >= coupon.maxUses) {
          coupon.isDeleted = true;
        }
        await coupon.save();
      }
    }

    const finalAmount = totalPrice + shippingCharge - discount;
  
      // Create order object (to be used by all payment methods)
      const order = new Order({
        userId,
        orderedItems: cart.items.map(item => ({
          product: item.productId._id,
          quantity: item.quantity,
          price: item.price
        })),
        totalPrice,
        shippingCharge,
        discount, // Ensure discount is saved
        finalAmount, // Ensure finalAmount reflects the discount
        shippingAddress: {
          fullName: selectedAddress.fullName,
          address: selectedAddress.address,
          landmark: selectedAddress.landmark || '',
          city: selectedAddress.city,
          state: selectedAddress.state,
          pincode: selectedAddress.pincode,
          phone: selectedAddress.phone,
          altPhone: selectedAddress.altPhone || ''
        },
        paymentMethod,
        orderDate: new Date(),
        deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: paymentMethod === 'cod' ? 'Pending COD' : 'Processing',
        couponApplied: couponCode ? true : false,
        couponCode: couponCode || null
      });
  
      // Handle different payment methods
      if (paymentMethod === 'wallet') {
        const wallet = await Wallet.findOne({ user: userId });
        if (!wallet || wallet.balance < finalAmount) {
          return res.status(400).json({ 
            error: 'Insufficient wallet balance',
            walletBalance: wallet ? wallet.balance : 0,
            required: finalAmount
          });
        }
      
        // Enhanced stock check
        for (const item of cart.items) {
          const product = await Product.findById(item.productId._id);
          if (!product) {
            return res.status(400).json({ 
              error: `Product not found: ${item.productId.name}`,
              productName: item.productId.name 
            });
          }
      
          let targetColor = item.color;
          let targetSize = item.size;
      
          if (!targetColor || !targetSize) {
            if (product.combos && product.combos.length > 0) {
              targetColor = product.combos[0].color;
              targetSize = product.combos[0].size;
            } else {
              return res.status(400).json({ 
                error: `No combos available for product ${product.name}`,
                productName: product.name
              });
            }
          }
      
          const combo = product.combos.find(c => 
            String(c.color).toLowerCase() === String(targetColor).toLowerCase() && 
            Number(c.size) === Number(targetSize)
          );
      
          if (!combo) {
            return res.status(400).json({ 
              error: `No matching combo found for ${product.name} (Color: ${targetColor}, Size: ${targetSize})`,
              productName: product.name 
            });
          }
      
          if (combo.quantity < item.quantity) {
            return res.status(400).json({ 
              error: `Insufficient stock for ${product.name} (Available: ${combo.quantity}, Requested: ${item.quantity})`,
              productName: product.name 
            });
          }
      
          await Product.updateOne(
            {
              _id: item.productId._id,
              'combos': {
                $elemMatch: {
                  color: targetColor,
                  size: Number(targetSize),
                  quantity: { $gte: item.quantity }
                }
              }
            },
            {
              $inc: { 'combos.$.quantity': -item.quantity }
            }
          );
        }
      
        wallet.balance -= finalAmount;
        wallet.transactions.push({
          type: 'debit',
          amount: finalAmount,
          description: `Payment for order #${Date.now()}`
        });
        await wallet.save();
        
        await order.save();
        await Cart.findOneAndDelete({ userId });
        return res.json({ success: true });
      }
      else if (paymentMethod === 'razorpay') {
        console.log('Starting Razorpay order processing');
        
        // Verify stock before initiating payment
        for (const item of cart.items) {
          console.log('Checking item:', {
            productId: item.productId._id,
            color: item.color,
            size: item.size,
            quantity: item.quantity
          });
          
          const product = await Product.findById(item.productId._id);
          if (!product) {
            console.log('Product not found:', item.productId.name);
            return res.status(400).json({ 
              error: `Product ${item.productId.name} not found`,
              productName: item.productId.name
            });
          }
            
          let targetColor = item.color;
          let targetSize = item.size;
      
          if (!targetColor || !targetSize) {
            console.log('Missing color or size, checking combos');
            if (product.combos && product.combos.length > 0) {
              const firstCombo = product.combos[0];
              targetColor = firstCombo.color;
              targetSize = firstCombo.size;
              console.log('Using default combo:', { color: targetColor, size: targetSize });
            } else {
              console.log('No combos available');
              return res.status(400).json({ 
                error: `No combos available for product ${product.name}`,
                productName: product.name
              });
            }
          }
      
          const combo = product.combos.find(c => {
            const colorMatch = String(c.color).toLowerCase() === String(targetColor).toLowerCase();
            const sizeMatch = Number(c.size) === Number(targetSize);
            console.log(`Checking combo: color ${c.color} vs ${targetColor} (${colorMatch}), size ${c.size} vs ${targetSize} (${sizeMatch})`);
            return colorMatch && sizeMatch;
          });
      
          if (!combo) {
            console.log('No matching combo found');
            return res.status(400).json({ 
              error: `No matching combo found for ${product.name} (Color: ${targetColor}, Size: ${targetSize})`,
              productName: product.name
            });
          }
      
          console.log('Combo found:', combo);
      
          if (combo.quantity < item.quantity) {
            console.log('Insufficient stock');
            return res.status(400).json({ 
              error: `Insufficient stock for ${product.name} (Available: ${combo.quantity}, Requested: ${item.quantity})`,
              productName: product.name
            });
          }
        }
      
        console.log('Stock check passed, creating Razorpay order');
        
        const options = {
          amount: Math.round(finalAmount * 100),
          currency: "INR",
          receipt: `order_${Date.now()}`
        };
      
        try {
          const razorpayOrder = await razorpay.orders.create(options);
          console.log('Razorpay order created:', razorpayOrder);
      
          return res.json({
            success: true,
            order: razorpayOrder,
            keyId: process.env.RAZORPAY_KEY_ID,
            amount: finalAmount * 100,
            addressId,
            couponCode: couponCode || null
          });
        } catch (razorpayError) {
          console.error('Razorpay order creation failed:', razorpayError);
          return res.status(500).json({ error: 'Failed to create payment order' });
        }
      }
      else if (paymentMethod === 'cod') {
        const COD_LIMIT = 10000;
        if (finalAmount > COD_LIMIT) {
          return res.status(400).json({ 
            error: `Cash on Delivery is not available for orders above ₹${COD_LIMIT}. Please choose another payment method.` 
          });
        }

        // Enhanced stock check
        for (const item of cart.items) {
          const product = await Product.findById(item.productId._id);
          if (!product) {
            return res.status(400).json({ 
              error: `Product not found: ${item.productId.name}`,
              productName: item.productId.name 
            });
          }
      
          let targetColor = item.color;
          let targetSize = item.size;
      
          if (!targetColor || !targetSize) {
            if (product.combos && product.combos.length > 0) {
              targetColor = product.combos[0].color;
              targetSize = product.combos[0].size;
            } else {
              return res.status(400).json({ 
                error: `No combos available for product ${product.name}`,
                productName: product.name
              });
            }
          }
      
          const combo = product.combos.find(c => 
            String(c.color).toLowerCase() === String(targetColor).toLowerCase() && 
            Number(c.size) === Number(targetSize)
          );
      
          if (!combo) {
            return res.status(400).json({ 
              error: `No matching combo found for ${product.name} (Color: ${targetColor}, Size: ${targetSize})`,
              productName: product.name 
            });
          }
      
          if (combo.quantity < item.quantity) {
            return res.status(400).json({ 
              error: `Insufficient stock for ${product.name} (Available: ${combo.quantity}, Requested: ${item.quantity})`,
              productName: product.name 
            });
          }
      
          await Product.updateOne(
            {
              _id: item.productId._id,
              'combos': {
                $elemMatch: {
                  color: targetColor,
                  size: Number(targetSize),
                  quantity: { $gte: item.quantity }
                }
              }
            },
            {
              $inc: { 'combos.$.quantity': -item.quantity }
            }
          );
        }
      
        await order.save();
        await Cart.findOneAndDelete({ userId });
        return res.json({ success: true });
      }
  
    } catch (error) {
      console.error('Error placing order:', error);
      res.status(500).json({ error: error.message || 'Failed to place order' });
    }
  };


const initiateRazorpayPayment = async (req, res) => {
    try {
      const { addressId, amount } = req.body;
      const userId = req.session.user._id;
  
      const options = {
        amount: Math.round(amount), // Amount in paise
        currency: "INR",
        receipt: `order_${Date.now()}`
      };
  
      const order = await razorpay.orders.create(options);
      
      res.json({
        success: true,
        order,
        keyId: process.env.RAZORPAY_KEY_ID
      });
    } catch (error) {
      console.error('Error initiating Razorpay payment:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to initiate payment'
      });
    }
  };
  
  // Replace the existing verifyRazorpayPayment function
  const verifyRazorpayPayment = async (req, res) => {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        addressId,
        couponCode,
        paymentStatus // Add paymentStatus from request body
      } = req.body;
      
      const userId = req.session.user._id;
  
      // Get address
      const userAddress = await Address.findOne({ userId });
      if (!userAddress || !userAddress.address.length) {
        return res.status(400).json({ success: false, error: 'No address found for user' });
      }
  
      const selectedAddress = userAddress.address.find(addr => addr._id.toString() === addressId);
      if (!selectedAddress) {
        return res.status(400).json({ success: false, error: 'Selected address not found' });
      }
  
      // Get cart
      const cart = await Cart.findOne({ userId }).populate('items.productId');
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ success: false, error: 'Cart is empty' });
      }
  
      // Calculate totals
      let totalPrice = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
      let discount = 0;
      if (couponCode) {
        const coupon = await Coupon.findOne({
          code: couponCode.toUpperCase(),
          isListed: true,
          isDeleted: false,
          startOn: { $lte: new Date() },
          expireOn: { $gte: new Date() }
        });
  
        if (coupon && totalPrice >= coupon.minimumPrice) {
          discount = Math.min(coupon.offerPrice, totalPrice);
          const userUsage = coupon.userUses.find(u => u.userId.toString() === userId.toString());
          if (userUsage) {
            userUsage.count += 1;
          } else {
            coupon.userUses.push({ userId, count: 1 });
          }
          coupon.usesCount += 1;
          if (coupon.usesCount >= coupon.maxUses) {
            coupon.isDeleted = true;
          }
          await coupon.save();
        }
      }
      const finalAmount = totalPrice - discount;
  
      // Create order (common for both success and failure)
      const order = new Order({
        userId,
        orderedItems: cart.items.map(item => ({
          product: item.productId._id,
          quantity: item.quantity,
          price: item.price
        })),
        totalPrice,
        shippingCharge: 0,
        discount,
        finalAmount,
        shippingAddress: {
          fullName: selectedAddress.fullName,
          address: selectedAddress.address,
          landmark: selectedAddress.landmark || '',
          city: selectedAddress.city,
          state: selectedAddress.state,
          pincode: selectedAddress.pincode,
          phone: selectedAddress.phone,
          altPhone: selectedAddress.altPhone || ''
        },
        paymentMethod: 'razorpay',
        orderDate: new Date(),
        deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: paymentStatus === 'success' ? 'Processing' : 'Failed', // Set status based on paymentStatus
        couponApplied: couponCode ? true : false,
        couponCode: couponCode || null
      });
  
      if (paymentStatus === 'success') {
        // Verify payment signature for successful payments
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const generated_signature = crypto
          .createHmac('sha256', process.env.RAZORPAY_SECRET_KEY)
          .update(sign)
          .digest('hex');
  
        if (generated_signature !== razorpay_signature) {
          return res.status(400).json({ success: false, error: 'Invalid signature' });
        }
  
        // Update product quantities
        for (const item of cart.items) {
          const product = await Product.findById(item.productId._id);
          if (!product) {
            return res.status(400).json({ 
              success: false, 
              error: `Product not found: ${item.productId.name}`,
              productName: item.productId.name 
            });
          }
  
          let targetColor = item.color;
          let targetSize = item.size;
  
          if (!targetColor || !targetSize) {
            if (product.combos && product.combos.length > 0) {
              const firstCombo = product.combos[0];
              targetColor = firstCombo.color;
              targetSize = firstCombo.size;
            } else {
              return res.status(400).json({ 
                success: false, 
                error: `No combos available for product ${product.name}`,
                productName: product.name
              });
            }
          }
  
          const combo = product.combos.find(c => 
            String(c.color).toLowerCase() === String(targetColor).toLowerCase() && 
            Number(c.size) === Number(targetSize)
          );
  
          if (!combo) {
            return res.status(400).json({ 
              success: false, 
              error: `No matching combo found for ${product.name} (Color: ${targetColor}, Size: ${targetSize})`,
              productName: product.name 
            });
          }
  
          if (combo.quantity < item.quantity) {
            return res.status(400).json({ 
              success: false, 
              error: `Insufficient stock for ${product.name} (Available: ${combo.quantity}, Requested: ${item.quantity})`,
              productName: product.name 
            });
          }
  
          await Product.updateOne(
            {
              _id: item.productId._id,
              'combos': {
                $elemMatch: {
                  color: targetColor,
                  size: Number(targetSize),
                  quantity: { $gte: item.quantity }
                }
              }
            },
            {
              $inc: { 'combos.$.quantity': -item.quantity }
            }
          );
        }
  
        await order.save();
        await Cart.findOneAndDelete({ userId });
        res.json({ success: true, redirect: '/order-placed' });
      } else if (paymentStatus === 'failure') {
        // Save order with "Failed" status and clear cart
        await order.save();
        await Cart.findOneAndDelete({ userId });
        res.json({ success: false, paymentFailed: true }); // Indicate payment failure
      } else {
        res.status(400).json({ success: false, error: 'Invalid payment status' });
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      res.status(500).json({ success: false, error: 'Payment verification failed' });
    }
  };
  


const getWalletBalance = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const wallet = await Wallet.findOne({ user: userId });
        const balance = wallet ? wallet.balance : 0;
        res.json({ success: true, balance });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get wallet balance' });
    }
};

const applyCoupon = async (req, res) => {
  try {
      const { couponCode } = req.body;
      const userId = req.session.user._id;

      // Find the coupon
      const coupon = await Coupon.findOne({
          code: couponCode.toUpperCase(),
          isListed: true,
          isDeleted: false,
          startOn: { $lte: new Date() },
          expireOn: { $gte: new Date() }
      });

      if (!coupon) {
          return res.status(400).json({ error: 'Invalid coupon code' });
      }

      // Get cart total
      const cart = await Cart.findOne({ userId }).populate('items.productId');
      const cartTotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);

      if (cartTotal < coupon.minimumPrice) {
          return res.status(400).json({
              error: `Minimum purchase amount of ₹${coupon.minimumPrice} required`
          });
      }

      // Check if user has already used this coupon
      const userOrders = await Order.find({
          userId,
          couponCode: couponCode
      });

      if (userOrders.length >= coupon.maxUsesPerUser) {
          return res.status(400).json({ error: 'You have already used this coupon' });
      }

      // Check total usage limit
      if (coupon.usesCount >= coupon.maxUses) {
          return res.status(400).json({ error: 'Coupon usage limit exceeded' });
      }

      // Calculate discount
      const discount = Math.min(coupon.offerPrice, cartTotal);
      
      // Store the applied coupon in session
      req.session.appliedCoupon = couponCode;

      res.json({
          success: true,
          discount,
          finalAmount: cartTotal - discount
      });

  } catch (error) {
      res.status(500).json({ error: 'Failed to apply coupon' });
  }
};

const removeCoupon = async (req, res) => {
  try {
    const userId = req.session.user._id;

    // Clear the applied coupon from session
    req.session.appliedCoupon = null;

    // Get cart total
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    const cartTotal = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);

    res.json({
      success: true,
      originalAmount: cartTotal
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove coupon' });
  }
};

module.exports = {
    loadCheckoutPage,
    placeOrder,
    loadOrderPlacedPage,
    applyCoupon,
    initiateRazorpayPayment,
    verifyRazorpayPayment,
    getWalletBalance,
    removeCoupon,
};