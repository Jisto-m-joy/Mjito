const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const passport = require("passport");
const validateSession = require("../middlewares/session-validation");
const {
  userAuth,
  adminAuth,
  checkBlockStatus,
} = require("../middlewares/auth");
const productController = require("../controllers/user/productController");
const app = express();

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

router.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "consent", // Forces the consent screen
    access_type: "offline", // Requests a refresh token
  })
);

router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login-signup" }),
  (req, res) => {
    res.redirect("/");
  }
);

//Product Management
router.get("/productDetails", productController.productDetails);

module.exports = router;
