const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Address = require("../../models/addressSchema");
const Order = require("../../models/orderSchema");  

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
        const selectedAddressId = req.body.addressId; // You'll need to add this to your form

        // Get cart items
        const cart = await Cart.findOne({ userId }).populate('items.productId');
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        // Calculate totals
        const totalPrice = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
        const shippingCharge = 0; // Free shipping as per your checkout page
        const discount = 0; // Add discount logic if needed
        const finalAmount = totalPrice + shippingCharge - discount;

        // Create order
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
            address: selectedAddressId,
            paymentMethod,
            orderDate: new Date(),
            deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            status: paymentMethod === 'cod' ? 'Pending COD' : 'Pending'
        });

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