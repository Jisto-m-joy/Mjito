const mongoose = require("mongoose");
const { Schema } = mongoose;

const reviewSchema = new mongoose.Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    productId: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    rating: {
        type: Number,
        default: true,
    }
},{ timestamps: true })

const Review = mongoose.model("Review", reviewSchema);

module.exports = Review;