// Description: This file contains the routes for admin.
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController");
const brandController = require("../controllers/admin/brandController");
const productController = require("../controllers/admin/productController");
const { userAuth, adminAuth } = require("../middlewares/auth");
const multer = require("multer");
const storage = require("../helpers/multer");
const uploads = multer({ storage: storage });

// Error Page
router.get("/pageerror", adminController.pageerror);
// Login Management
router.get("/login", adminController.loadLogin);
router.post("/login", adminController.login);
router.get("/", adminAuth, adminController.loadDashboard);
router.get("/logout", adminController.logout);
// Customer Management
router.get("/users", adminAuth, customerController.customerInfo);
router.get("/blockCustomer", adminAuth, customerController.blockCustomer);
router.get("/unblockCustomer", adminAuth, customerController.unblockCustomer);
// Category Management
router.get("/category", adminAuth, categoryController.categoryInfo);
router.post("/addCategory", adminAuth, categoryController.addCategory);
router.post(
  "/addCategoryOffer",
  adminAuth,
  categoryController.addCategoryOffer
);
router.post(
  "/removeCategoryOffer",
  adminAuth,
  categoryController.removeCategoryOffer
);
router.get("/listCategory", adminAuth, categoryController.getlistCategory);
router.get("/unlistCategory", adminAuth, categoryController.getUnlistCategory);
router.get("/editCategory", adminAuth, categoryController.getEditCategory);
router.post("/editCategory/:id", adminAuth, categoryController.editCategory);
// Brand Management
router.get("/brands", adminAuth, brandController.getBrandPage);
router.post("/addBrand", uploads.single("image"), brandController.addBrand);
router.get("/blockBrand", adminAuth, brandController.blockBrand);
router.get("/unBlockBrand", adminAuth, brandController.unBlockBrand);
router.get("/deleteBrand", adminAuth, brandController.deleteBrand);
// Product Management
router.get("/addProducts", adminAuth, productController.getProductAddPage);
router.post(
  "/addProducts",
  adminAuth,
  uploads.array("images", 4),
  productController.addProducts
);
router.get("/products", adminAuth, productController.getAllProducts);
router.post("/addOffer", productController.addOffer);
router.post("/removeOffer", productController.removeOffer);
router.get("/blockProduct", adminAuth, productController.blockProduct);
router.get("/unblockProduct", adminAuth, productController.unblockProduct);
router.get("/editProduct", adminAuth, productController.getEditProduct);
router.post(
  "/editProduct/:id",
  adminAuth,
  uploads.array("images", 4),
  productController.editProduct
);
module.exports = router;
