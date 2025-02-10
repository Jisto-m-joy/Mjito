const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");  
const Product = require("../../models/productSchema");


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

      // Calculate totals
      const subtotal = cart ? cart.items.reduce((total, item) => total + item.totalPrice, 0) : 0;
      
      res.render('checkout', {
          addresses: userAddresses ? userAddresses.address : [],
          cartItems: cart ? cart.items : [],
          subtotal: subtotal.toFixed(2)
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

        // Get cart items
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        // Check stock availability first
        for (const item of cart.items) {
            const product = await Product.findById(item.productId._id);
            const comboIndex = product.combos.findIndex(combo => 
                combo.color === item.color && combo.size === item.size
            );
            
            if (comboIndex !== -1) {
                if (product.combos[comboIndex].quantity < item.quantity) {
                    return res.status(400).json({ 
                        error: `Insufficient stock for product ${product.name}`,
                        productName: product.name
                    });
                }
            }
        }

        // Calculate totals
        const totalPrice = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
        const shippingCharge = 0;
        const discount = 0;
        const finalAmount = totalPrice + shippingCharge - discount;

        // Create order with embedded address
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

        // Reduce product quantities
        for (const item of cart.items) {
            const product = await Product.findById(item.productId._id);
            const comboIndex = product.combos.findIndex(combo => 
                combo.color === item.color && combo.size === item.size
            );
            
            if (comboIndex !== -1) {
                product.combos[comboIndex].quantity -= item.quantity;
                await product.save();
            }
        }

        await order.save();

        // Clear cart after successful order
        await Cart.findOneAndDelete({ userId });

        res.redirect('/order-placed');
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ error: 'Failed to place order' });
    }
};

module.exports = {
    loadCheckoutPage,
    placeOrder,
    loadOrderPlacedPage
};