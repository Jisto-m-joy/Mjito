const mongoose = require('mongoose');
const { Schema } = mongoose;

const transactionsSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    walletId: {
        type: Schema.Types.ObjectId,
        ref: "Wallet",
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: [0, 'amount cannot be negative'], // Allow flexibility for refunds if needed
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['Debit Card', 'Credit Card', 'UPI', 'Net banking'], // Dynamically extendable in future
    },
    description: {
        type: String,
        default: "", // Default to an empty string if optional
    },
}, { timestamps: true });

const transactions = mongoose.model('transactions', transactionsSchema);

module.exports = transactions;
