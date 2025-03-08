const Cart = require("../models/cartSchema");
const Wishlist = require("../models/wishlistSchema");

const fetchCounts = async (req, res, next) => {
  if (req.session.user) {
    const userId = req.session.user._id || req.session.user; // Adjust based on how user is stored
    const cart = await Cart.findOne({ userId });
    const wishlist = await Wishlist.findOne({ userId });
    
    res.locals.cartCount = cart ? cart.items.length : 0;
    res.locals.wishlistCount = wishlist ? wishlist.products.length : 0;
  } else {
    res.locals.cartCount = 0;
    res.locals.wishlistCount = 0;
  }
  next();
};

module.exports = fetchCounts;