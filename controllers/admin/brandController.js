const Brand = require('../../models/brandSchema');
const Product = require('../../models/productSchema');

const getBrandPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;
        const brandData = await Brand.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit);
        const totalBrands = await Brand.countDocuments();
        const totalPages = Math.ceil(totalBrands / limit);                                                      
        const reverseBrands = brandData.reverse();
        res.render('brand', {
            data : reverseBrands,
            totalPages: totalPages,
            currentPage: page,
            totalBrands: totalBrands
        });
    } catch (error) {
        res.redirect('/pageerror');
    }
}

const addBrand = async (req, res) => {
    try {
        if (!req.file) {
            console.error('No file uploaded');
            return res.status(400).send('No file uploaded');
        }

        const brand = req.body.name;
        const description = req.body.description;
        const Image = req.file.filename;

        const findBrand = await Brand.findOne({ brandName: brand });
        if (!findBrand) {
            const newBrand = new Brand({
                brandName: brand,
                description: description,
                brandImage: Image
            });
            await newBrand.save();
            res.redirect('/admin/brands');
        } else {
            res.status(400).send('Brand already exists');
        }
    } catch (error) {
        console.error('Error adding brand:', error);
        res.redirect('/pageerror');
    }
};

const checkBrandExists = async (req, res) => {
    try {
        const brandName = req.query.name;
        const findBrand = await Brand.findOne({ brandName: new RegExp(`^${brandName}$`, 'i') });
        res.json({ exists: !!findBrand });
    } catch (error) {
        console.error('Error checking brand existence:', error);
        res.status(500).send('Internal Server Error');
    }
};

const blockBrand = async (req, res) => {
    try {
        const id = req.query.id;
        await Brand.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.redirect('/admin/brands');
    } catch (error) {
        res.redirect('/pageerror');
    }
}

const unBlockBrand = async (req, res) => {
    try {
        const id = req.query.id;
        await Brand.updateOne({ _id: id }, { $set: { isBlocked: false } });
        res.redirect('/admin/brands');
    } catch (error) {
        res.redirect('/pageerror');
    }
}

const toggleBrandBlockStatus = async (req, res) => {
    try {
        const id = req.query.id;
        const brand = await Brand.findById(id);
        if (brand) {
            brand.isBlocked = !brand.isBlocked;
            await brand.save();
            res.redirect('/admin/brands');
        } else {
            res.status(404).send('Brand not found');
        }
    } catch (error) {
        res.redirect('/pageerror');
    }
}

module.exports = {
    getBrandPage,
    addBrand,
    blockBrand,
    unBlockBrand,
    toggleBrandBlockStatus,
    checkBrandExists
};