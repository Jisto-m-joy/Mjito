const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");


const loadCartPage = async (req, res, next) => {
    try {
      if (!req.session.user) {
        return res.redirect('/login');
      }
  
      // Find cart and populate product details
      const cart = await Cart.findOne({ userId: req.session.user._id })
        .populate({
          path: 'items.productId',
          select: 'name description images combos'
        });
  
      if (!cart) {
        return res.render('cart', {
          cartItems: [],
          subtotal: '0.00'
        });
      }
  
      // Calculate subtotal
      const subtotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);
  
      res.render('cart', {
        cartItems: cart.items,
        subtotal: subtotal.toFixed(2)
      });
  
    } catch (error) {
      console.error('Cart loading error:', error);
      next(error);
    }
  };
  
  const addToCart = async (req, res, next) => {
    try {
      const { productId, quantity = 1 } = req.body;
      const userId = req.session.user._id;
  
      // Find the product
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
  
      // Get the price from the first combo (or specific combo if you have combo selection)
      const price = product.combos[0].salesPrice;
      const totalPrice = price * quantity;
  
      // Find or create cart
      let cart = await Cart.findOne({ userId });
      
      if (!cart) {
        cart = new Cart({
          userId,
          items: [{
            productId,
            quantity,
            price,
            totalPrice
          }]
        });
      } else {
        // Check if product already exists in cart
        const existingItemIndex = cart.items.findIndex(
          item => item.productId.toString() === productId
        );
  
        if (existingItemIndex > -1) {
          // Update existing item
          cart.items[existingItemIndex].quantity += quantity;
          cart.items[existingItemIndex].totalPrice = 
            cart.items[existingItemIndex].quantity * cart.items[existingItemIndex].price;
        } else {
          // Add new item
          cart.items.push({
            productId,
            quantity,
            price,
            totalPrice
          });
        }
      }
  
      await cart.save();
      res.json({ success: true, message: 'Product added to cart' });
    } catch (error) {
      next(error);
    }
  };

  const updateCartQuantity = async (req, res, next) => {
    try {
      const { productId, quantity } = req.body;
      const userId = req.session.user._id;
  
      const cart = await Cart.findOne({ userId });
      if (!cart) {
        return res.status(404).json({ success: false, message: 'Cart not found' });
      }
  
      const cartItem = cart.items.find(item => 
        item.productId.toString() === productId
      );
  
      if (!cartItem) {
        return res.status(404).json({ success: false, message: 'Product not found in cart' });
      }
  
      cartItem.quantity = quantity;
      cartItem.totalPrice = cartItem.price * quantity;
  
      await cart.save();
  
      // Calculate new cart total
      const subtotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);
  
      res.json({ 
        success: true, 
        newTotal: cartItem.totalPrice,
        cartSubtotal: subtotal
      });
    } catch (error) {
      next(error);
    }
  };

  const removeFromCart = async (req, res, next) => {
    try {
      const { productId } = req.params;
      const userId = req.session.user._id;
  
      const cart = await Cart.findOne({ userId });
      if (!cart) {
        return res.status(404).json({ success: false, message: 'Cart not found' });
      }
  
      cart.items = cart.items.filter(
        item => item.productId.toString() !== productId
      );
  
      await cart.save();
      
      // Calculate and return new cart subtotal
      const subtotal = cart.items.reduce((total, item) => total + item.totalPrice, 0);
      
      res.json({ 
        success: true, 
        message: 'Product removed from cart',
        cartSubtotal: subtotal
      });
    } catch (error) {
      next(error);
    }
  };
  

module.exports = {
  loadCartPage,
  addToCart,
  updateCartQuantity,
  removeFromCart
};