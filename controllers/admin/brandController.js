const Brand = require("../../models/brandSchema");
const Product = require("../../models/productSchema");

const getBrandPage = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;
    const brandData = await Brand.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const totalBrands = await Brand.countDocuments();
    const totalPages = Math.ceil(totalBrands / limit);
    const reverseBrands = brandData.reverse();
    res.render("brand", {
      data: reverseBrands,
      totalPages: totalPages,
      currentPage: page,
      totalBrands: totalBrands,
    });
  } catch (error) {
    next(error);
  }
};

const addBrand = async (req, res, next) => {
  try {
    if (!req.file) {
      console.error("No file uploaded");
      return res.status(400).send("No file uploaded");
    }

    const brand = req.body.name;
    const description = req.body.description;
    const Image = req.file.filename;

    const findBrand = await Brand.findOne({ brandName: brand });
    if (!findBrand) {
      const newBrand = new Brand({
        brandName: brand,
        description: description,
        brandImage: Image,
      });
      await newBrand.save();
      res.redirect("/admin/brands");
    } else {
      res.status(400).send("Brand already exists");
    }
  } catch (error) {
    next(error);
  }
};

const checkBrandExists = async (req, res, next) => {
  try {
    const brandName = req.query.name;
    const findBrand = await Brand.findOne({
      brandName: new RegExp(`^${brandName}$`, "i"),
    });
    res.json({ exists: !!findBrand });
  } catch (error) {
    next(error);
  }
};

const toggleBrandBlockStatus = async (req, res, next) => {
  try {
    const id = req.query.id;
    const brand = await Brand.findById(id);
    if (brand) {
      brand.isBlocked = !brand.isBlocked;
      await brand.save();
      res.redirect("/admin/brands");
    } else {
      res.status(404).send("Brand not found");
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBrandPage,
  addBrand,
  toggleBrandBlockStatus,
  checkBrandExists,
};
