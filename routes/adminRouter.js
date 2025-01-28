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
const { adminErrorHandler } = require('../middlewares/errorHandler')

// Error Handling middleware
router.use(adminErrorHandler);

// Login Management
router.get("/login", adminController.loadLogin);
router.post("/login", adminController.login);
router.get("/", adminAuth, adminController.loadDashboard);
router.get("/logout", adminController.logout);

// Customer Management
router.get("/users", adminAuth, customerController.customerInfo);
router.patch("/blockCustomer", adminAuth, customerController.blockCustomer);
router.patch("/unblockCustomer", adminAuth, customerController.unblockCustomer);

// Category Management
router.get("/category", adminAuth, categoryController.categoryInfo);
router.post("/addCategory", adminAuth, categoryController.addCategory);
router.post(
  "/addCategoryOffer",
  adminAuth,
  categoryController.addCategoryOffer
);
router.delete(
  "/removeCategoryOffer/:categoryId", 
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
router.get(
  "/toggleBrandBlockStatus", 
  adminAuth,
  brandController.toggleBrandBlockStatus
);
router.get("/checkBrandExists", adminAuth, brandController.checkBrandExists); 

// Product Management
router.get("/addProducts",  productController.getProductAddPage);
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
router.post('/editProduct/:id', adminAuth, uploads.fields([
  { name: 'images', maxCount: 4 },
  { name: 'replace_image1' },
  { name: 'replace_image2' },
  { name: 'replace_image3' },
  { name: 'replace_image4' }
]), productController.editProduct);
module.exports = router;