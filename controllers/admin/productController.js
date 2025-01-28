const path = require("path");
const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const Category = require("../../models/categorySchema");
const cloudinary = require('../../config/cloudinary');
const fs = require("fs");
const sharp = require("sharp");

const getProductAddPage = async (req, res, next) => {
  try {
    const brands = await Brand.find({ isBlocked: false }); 
    const categories = await Category.find({ isListed: true }); 
    res.render("product-add", { brands, categories }); 
  } catch (error) {
    next(error);
  }
};

const addProducts = async (req, res, next) => {
  try {
    const { name, description, brand, category, combos } = req.body;

    // Cloudinary image uploading
    const imageUrl = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file =>
        cloudinary.uploader.upload(file.path, { quality: "100" })
      );
      const uploadResults = await Promise.all(uploadPromises);
      uploadResults.forEach(result => imageUrl.push(result.secure_url));
    }

    // Parse combos if provided
    let combosArray = [];
    if (combos) {
      combosArray = JSON.parse(combos);
    }

    if (!name || !description || !brand || !category || imageUrl.length === 0) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const categoryDoc = await Category.findOne({ name: category });
    if (!categoryDoc) {
      return res.status(400).json({ message: "Invalid category" });
    }

    const newProduct = new Product({
      name,
      description,
      brand,
      category: categoryDoc._id,
      combos: combosArray,
      images: imageUrl,
    });

    await newProduct.save();
    res.status(201).json({ message: "Product added successfully" });
  } catch (error) {
    console.error("Error adding product:", error); // Log the error
    next(error);
  }
};


const getAllProducts = async (req, res, next) => {
  try {
    const search = req.query.search || "";
    const page = req.query.page || 1;
    const limit = 4;

    const productData = await Product.find({
      $or: [
        { name: { $regex: new RegExp(".*" + search + ".*", "i") } },
        { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
      ],
    })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("category") // Ensure category is populated
      .exec();

    const count = await Product.find({
      $or: [
        { name: { $regex: new RegExp(".*" + search + ".*", "i") } },
        { brand: { $regex: new RegExp(".*" + search + ".*", "i") } },
      ],
    }).countDocuments();

    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });

    if (category && brand) {
      res.render("products", {
        data: productData,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        cat: category,
        brand: brand,
      });
    } else {
      res.render("page-404");
    }
  } catch (error) {
    next(error)
  }
};



const addOffer = async (req, res, next) => {
  try {
    const { productId, offer } = req.body;
    if (offer === undefined || offer === null) {
      return res
        .status(400)
        .json({ success: false, message: "Offer is required" });
    }
    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    product.offer = offer;
    await product.save();
    res.json({ success: true, message: "Offer added successfully" });
  } catch (error) {
    next(error);
  }
};

const removeOffer = async (req, res, next) => {
  try {
    const { productId } = req.body;
    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    product.offer = 0;
    await product.save();
    res.json({ success: true, message: "Offer removed successfully" });
  } catch (error) {
    next(error);
  }
};

const blockProduct = async (req, res, next) => {
  try {
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res.redirect("/admin/products");
  } catch (error) {
    next(error);
  }
};

const unblockProduct = async (req, res, next) => {
  try {
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res.redirect("/admin/products");
  } catch (error) {
    next(error);
  }
};

const getEditProduct = async (req, res, next) => {
  try {
    const id = req.query.id; // Get the product ID from the query parameters
    const product = await Product.findOne({ _id: id }).populate("category").populate("brand"); 
    const cat = await Category.find({isListed: true });
    const brands = await Brand.find({ isBlocked: false});

    // Log the product data to verify the images array
    console.log(product);

    res.render("edit-product", { product, brands, cat }); // Ensure product with images is passed to the view
  } catch (error) {
    next(error);
  }
};

const editProduct = async (req, res, next) => {
  try {
    const id = req.params.id;
    const data = req.body;

    const category = await Category.findById(data.category);
    if (!category) {
      return res.status(400).json({ error: 'Category not found' });
    }

    const existingProduct = await Product.findOne({
      name: data.productName,
      _id: { $ne: id },
    });

    if (existingProduct) {
      return res.status(400).json({
        error: 'Product with this name already exists. Please try another name.',
      });
    }

    // Update fields
    const updateFields = {
      name: data.productName,
      description: data.description,
      brand: data.brand,
      category: data.category,
      regularPrice: data.regularPrice,
      salesPrice: data.salePrice,
      size: data.size,
      color: data.color,
      quantity: data.quantity,
    };

    const product = await Product.findById(id);

    // Cloudinary image uploading
    const images = [];
    if (req.files && req.files.images) {
      for (let i = 0; i < req.files.images.length; i++) {
        const result = await cloudinary.uploader.upload(req.files.images[i].path, {
          quality: "100",
        });
        images.push(result.secure_url);
      }
    }

    // Handle image replacements
    for (let i = 1; i <= 4; i++) {
      if (req.files[`replace_image${i}`]) {
        const result = await cloudinary.uploader.upload(req.files[`replace_image${i}`][0].path, {
          quality: "100",
        });
        images[i - 1] = result.secure_url;
      }
    }

    // If new images are uploaded, update the images field
    if (images.length > 0) {
      updateFields.images = images;
    }

    await Product.findByIdAndUpdate(id, updateFields, { new: true });

    res.redirect('/admin/products');
  } catch (error) {
    next(error);
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
};