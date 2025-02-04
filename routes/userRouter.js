const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const profileController = require("../controllers/user/profileController");
const productController = require("../controllers/user/productController");
const cartController = require("../controllers/user/cartController");
const passport = require("passport");
const validateSession = require("../middlewares/session-validation");
const { userAuth, adminAuth, checkBlockStatus } = require("../middlewares/auth");
const app = express();
const { errorHandler } = require('../middlewares/errorHandler');

// Error handling middleware
router.use(errorHandler);

router.get("/pageNotFound", userController.pageNotFound);
router.get("/signup", userController.loadSignup);
router.get("/login", userController.loadLogin);
router.post("/login", userController.login);
router.get("/logout", userController.logout);
router.post("/signup", userController.signup);
router.post("/verify-otp", validateSession, userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);

// Google OAuth callback route
router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect home.
    req.session.user = req.user; // Set the user in the session
    res.redirect('/');
  });


//Home Page & Shop Page
router.get("/", checkBlockStatus, userController.loadHomepage);
router.get("/home", checkBlockStatus, userController.loadHomepage);
router.get('/shop', userController.loadShopingPage);



// Product Management
router.get("/productDetails", productController.productDetails);
router.post("/submitReview", userAuth, productController.submitReview); // Add this route for review submission


// Profile Management
router.get('/forgot-password', profileController.getForgotPassPage);
router.post('/forgot-email-valid', profileController.forgotEmailValid);
router.post('/verify-passForgot-otp', profileController.verifyForgotPassOtp);
router.get('/reset-password', profileController.getResetPassPage);
router.post('/resend-forgot-otp', profileController.resendOtp);
router.post('/reset-password', profileController.postNewPassword);


// Cart Management 
router.get('/cart', userAuth, cartController.loadCartPage);
router.post('/add-to-cart', userAuth, cartController.addToCart);
router.put('/update-cart-quantity', userAuth, cartController.updateCartQuantity);
router.delete('/remove-from-cart/:productId', userAuth, cartController.removeFromCart);




router.get('/checkout', userAuth, userController.loadCheckoutPage);

module.exports = router;