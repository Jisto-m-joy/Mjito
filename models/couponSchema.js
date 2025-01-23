const mongoose = require("mongoose");
const { Schema } = mongoose();

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
    },
    discount_type: {
      type: String,
      enum: ["fixed", "percentage"],
      required: true,
    },
    createdOn: {
      type: Date,
      default: Date.now,
      required: true,
    },
    expireOn: {
      type: Date,
      required: true,
    },
    discount_value: {
      type: Number,
      required: true,
    },
    minimum_price: {
      type: Number,
      required: true,
    },
    maximum_price: {
      type: Number,
      required: true,
    },
    isList: {
      type: Boolean,
      default: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    usage_limit: {
      type: Number,
      required: true,
      default: 1,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      required: true,
      default: "Active",
    },
    userId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;
