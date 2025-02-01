const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");

const productDetails = async (req, res, next) => {
  try {
    const productId = req.query.id;
    const product = await Product.findById(productId).populate("category");
    const findCategory = product.category;
    const categoryOffer = findCategory?.categoryOffer || 0;
    const productOffer = product.productOffer || 0;
    const totalOffer = categoryOffer + productOffer;

    // Fetch related products from the same category
    const relatedProducts = await Product.find({
      category: product.category._id,
      _id: { $ne: product._id }, // Exclude the current product
    }).limit(4); // Limit the number of related products

    // Extract values from combos array (assuming you want the first combo)
    const combo = product.combos[0] || {};

    res.render("product-details", {
      product: product,
      quantity: combo.quantity,
      size: combo.size,
      salesPrice: combo.salesPrice,
      regularPrice: combo.regularPrice,
      totalOffer: totalOffer,
      category: findCategory,
      relatedProducts: relatedProducts, // Pass related products to the view
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  productDetails,
};