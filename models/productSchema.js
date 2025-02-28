const mongoose = require("mongoose");
const { Schema } = mongoose;

const productSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    offer: {
      type: Number,
      required: true,
      default: 0,
    },
    brand: {
      type: String,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    review: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Review",
      required: false,
    },
    combos: [
      {
        color: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        size: {
          type: Number,
          required: true,
        },
        regularPrice: {
          type: Number,
          required: true,
        },
        salesPrice: {
          type: Number,
          required: true,
        },
        salePriceBeforeDiscount: {
          type: Number,
          default: null,
        },
        status: {
          type: String,
          enum: ["Available", "Out of Stock", "Discontinued"],
          required: true,
          default: "Available",
        },
      },
    ],
    images: {
      type: [String],
      required: true,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    offerPercentage: {
      type: Number,
      default: 0,
    },
    productOffer:{
      type:Boolean,
      default:false
    },
    offerEndDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
