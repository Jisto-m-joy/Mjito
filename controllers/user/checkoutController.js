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
      const subtotal = cart ? cart.items.reduce((total, item) => total + item.totalPrice, 0) : 0;
      
      res.render('checkout', {
        addresses: userAddresses ? userAddresses.address : [],
        cartItems: cart ? cart.items : [],
        subtotal: subtotal.toFixed(2),
        coupons: activeCoupons  
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
        const { paymentMethod } = req.body;
        const selectedAddressId = req.body.addressId;
        const couponCode = req.body.couponCode;

        // Get the selected address
        const userAddress = await Address.findOne({ userId });
        if (!userAddress) {
            return res.status(400).json({ error: 'No address found for user' });
        }

        const selectedAddress = userAddress.address.find(addr => addr._id.toString() === selectedAddressId);
        if (!selectedAddress) {
            return res.status(400).json({ error: 'Selected address not found' });
        }

        // Get cart items with complete product details
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        // Calculate totals
        const totalPrice = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
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
            }
        }

        const finalAmount = totalPrice + shippingCharge - discount;

        // Handle wallet payment
        if (paymentMethod === 'wallet') {
            const wallet = await Wallet.findOne({ user: userId });
            
            if (!wallet || wallet.balance < finalAmount) {
                return res.status(400).json({ 
                    error: 'Insufficient wallet balance',
                    walletBalance: wallet ? wallet.balance : 0,
                    required: finalAmount
                });
            }

            // Deduct amount from wallet
            wallet.balance -= finalAmount;
            wallet.transactions.push({
                type: 'debit',
                amount: finalAmount,
                description: `Payment for order #${Date.now()}`
            });
            await wallet.save();
        }

        // Verify all products and their combos exist and update quantities
        for (const item of cart.items) {
            // [The rest of your existing product verification code]
            console.log('Processing cart item:', {
                productId: item.productId._id,
                productName: item.productId.name,
                color: item.color,
                size: item.size,
                quantity: item.quantity,
                fullItem: item
            });

            const product = await Product.findById(item.productId._id);
            if (!product) {
                return res.status(400).json({ 
                    error: `Product ${item.productId.name} not found`,
                    productName: item.productId.name
                });
            }

            // If color and size are not in cart items, try to get the first available combo
            let targetColor = item.color;
            let targetSize = item.size;

            if (!targetColor || !targetSize) {
                if (product.combos && product.combos.length > 0) {
                    const firstCombo = product.combos[0];
                    targetColor = firstCombo.color;
                    targetSize = firstCombo.size;
                    console.log('Using default combo:', { targetColor, targetSize });
                } else {
                    return res.status(400).json({ 
                        error: `No combos available for product ${product.name}`,
                        productName: product.name
                    });
                }
            }

            console.log('Product combos:', product.combos);
            console.log('Looking for combo with:', { targetColor, targetSize });

            const combo = product.combos.find(c => 
                String(c.color).toLowerCase() === String(targetColor).toLowerCase() && 
                Number(c.size) === Number(targetSize)
            );

            if (!combo) {
                return res.status(400).json({ 
                    error: `Product ${product.name} combo not found for color: ${targetColor}, size: ${targetSize}`,
                    productName: product.name
                });
            }

            if (combo.quantity < item.quantity) {
                return res.status(400).json({ 
                    error: `Insufficient stock for product ${product.name}`,
                    productName: product.name
                });
            }

            // Update quantity
            const result = await Product.updateOne(
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
                    $inc: {
                        'combos.$.quantity': -item.quantity
                    }
                }
            );

            if (result.matchedCount === 0 || result.modifiedCount === 0) {
                return res.status(400).json({ 
                    error: `Failed to update quantity for product ${product.name}`,
                    productName: product.name
                });
            }
        }

        // Create the order object
        const order = new Order({
            userId,
            orderedItems: cart.items.map(item => ({
                product: item.productId._id,
                quantity: item.quantity,
                price: item.price
            })),
            totalPrice,
            shippingCharge,
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
                altPhone: selectedAddress.altPhone
            },
            paymentMethod,
            orderDate: new Date(),
            deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            status: paymentMethod === 'cod' ? 'Pending COD' : (paymentMethod === 'wallet' ? 'Processing' : 'Pending'),
            couponApplied: couponCode ? true : false,
            couponCode: couponCode || null
        });

        await order.save();
        await Cart.findOneAndDelete({ userId });
        res.redirect('/order-placed');

    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ error: error.message || 'Failed to place order' });
    }
};

const initiateRazorpayPayment = async (req, res) => {
    try {
        const userId = req.session.user._id;
        const { addressId } = req.body;
        
        // Get cart items
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }
        
        // Calculate amount
        const totalAmount = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
        
        // Apply coupon if provided
        let finalAmount = totalAmount;
        let discount = 0;
        let couponCode = null;
        
        if (req.body.couponCode) {
            const coupon = await Coupon.findOne({
                code: req.body.couponCode.toUpperCase(),
                isListed: true,
                isDeleted: false,
                startOn: { $lte: new Date() },
                expireOn: { $gte: new Date() }
            });
            
            if (coupon) {
                discount = Math.min(coupon.offerPrice, totalAmount);
                finalAmount = totalAmount - discount;
                couponCode = coupon.code;
            }
        }
        
        // Create Razorpay order
        const options = {
            amount: Math.round(finalAmount * 100), // Convert to paise
            currency: "INR",
            receipt: `order_${Date.now()}`
        };
        
        const order = await razorpay.orders.create(options);
        
        // Store temporary order details in session
        req.session.razorpayOrder = {
            orderId: order.id,
            addressId,
            totalAmount,
            discount,
            finalAmount,
            couponCode
        };
        
        res.json({
            success: true,
            order,
            keyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Error initiating Razorpay payment:', error);
        res.status(500).json({ error: error.message || 'Failed to initiate payment' });
    }
};

// Verify Razorpay payment
const verifyRazorpayPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;
        
        // Verify signature
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const generated_signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_SECRET_KEY)
            .update(sign)
            .digest('hex');
            
        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({ error: 'Payment verification failed' });
        }
        
        const orderDetails = req.session.razorpayOrder;
        if (!orderDetails || orderDetails.orderId !== razorpay_order_id) {
            return res.status(400).json({ error: 'Invalid order details' });
        }
        
        const userId = req.session.user._id;
        
        // Get the selected address
        const userAddress = await Address.findOne({ userId });
        if (!userAddress) {
            return res.status(400).json({ error: 'No address found for user' });
        }
        
        const selectedAddress = userAddress.address.find(addr => addr._id.toString() === orderDetails.addressId);
        if (!selectedAddress) {
            return res.status(400).json({ error: 'Selected address not found' });
        }
        
        // Get cart items with complete product details
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }
        
        // Update product quantities and create order (similar to placeOrder)
        for (const item of cart.items) {
            const product = await Product.findById(item.productId._id);
            if (!product) {
                return res.status(400).json({ error: `Product ${item.productId.name} not found` });
            }
            
            // Similar product quantity logic as in placeOrder
            let targetColor = item.color;
            let targetSize = item.size;
            
            if (!targetColor || !targetSize) {
                if (product.combos && product.combos.length > 0) {
                    const firstCombo = product.combos[0];
                    targetColor = firstCombo.color;
                    targetSize = firstCombo.size;
                } else {
                    return res.status(400).json({ error: `No combos available for product ${product.name}` });
                }
            }
            
            const combo = product.combos.find(c => 
                String(c.color).toLowerCase() === String(targetColor).toLowerCase() && 
                Number(c.size) === Number(targetSize)
            );
            
            if (!combo) {
                return res.status(400).json({ error: `Product ${product.name} combo not found` });
            }
            
            if (combo.quantity < item.quantity) {
                return res.status(400).json({ error: `Insufficient stock for product ${product.name}` });
            }
            
            // Update quantity
            const result = await Product.updateOne(
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
                    $inc: {
                        'combos.$.quantity': -item.quantity
                    }
                }
            );
            
            if (result.matchedCount === 0 || result.modifiedCount === 0) {
                return res.status(400).json({ error: `Failed to update quantity for product ${product.name}` });
            }
        }
        
        // Create the order
        const order = new Order({
            userId,
            orderedItems: cart.items.map(item => ({
                product: item.productId._id,
                quantity: item.quantity,
                price: item.price
            })),
            totalPrice: orderDetails.totalAmount,
            shippingCharge: 0,
            discount: orderDetails.discount,
            finalAmount: orderDetails.finalAmount,
            shippingAddress: {
                fullName: selectedAddress.fullName,
                address: selectedAddress.address,
                landmark: selectedAddress.landmark || '',
                city: selectedAddress.city,
                state: selectedAddress.state,
                pincode: selectedAddress.pincode,
                phone: selectedAddress.phone,
                altPhone: selectedAddress.altPhone
            },
            paymentMethod: 'razorpay',
            orderDate: new Date(),
            deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            status: 'Processing',
            couponApplied: !!orderDetails.couponCode,
            couponCode: orderDetails.couponCode
        });
        
        await order.save();
        await Cart.findOneAndDelete({ userId });
        
        // Clear session data
        delete req.session.razorpayOrder;
        
        res.json({
            success: true,
            message: 'Payment successful and order placed',
            orderId: order.orderId
        });
        
    } catch (error) {
        console.error('Error verifying Razorpay payment:', error);
        res.status(500).json({ error: error.message || 'Failed to verify payment' });
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

        res.json({
            success: true,
            discount,
            finalAmount: cartTotal - discount
        });

    } catch (error) {
        res.status(500).json({ error: 'Failed to apply coupon' });
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
};