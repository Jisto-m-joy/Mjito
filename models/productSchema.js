const mongoose = require('mongoose');
const { Schema } = mongoose;

const productSchema = new Schema({
    product_name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    brand: {
        type: String,
        required: true,
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
    },
    regularPrice: {
        type: Number,
        required: true,
    },
    salesPrice: {
        type: Number,
        required: true,
        validate: {
            validator: function (value) {
                return value <= this.regularPrice;
            },
            message: 'Sales price should not exceed the regular price.',
        },
    },
    quantity: {
        type: Number,
        default: 0,
    },
    color: {
        type: String,
        required: true,
    },
    size: {
        type: String,
        required: true,
    },
    productImage: {
        type: [String],
        required: true,
        validate: {
            validator: function (array) {
                return array.length > 0;
            },
            message: 'At least one product image is required.',
        },
    },
    isBlocked: {
        type: Boolean,
        default: false,
    },
    status: {
        type: String,
        enum: ["Available", "Out of Stock", "Discontinued"],
        required: true,
        default: "Available",
    },
}, { timestamps: true });

const Product = mongoose.model("Product", productSchema);

module.exports = Product;
