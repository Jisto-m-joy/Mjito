const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const passwordController  = require("../controllers/user/passwordController");
const profileController = require("../controllers/user/profileController");
const productController = require("../controllers/user/productController");
const cartController = require("../controllers/user/cartController");
const checkoutController = require("../controllers/user/checkoutController");
const orderController = require("../controllers/user/orderController");
const passport = require("passport");
const validateSession = require("../middlewares/session-validation");
const { userAuth, adminAuth, checkBlockStatus } = require("../middlewares/auth");
const app = express();
const { errorHandler } = require('../middlewares/errorHandler');

// Error handling middleware
router.use(errorHandler);

// Debugging Middleware
// router.use((req, res, next) => {
//   console.log(`Incoming request: ${req.method} ${req.url}`);
//   next();
// });

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
    req.session.user = req.user; 
    res.redirect('/');
  });


//Home Page & Shop Page
router.get("/", checkBlockStatus, userController.loadHomepage);
router.get("/home", checkBlockStatus, userController.loadHomepage);
router.get('/shop', userController.loadShopingPage);



// Product Management
router.get("/productDetails", productController.productDetails);
router.post("/submitReview", userAuth, productController.submitReview); 


// Profile Management
router.get('/user-profile', userAuth, profileController.loadUserProfile);
router.post('/update-profile', userAuth, profileController.updateUserProfile);
router.post('/add-address', userAuth, profileController.addAddress);
router.get('/user-address', userAuth, profileController.loadUserAddress);
router.get('/get-address/:addressId', userAuth, profileController.getAddressById); 
router.put('/update-address/:addressId', userAuth, profileController.updateAddress);
router.delete('/delete-address/:addressId', userAuth, profileController.deleteAddress);
router.post('/change-password', userAuth, profileController.resetPassword);
router.post('/update-name', userAuth, profileController.updateUserName); 


// Order Management
router.get('/my-orders', userAuth, orderController.loadMyOrders);
router.post('/cancel-order/:orderId', userAuth, orderController.cancelOrder);


// Forgot Password Management
router.post('/reset-password',userAuth, profileController.resetPassword);
router.get('/forgot-password', passwordController.getForgotPassPage);
router.post('/forgot-email-valid', passwordController.forgotEmailValid);
router.post('/verify-passForgot-otp', passwordController.verifyForgotPassOtp);
router.get('/reset-password', passwordController.getResetPassPage);
router.post('/resend-forgot-otp', passwordController.resendOtp);
router.post('/post-reset-password', passwordController.postNewPassword);

// Cart Management 
router.get('/cart', userAuth, cartController.loadCartPage);
router.post('/add-to-cart', userAuth, cartController.addToCart);
router.put('/update-cart-quantity', userAuth, cartController.updateCartQuantity);
router.delete('/remove-from-cart/:productId', userAuth, cartController.removeFromCart);


// Checkout Management 
router.get('/checkout', userAuth, checkBlockStatus, checkoutController.loadCheckoutPage);
router.post('/place-order', userAuth, checkoutController.placeOrder);
router.get('/order-placed', userAuth, checkoutController.loadOrderPlacedPage);

module.exports = router;