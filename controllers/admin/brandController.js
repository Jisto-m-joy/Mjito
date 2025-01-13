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
        const brand = req.body.name;
        const Image = req.body.image; // Ensure you are getting the image from the request body or file upload

        const findBrand = await Brand.findOne({ brandName: brand });
        if (!findBrand) {
            const newBrand = new Brand({
                brandName: brand,
                brandImage: Image
            });
            await newBrand.save();
            res.redirect('/admin/brand');
        } else {
            res.status(400).send('Brand already exists');
        }
    } catch (error) {
        console.error('Error adding brand:', error);
        res.redirect('/pageerror');
    }
};


module.exports = {
    getBrandPage,
    addBrand
}