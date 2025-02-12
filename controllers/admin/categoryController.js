const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");

const categoryInfo = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;
    
    // Get search query from request
    const searchQuery = req.query.search;
    
    // Build the filter object
    let filter = {};
    if (searchQuery) {
      filter.name = { $regex: new RegExp(searchQuery, 'i') };
    }

    // Apply filter to database query
    const categoriesData = await Category.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCategories = await Category.countDocuments(filter);
    const totalPages = Math.ceil(totalCategories / limit);
    
    res.render("category", {
      cat: categoriesData,
      totalPages: totalPages,
      currentPage: page,
      totalCategories: totalCategories,
      searchQuery: searchQuery || '' // Pass search query back to view
    });
  } catch (error) {
    next(error);
  }
};

const addCategory = async (req, res, next) => {
  const { name, description } = req.body;
  try {
    // Convert the category name to lowercase for case-insensitive comparison
    const existingCategory = await Category.findOne({
      name: new RegExp(`^${name}$`, "i"),
    });
    if (existingCategory) {
      return res.status(400).json({ error: "Category already exists" });
    }
    const newCategory = new Category({
      name,
      description,
    });
    await newCategory.save();
    return res.status(201).json({ message: "Category added successfully" });
  } catch (error) {
    next(error);
  }
};

const addCategoryOffer = async (req, res, next) => {
  try {
    const percentage = parseInt(req.body.percentage);
    const categoryId = req.body.categoryId;
    const category = await Category.findById(categoryId);
    if (!category) {
      return res
        .status(400)
        .json({ status: false, message: "Category not found" });
    }
    const products = await Product.find({ category: category._id });
    const hasProductOffer = products.some(
      (product) => product.productOffer > percentage
    );
    if (hasProductOffer) {
      return res.json({
        status: false,
        message: "Products within this category already have product offers",
      });
    }
    await Category.updateOne(
      { _id: categoryId },
      { $set: { categoryOffer: percentage } }
    );

    for (const product of products) {
      product.productOffer = 0;
      product.salePrice = product.regularPrice;
      await product.save();
    }
    res.json({ status: true });
  } catch (error) {
    next(error);
  }
};


const removeCategoryOffer = async (req, res, next) => {
  try {
    const categoryId = req.params.categoryId; // Change to req.params
    const category = await Category.findById(categoryId);

    if (!category) {
      return res
        .status(404)
        .json({ status: false, message: "Category not found" });
    }

    const percentage = category.categoryOffer;
    const products = await Product.find({ category: category._id });

    if (products.length > 0) {
      for (const product of products) {
        product.salesPrice += Math.floor(
          product.regularPrice * (percentage / 100)
        );
        product.productOffer = 0;
        await product.save();
      }
    }

    category.categoryOffer = 0;
    await category.save();
    res
      .status(200)
      .json({ status: true, message: "Category offer removed successfully" });
  } catch (error) {
    next(error);
  }
};


const getlistCategory = async (req, res, next) => {
  try {
    let id = req.query.id;
    await Category.updateOne({ _id: id }, { $set: { isListed: false } });
    res.redirect("/admin/category");
  } catch (error) {
    next(error)
  }
};

const getUnlistCategory = async (req, res, next) => {
  try {
    let id = req.query.id;
    await Category.updateOne({ _id: id }, { $set: { isListed: true } });
    res.redirect("/admin/category");
  } catch (error) {
    next(error);
  }
};

const getEditCategory = async (req, res, next) => {
  try {
    const id = req.query.id;
    const category = await Category.findOne({ _id: id });
    res.render("edit-category", { category: category });
  } catch (error) {
    next(error);
  }
};

const editCategory = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { categoryName, description } = req.body;
    // Convert the category name to lowercase for case-insensitive comparison
    const existingCategory = await Category.findOne({
      name: new RegExp(`^${categoryName}$`, "i"),
    });

    if (existingCategory && existingCategory._id.toString() !== id) {
      return res.status(400).json({ error: "Category already exists, Please choose another name" });
    }

    const updateCategory = await Category.findByIdAndUpdate(
      id,
      {
        name: categoryName,
        description: description,
      },
      { new: true }
    );

    if (updateCategory) {
      return res.status(200).json({ message: "Category updated successfully" });
    } else {
      return res.status(404).json({ error: "Category not found" });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  categoryInfo,
  addCategory,
  addCategoryOffer,
  removeCategoryOffer,
  getlistCategory,
  getUnlistCategory,
  getEditCategory,
  editCategory,
};

