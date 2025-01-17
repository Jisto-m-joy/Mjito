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
        const { name, description, regularPrice, salesPrice, quantity, brand, category, color, size } = req.body;
        const images = req.files.map(file => file.path); // Get the file paths from the uploaded files

        // if (!name || !description || !regularPrice || !salesPrice || !brand || !quantity || !category || !color || !size || images.length === 0) {
        //     return res.status(400).send('All fields are required');
        // }

        const categoryDoc = await Category.findOne({ name: category });
        if (!categoryDoc) {
            return res.status(400).send('Invalid category');
        }

        const newProduct = new Product({
            name,
            description,
            regularPrice,
            salesPrice,
            brand,
            quantity,
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


const getAllProducts = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 4;

        const productData = await Product.find({
            $or: [
                {productName: {$regex: new RegExp(".*"+search+".*","i")}},
                {brand: {$regex: new RegExp(".*"+search+".*","i")}},

            ],
        })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('category')
        .exec();

        const count = await Product.find({
            $or: [
                {productName: {$regex: new RegExp(".*"+search+".*","i")}},
                {brand: {$regex: new RegExp(".*"+search+".*","i")}}
            ],
        }).countDocuments();

        const category = await Category.find({isListed: true});
        const brand = await Brand.find({isBlocked: false});

        if(category && brand){
            res.render("products", {
                data: productData,
                currentPage: page,
                totalPages: Math.ceil(count/limit),
                cat: category,
                brand: brand,
            })
        }else {
            res.render("page-404");
        }
    } catch (error) {

        res.redirect('/pageerror');
        
    }
}


const addOffer = async (req, res) => {
    try {
        const { productId, offer } = req.body;
        if (offer === undefined || offer === null) {
            return res.status(400).json({ success: false, message: 'Offer is required' });
        }
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        product.offer = offer;
        await product.save();
        res.json({ success: true, message: 'Offer added successfully' });
    } catch (error) {
        console.error('Error adding offer:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

const removeOffer = async (req, res) => {
    try {
        const { productId } = req.body;
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        product.offer = 0;
        await product.save();
        res.json({ success: true, message: 'Offer removed successfully' });
    } catch (error) {
        console.error('Error removing offer:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};


const blockProduct = async (req, res) => {
    try {
        let id = req.query.id;
        await Product.updateOne({_id:id},{$set: {isBlocked: true}});
        res.redirect('/admin/products');
    } catch (error) {
        res.redirect('/pageerror')
    }
}

const unblockProduct = async (req, res) => {
    try {
        let id = req.query.id;
        await Product.updateOne({_id:id},{$set: {isBlocked: false}});
        res.redirect('/admin/products');
    } catch (error) {
        res.redirect('/pageerror')
    }
}


const  getEditProduct = async (req, res) => {
    try {

        const id = req.query.id;
        const product = await Product.findOne({ _id: id }).populate('category');
        const cat = await Category.find({});
        const brand = await Brand.find({});
        
        res.render('edit-product', { product, brand, cat });
    } catch (error) {
        console.error(error);
        res.redirect('/pageerror');
    }
};



const editProduct = async (req, res) => {
    try {
        const id = req.params.id;
        console.log("this is coming id:",id)
        const data = req.body;

        const category = await Category.findById(data.category);
        console.log(category,'Category id');

        if (!category) {
        return res.status(400).json({ error: "Category not found" });
        }

        const existingProduct = await Product.findOne({
            name: data.productName,
            _id: { $ne: id }
        });

        if (existingProduct) {
            return res.status(400).json({ error: "Product with this name already exists. Please try another name." });
        }

        const images = [];
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                images.push(req.files[i].filename);
            }
        }

        const updateFields = {
            name: data.name,
            description: data.description,
            brand: data.brand,
            category: data.category._id,
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            size: data.size,
            color: data.color,
            quantity: data.quantity
        };

        if (images.length > 0) {
            updateFields.$push = { uploads: { $each: images } };
        }

        let result=await Product.findByIdAndUpdate(id, updateFields, { new: true });
        console.log(result)
        res.redirect('/admin/products');
    } catch (error) {
        console.error(error);
        res.redirect('/pageerror');
    }
};



const deleteImage = async (req, res) => {
    try {
        const { imageNameToServer, productIdToServer } = req.body;

        const product = await Product.findById(productIdToServer);
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }

        const imageIndex = product.images.indexOf(imageNameToServer);
        if (imageIndex > -1) {
            product.images.splice(imageIndex, 1);
            await product.save();

            // Delete the image file from the server
            const imagePath = path.join(__dirname, '../../uploads', imageNameToServer);
            fs.unlink(imagePath, (err) => {
                if (err) {
                    console.error('Error deleting image file:', err);
                }
            });

            res.json({ success: true, message: "Image deleted successfully" });
        } else {
            res.status(404).json({ error: "Image not found in product" });
        }
    } catch (error) {
        console.error('Error deleting image:', error);
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = {
    getProductAddPage,
    addProducts,
    getAllProducts,
    addOffer,
    removeOffer,
    blockProduct,
    unblockProduct,
    getEditProduct,
    editProduct,
    deleteImage
};