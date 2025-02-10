const mongoose = require("mongoose");
const { Schema } = mongoose;

const addressSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    address: [
      {
        addressType: {
          type: String,
          enum: ["home", "work"],
          required: true,
        },
        fullName: {
          type: String,
          required: true,
        },
        phone: {
          type: Number, 
          required: true,
        },
        altPhone: {
          type: Number,
          required: false,
        },
        address: {
          type: String,
          required: true,
        },
        city: {
          type: String,
          required: true,
        },
        landmark: {
          type: String,
          default: "",
        },
        state: {
          type: String,
          required: true,
        },
        pincode: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {timestamps: true}
);

module.exports = mongoose.model("Address", addressSchema);