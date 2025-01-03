const mongoose = require('mongoose');
const { Schema } = mongoose;

const contactSchema = new Schema({
    name: {
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
        required: true,
        unique: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
    }
}, { timestamps: true });


const Contact = mongoose.model("Contact", contactSchema);

module.exports = Contact;
