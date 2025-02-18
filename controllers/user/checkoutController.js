const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");  
const Product = require("../../models/productSchema");
const Coupon = require("../../models/couponSchema");
const mongoose = require('mongoose');


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

        // Debug log entire cart structure
        console.log('Cart contents:', JSON.stringify(cart, null, 2));

        // First verify all products and their combos exist
        for (const item of cart.items) {
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

        // Calculate totals and create order as before
        const totalPrice = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
        const shippingCharge = 0;
        const discount = 0;
        const finalAmount = totalPrice + shippingCharge - discount;

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
            status: paymentMethod === 'cod' ? 'Pending COD' : 'Pending'
        });

        await order.save();
        await Cart.findOneAndDelete({ userId });
        res.redirect('/order-placed');

    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ error: error.message || 'Failed to place order' });
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
};