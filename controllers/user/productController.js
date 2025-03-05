const Product = require("../../models/productSchema");
const Review = require("../../models/reviewSchema"); // Import the Review model
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");

const productDetails = async (req, res, next) => {
  try {
    const productId = req.query.id;
    const product = await Product.findById(productId).populate("category");
    const reviews = await Review.find({ productId: productId }).populate("userId");
    const findCategory = product.category;

    // Calculate effective offer for main product
    const categoryOffer = findCategory?.categoryOffer || 0;
    const productOffer = product.productOffer ? product.offerPercentage : 0;
    const effectiveOffer = product.productOffer ? productOffer : categoryOffer; // Prioritize product offer if it exists

    // Main product pricing
    const combo = product.combos[0] || {};
    const originalSalesPrice = combo.salesPrice || 0;
    const regularPrice = combo.regularPrice || 0;
    let newSalesPrice = originalSalesPrice;

    if (effectiveOffer > 0) {
      newSalesPrice = originalSalesPrice * (1 - effectiveOffer / 100);
      newSalesPrice = Math.round(newSalesPrice * 100) / 100;
    }

    // Process related products
    const relatedProductsRaw = await Product.find({
      category: product.category._id,
      _id: { $ne: product._id },
    })
      .limit(4)
      .populate("category");

    const relatedProducts = relatedProductsRaw.map((relatedProduct) => {
      const combo = relatedProduct.combos[0] || {};
      const relCategoryOffer = relatedProduct.category?.categoryOffer || 0;
      const relProductOffer = relatedProduct.productOffer ? relatedProduct.offerPercentage : 0;
      const relEffectiveOffer = relatedProduct.productOffer ? relProductOffer : relCategoryOffer;

      const originalSalesPrice = combo.salesPrice || 0;
      const regularPrice = combo.regularPrice || 0;
      let newSalesPrice = originalSalesPrice;

      if (relEffectiveOffer > 0) {
        newSalesPrice = originalSalesPrice * (1 - relEffectiveOffer / 100);
        newSalesPrice = Math.round(newSalesPrice * 100) / 100;
      }

      return {
        ...relatedProduct.toObject(),
        newSalesPrice,
        originalSalesPrice,
        regularPrice,
        offerPercentage: relEffectiveOffer,
        appliedOfferType: relProductOffer > 0 ? 'product' : relCategoryOffer > 0 ? 'category' : 'none',
      };
    });

    res.render("product-details", {
      product,
      quantity: combo.quantity,
      size: combo.size,
      salesPrice: newSalesPrice,
      regularPrice: originalSalesPrice, // Use originalSalesPrice as the "old price"
      originalRegularPrice: regularPrice,
      offerPercentage: effectiveOffer,
      appliedOfferType: productOffer > 0 ? 'product' : categoryOffer > 0 ? 'category' : 'none',
      category: findCategory,
      relatedProducts,
      reviews,
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

    // Check if the user has purchased the product and the order is not cancelled
    const order = await Order.findOne({
      userId: userId,
      "orderedItems.product": productId,
      status: { $ne: "Cancelled" }, // Exclude cancelled orders
    });

    if (!order) {
      console.error("Authorization Error: User has not purchased this product or order was cancelled.");
      return res.status(403).json({
        success: false,
        message: "You can only review products you have purchased and not cancelled.",
      });
    }

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