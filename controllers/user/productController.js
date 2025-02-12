const Product = require("../../models/productSchema");
const Review = require("../../models/reviewSchema"); // Import the Review model
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");

const productDetails = async (req, res, next) => {
  try {
    const productId = req.query.id;
    const product = await Product.findById(productId).populate("category");
    const reviews = await Review.find({ productId: productId }).populate("userId"); // Fetch reviews for the product
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
      reviews: reviews, // Pass reviews to the view
    });
  } catch (error) {
    next(error);
  }
};

const submitReview = async (req, res, next) => {
  try {
    const { productId, rating, description } = req.body;

    // Validate required fields
    if (!productId || !rating || !description) {
      console.error("Validation Error: All fields are required.");
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    if (!req.user) {
      console.error("Authentication Error: User is not authenticated.");
      return res.status(401).json({ success: false, message: "User is not authenticated." });
    }

    const userId = req.user._id;

    console.log('Received Data:', { userId, productId, rating, description });

    const newReview = new Review({
      userId: userId,
      productId: productId,
      rating: parseInt(rating), // Ensure rating is an integer
      description: description,
    });

    await newReview.save();

    res.status(200).json({ success: true, message: "Review submitted successfully!" });
  } catch (error) {
    console.error("Error submitting review:", error);
    res.status(500).json({ success: false, message: "Failed to submit review due to server error." });
  }
};

module.exports = {
  productDetails,
  submitReview,
};