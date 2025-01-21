const path = require("path");
const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const Category = require("../../models/categorySchema");
const fs = require("fs");

const getProductAddPage = async (req, res) => {
  try {
    const brands = await Brand.find(); // Fetch all brands from the database
    const categories = await Category.find(); // Fetch all categories from the database
    res.render("product-add", { brands, categories }); // Pass the brands and categories to the view
  } catch (error) {
    console.error("Error fetching brands or categories:", error);
    res.status(500).send("Server error");
  }
};

const addProducts = async (req, res) => {
  try {
    const {
      name,
      description,
      regularPrice,
      salesPrice,
      quantity,
      brand,
      category,
      color,
      size,
    } = req.body;

    const images = req.files.map((file) => path.relative('public', file.path));

    if (
      !name ||
      !description ||
      !regularPrice ||
      !salesPrice ||
      !brand ||
      !quantity ||
      !category ||
      !color ||
      !size ||
      images.length === 0
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const categoryDoc = await Category.findOne({ name: category });
    if (!categoryDoc) {
      return res.status(400).json({ message: "Invalid category" });
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
      images,
    });

    await newProduct.save();
    res.status(201).json({ message: "Product added successfully" });
  } catch (error) {
    console.error("Error saving product:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getAllProducts = async (req, res) => {
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
      .populate("category")
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
    res.redirect("/pageerror");
  }
};

const addOffer = async (req, res) => {
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
    console.error("Error adding offer:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const removeOffer = async (req, res) => {
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
    console.error("Error removing offer:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const blockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res.redirect("/admin/products");
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const unblockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res.redirect("/admin/products");
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const getEditProduct = async (req, res) => {
    try {
        const id = req.query.id; // Get the product ID from the query parameters
        const product = await Product.findOne({ _id: id }).populate("category");
        const cat = await Category.find({});
        const brand = await Brand.find({});

        res.render("edit-product", { product, brand, cat });
    } catch (error) {
        console.error(error);
        res.redirect("/pageerror");
    }
};

const editProduct = async (req, res) => {
  try {
    const id = req.params.id;
    console.log("Received request to edit product with ID:", id);
    const data = req.body;
    console.log("Received data:", data);

    const category = await Category.findById(data.category);
    console.log("Found category:", category);

    if (!category) {
      return res.status(400).json({ error: "Category not found" });
    }

    const existingProduct = await Product.findOne({
      name: data.productName,
      _id: { $ne: id },
    });

    if (existingProduct) {
      return res.status(400).json({
        error: "Product with this name already exists. Please try another name.",
      });
    }

    const updateFields = {
      name: data.productName,
      description: data.description,
      brand: data.brand,
      category: data.category,
      regularPrice: data.regularPrice,
      salesPrice: data.salePrice,  // Ensure this field is being updated
      size: data.size,
      color: data.color,
      quantity: data.quantity,
    };

    const images = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        const imageField = file.fieldname.replace("replace_", "");
        images.push({ imageField, filename: file.filename });
      });
    }

    if (images.length > 0) {
      for (const image of images) {
        const product = await Product.findById(id);
        const imagePath = path.join("public", image.imageField);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
        const imageIndex = product.images.indexOf(image.imageField);
        if (imageIndex !== -1) {
          product.images[imageIndex] = image.filename;
        } else {
          product.images.push(image.filename);
        }
        await product.save();
      }
    }

    let result = await Product.findByIdAndUpdate(id, updateFields, {
      new: true,
    });
    console.log("Updated product:", result);
    res.redirect("/admin/products");
  } catch (error) {
    console.error("Error updating product:", error);
    res.redirect("/pageerror");
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