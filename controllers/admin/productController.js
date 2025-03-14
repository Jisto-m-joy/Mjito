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

    console.log("Request Body:", req.body); // Log entire request body for debugging

    const imageUrl = [];
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file =>
        cloudinary.uploader.upload(file.path, { quality: "100" })
      );
      const uploadResults = await Promise.all(uploadPromises);
      uploadResults.forEach(result => imageUrl.push(result.secure_url));
    }

    let combosArray = [];
    if (combos) {
      try {
        combosArray = JSON.parse(combos);
      } catch (error) {
        console.error("Invalid combos format:", error);
        return res.status(400).json({ error: "Invalid combos format" });
      }
    }

    if (!name || !description || !brand || !category || imageUrl.length === 0) {
      console.log("Validation Error: Missing required fields");
      return res.status(400).json({ error: "All fields are required" });
    }

    const categoryDoc = await Category.findOne({ name: category });
    if (!categoryDoc) {
      console.log("Validation Error: Invalid category");
      return res.status(400).json({ error: "Invalid category" });
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
      ],
    })
      .select('name brand category combos offer productOffer offerPercentage offerEndDate') // Explicitly select these fields
      .populate("brand")
      .populate("category")
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Product.find({
      $or: [
        { name: { $regex: new RegExp(".*" + search + ".*", "i") } },
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
    const { productId, offerPercentage, offerEndDate } = req.body;

    // Validate input
    if (!productId) {
      return res.status(400).json({ success: false, message: "Product ID is required" });
    }
    if (!offerPercentage || isNaN(offerPercentage) || offerPercentage < 0 || offerPercentage > 100) {
      return res.status(400).json({ success: false, message: "Offer percentage must be between 0 and 100" });
    }
    if (!offerEndDate) {
      return res.status(400).json({ success: false, message: "End date is required" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Update product with offer details
    product.offerPercentage = offerPercentage;
    product.offerEndDate = new Date(offerEndDate);
    product.productOffer = true; // Set productOffer to true when an offer is added

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
    // Reset all offer-related fields
    product.offerPercentage = 0;
    product.offerEndDate = null;
    product.productOffer = false;
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
    const product = await Product.findOne({ _id: id }).populate("category"); 
    const cat = await Category.find({ isListed: true });
    const brands = await Brand.find({ isBlocked: false });

       // Log the brands data to verify
    console.log("Brands:", brands);

    res.render("edit-product", { product, brands, cat }); // Ensure product with images is passed to the view
  } catch (error) {
    next(error);
  }
};

const editProduct = async (req, res, next) => {
  try {
    const id = req.params.id;
    const data = req.body;

    console.log('Request body:', data); // Debug log

    // Validate category
    const category = await Category.findById(data.category);
    if (!category) {
      return res.status(400).json({ error: 'Category not found' });
    }

    // Check for duplicate product name
    const existingProduct = await Product.findOne({
      name: data.productName,
      _id: { $ne: id },
    });

    if (existingProduct) {
      return res.status(400).json({
        error: 'Product with this name already exists.',
      });
    }

    // Parse combos
    let combosArray = [];
    if (data.combos) {
      try {
        combosArray = JSON.parse(data.combos);
      } catch (error) {
        console.error("Combos parsing error:", error);
        return res.status(400).json({ error: "Invalid combos format" });
      }
    }

    // Fetch the brand's name using the brand ID
    const brand = await Brand.findById(data.brand);
    if (!brand) {
      return res.status(400).json({ error: 'Brand not found' });
    }

    // Prepare update fields
    const updateFields = {
      name: data.productName,
      description: data.description,
      brand: brand.brandName,
      category: data.category,
      combos: combosArray,
    };

    // Handle images
    if (req.files) {
      const currentProduct = await Product.findById(id);
      if (!currentProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const updatedImages = [...currentProduct.images];

      for (let i = 1; i <= 4; i++) {
        if (req.files[`replace_image${i}`] && req.files[`replace_image${i}`][0]) {
          try {
            // Delete the old image from Cloudinary if it exists
            if (updatedImages[i - 1]) {
              const oldImageUrl = updatedImages[i - 1];
              const publicId = oldImageUrl.split('/').pop().split('.')[0]; // Extract public ID from URL
              await cloudinary.uploader.destroy(publicId);
            }

            // Upload the new image to Cloudinary
            const result = await cloudinary.uploader.upload(
              req.files[`replace_image${i}`][0].path,
              { quality: "100" }
            );
            updatedImages[i - 1] = result.secure_url;

            // Delete the temporary file from disk
            fs.unlinkSync(req.files[`replace_image${i}`][0].path);
          } catch (uploadError) {
            console.error('Image upload error:', uploadError);
            return res.status(500).json({ error: 'Error uploading image' });
          }
        }
      }

      updateFields.images = updatedImages;
    }

    // Update product
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      updateFields,
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product: updatedProduct
    });

  } catch (error) {
    console.error('Edit product error:', error);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while updating the product'
    });
  }
};

const searchProducts = async (req, res, next) => {
  try {
    const searchQuery = req.query.query || "";
    const page = req.query.page || 1;
    const limit = 10;

    const productData = await Product.find({
      name: { $regex: new RegExp(".*" + searchQuery + ".*", "i") },
    })
      .populate("brand")
      .populate("category")
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    const count = await Product.find({
      name: { $regex: new RegExp(".*" + searchQuery + ".*", "i") },
    }).countDocuments();

    res.render("search-results", {
      data: productData,
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      searchQuery,
    });
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
  searchProducts
};