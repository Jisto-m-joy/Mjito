const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const profileController = require("../controllers/user/profileController");
const productController = require("../controllers/user/productController");
const passport = require("passport");
const validateSession = require("../middlewares/session-validation");
const {
  userAuth,
  adminAuth,
  checkBlockStatus,
} = require("../middlewares/auth");
const app = express();
const {errorHandler} = require('../middlewares/errorHandler');

//Error handling middleware
router.use(errorHandler)

router.get("/pageNotFound", userController.pageNotFound);
router.get("/", checkBlockStatus, userController.loadHomepage);
router.get("/home", checkBlockStatus, userController.loadHomepage);
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

//Product Management
router.get("/productDetails", productController.productDetails);


//Profile Management
router.get('/forgot-password', profileController.getForgotPassPage);
router.post('/forgot-email-valid', profileController.forgotEmailValid);
router.get('/forgot-email-valid', profileController.getEmailVerificationPage);
router.post('/verify-passForgot-otp', profileController.verifyForgotPassOtp);
router.get('/reset-password', profileController.getResetPassPage);

module.exports = router;
