const mongoose = require("mongoose");
const env = require("dotenv").config();

const connectDB = async () => {
    try {
        await mongoose.connect("mongodb+srv://Jisto_mj:V2XPur6PNMGno579@gzcluster.pi7ro.mongodb.net/mjito_db");
        console.log("DB Connected");
    } catch (error) {
        console.log("DB Connection error", error.message);
        process.exit(1);
    }
}

module.exports = connectDB;