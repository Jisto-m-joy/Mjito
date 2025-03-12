const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const passwordController  = require("../controllers/user/passwordController");
const profileController = require("../controllers/user/profileController");
const productController = require("../controllers/user/productController");
const cartController = require("../controllers/user/cartController");
const checkoutController = require("../controllers/user/checkoutController");
const orderController = require("../controllers/user/orderController");
const wishlistController = require("../controllers/user/wishlistController");
const walletController = require('../controllers/user/walletController');
const passport = require("passport");
const validateSession = require("../middlewares/session-validation");
const { userAuth, adminAuth, checkBlockStatus } = require("../middlewares/auth");
const  fetchCounts  = require("../middlewares/countMiddleware");
const upload = require("../helpers/multer");  
const app = express();
const { errorHandler } = require('../middlewares/errorHandler');

// Error handling middleware
router.use(errorHandler);
router.use(fetchCounts);

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
router.post('/update-profile-pic', 
  userAuth, 
  upload.single('profilePic'), 
  profileController.updateProfilePicture
);

/// Wallet Management 
router.get('/user-wallet', userAuth, walletController.loadWalletPage);
router.post('/add-money-to-wallet', userAuth, walletController.addMoneyToWallet);
router.post('/verify-payment', userAuth, walletController.verifyPayment);

// Order Management
router.get('/my-orders', userAuth, orderController.loadMyOrders);
router.post('/cancel-order/:orderId', userAuth, orderController.cancelOrder);
router.post('/return-order/:orderId', userAuth, orderController.returnOrder);
router.post('/approve-return/:orderId', adminAuth, orderController.approveReturn);
router.get('/order-details/:orderId', userAuth, orderController.getOrderDetails);
router.get('/download-invoice/:orderId', userAuth, orderController.downloadInvoice);
router.post('/retry-razorpay-payment', userAuth, orderController.retryRazorpayPayment); 
router.post('/verify-retry-razorpay', userAuth, orderController.verifyRetryRazorpayPayment);

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
router.post('/buy-now', userAuth, cartController.buyNow);
router.put('/update-cart-quantity', userAuth, cartController.updateCartQuantity);
router.delete('/remove-from-cart/:productId', userAuth, cartController.removeFromCart);


// Checkout Management 
router.get('/checkout', userAuth, checkBlockStatus, checkoutController.loadCheckoutPage);
router.post('/place-order', userAuth, checkoutController.placeOrder);
router.get('/order-placed', userAuth, checkoutController.loadOrderPlacedPage);
router.post('/apply-coupon', userAuth, checkoutController.applyCoupon);
router.post('/remove-coupon', userAuth, checkoutController.removeCoupon);
router.post('/initiate-razorpay', userAuth, checkoutController.initiateRazorpayPayment);
router.post('/verify-razorpay', userAuth, checkoutController.verifyRazorpayPayment);
router.get('/wallet-balance', userAuth, checkoutController.getWalletBalance);


// Wishlist Management
router.get('/wishlist', userAuth, wishlistController.loadWishlistPage);
router.post('/wishlist/add/:productId', userAuth, wishlistController.addToWishlist);
router.delete('/wishlist/remove/:productId', userAuth, wishlistController.removeFromWishlist);
router.get('/wishlist/check-status', userAuth, wishlistController.checkWishlistStatus);


module.exports = router;