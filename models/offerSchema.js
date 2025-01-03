const mongoose = require("mongoose");
const { Schema } = mongoose;

const offerSchema = new mongoose.Schema({
    productId: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    discountPercentage: {
        type: String,
        required: true,
    }
},{ timestamps: true })

const Offer = mongoose.model("Offer", offerSchema);

module.exports = Offer;