const mongoose = require("mongoose");
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, "is invalid"],
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    mobile_number: {
      type: String,
      trim: true,
      sparse: true,
    },
    alt_mobile_number: {
      type: String,
      trim: true,
      sparse: true,
    },
    date_of_birth: {
      type: Date,
    },
    password: {
      type: String,
      required: false,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["blocked", "unblocked"],
      default: "unblocked",
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
