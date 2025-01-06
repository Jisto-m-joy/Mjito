const express = require("express");
const router = express.Router();
const userController = require('../controllers/user/userController');
const passport = require("passport");


router.get("/pageNotFound", userController.pageNotFound);
router.get('/',userController.loadHomepage);
router.get("/signup", userController.loadSignup)
router.post("/signup", userController.signup);
router.post("/verify-otp",userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);

router.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'consent', // Forces the consent screen
    access_type: 'offline' // Requests a refresh token
}));

router.get('/auth/google/callback',passport.authenticate('google',{ failureRedirect: '/signup'}), (req, res)=> {
    res.redirect('/')
});



module.exports = router;