const mongoose = require('mongoose');
const { Schema } = mongoose;

const walletSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    availableBalance: {
        type: Number,
        required: true,
        default: 0, 
        min: [0, 'Balance cannot be negative'], 
    }
}, { timestamps: true });

const Wallet = mongoose.model('Wallet', walletSchema);

module.exports = Wallet;
