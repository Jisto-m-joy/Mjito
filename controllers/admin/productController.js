const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema');
const Brand = require('../../models/brandSchema');
const User = require('../../models/userSchema');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');



const getProductAddPage = async (req, res) => {
    try {
        const categories = await Category.find({isListed: true});
        const brands = await Brand.find({isBlocked: false});
        res.render('product-add', {
            cat: Category,
            brand: Brand
        });
    } catch (error) {
        console.error(error);
        res.redirect('/pageerror');
    }
}



module.exports = {
    getProductAddPage
};