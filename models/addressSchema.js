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
          type: String, // "home" or "work"
          enum: ["home", "work"],
          required: true,
        },
        address: {
          type: String,
          required: true,
        },
        city: {
          type: String,
          required: true,
        },
        landMark: {
          type: String,
          default: "",
        },
        state: {
          type: String,
          required: true,
        },
        pincode: {
          type: String, // Changed from Number to String
          required: true,
        },
      },
    ],
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

module.exports = mongoose.model("Address", addressSchema);
