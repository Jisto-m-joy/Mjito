const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const Cart = require("../../models/cartSchema");

const loadCheckoutPage = async (req, res, next) => {
    try {
      res.render('checkout');
    } catch (error) {
      next(error);
    }
  }

module.exports = {
    loadCheckoutPage,
};