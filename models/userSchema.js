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
    profilePicture: {
      type: String,
      default: null
    },
    cart: [{
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      quantity: {
        type: Number,
        default: 1,
        min: 1
      },
      selectedCombo: {
        type: mongoose.Schema.Types.Mixed,
        required: true
      }
    }],
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
    referralCode: {
      type: String,
      unique: true,
      sparse: true
    },
    referredBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
