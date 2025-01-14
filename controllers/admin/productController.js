const path = require('path');
const Product = require('../../models/productSchema');
const Brand = require('../../models/brandSchema');
const Category = require('../../models/categorySchema');
const User = require('../../models/userSchema');
const fs = require('fs');
const sharp = require('sharp');



const getProductAddPage = async (req, res) => {
    try {
        const brands = await Brand.find(); // Fetch all brands from the database
        const categories = await Category.find(); // Fetch all categories from the database
        res.render('product-add', { brands, categories }); // Pass the brands and categories to the view
    } catch (error) {
        console.error('Error fetching brands or categories:', error);
        res.status(500).send('Server error');
    }
};


const addProducts = async (req, res) => {
    try {
        const { name, description, regularPrice, brand, category, color, size } = req.body;
        const images = req.files.map(file => file.path); // Get the file paths from the uploaded files

        if (!name || !description || !regularPrice || !brand || !category || !color || !size || images.length === 0) {
            return res.status(400).send('All fields are required');
        }

        const categoryDoc = await Category.findOne({ name: category });
        if (!categoryDoc) {
            return res.status(400).send('Invalid category');
        }

        const newProduct = new Product({
            name,
            description,
            regularPrice,
            brand,
            category: categoryDoc._id, // Use the ObjectId of the category
            color,
            size,
            images
        });

        await newProduct.save();
        res.redirect('/admin/addProducts');
    } catch (error) {
        console.error('Error saving product:', error);
        res.status(500).send('Server error');
    }
};



module.exports = {
    getProductAddPage,
    addProducts
};