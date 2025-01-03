const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema({
    first_name: {
        type: String,
        required: true,
        trim: true
    },
    last_name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        match: [/\S+@\S+\.\S+/, 'is invalid']
    },
    mobile_number: {
        type: String,
        // required: true,
        unique: true,
        trim: true
    },
    alt_mobile_number: {
        type: String,
        // required: false,  // Optional
        unique: true,
        trim: true,
        sparse: true,
        default: null   
    },
    date_of_birth: {
        type: Date,        
        // required: true
    },
    password: {
        type: String,
        required: true,    
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    // cart: [{
    //     type: Schema.Types.ObjectId,
    //     ref: 'Cart',
    // }],
    // wallet: {
    //     type: Schema.Types.ObjectId,
    //     ref: "Wallet"
    // },
    // wishlist: [{
    //     type: Schema.Types.ObjectId,
    //     ref: "Wishlist"
    // }],
    // orderHistory: [{
    //     type: Schema.Types.ObjectId,
    //     ref: "Order"
    // }],
    status: {
        type: String,
        enum: ["blocked", "unblocked"],
        default: "unblocked"
    }
}, { timestamps: true });



const User = mongoose.model("User", userSchema);

module.exports = User;
