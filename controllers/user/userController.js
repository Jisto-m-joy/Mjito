const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const Banner = require("../../models/bannerSchema");
const Wishlist = require("../../models/wishlistSchema");
const walletController = require('../../controllers/user/walletController');
const Cart = require("../../models/cartSchema");
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const { name, render } = require("ejs");

const generateReferralCode = async () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let referralCode;
  let isUnique = false;

  while (!isUnique) {
    referralCode = '';
    for (let i = 0; i < 8; i++) {
      referralCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    // Check if the referral code already exists
    const existingUser = await User.findOne({ referralCode });
    if (!existingUser) {
      isUnique = true;
    }
  }
  return referralCode;
};

const loadSignup = async (req, res, next) => {
  try {
    return res.render("signup");
  } catch (error) {
    next(error);
  }
};

const loadLogin = async (req, res, next) => {
  try {
    return res.render("login");
  } catch (error) {
    next(error);
  }
};

const pageNotFound = async (req, res, next) => {
  try {
    res.render("page-404");
  } catch (error) {
    next(error);
  }
};

const loadHomepage = async (req, res, next) => {
  try {
    const user = req.session.user;
    const categories = await Category.find({ isListed: true });
    const categoryIds = categories.map((category) => category._id);

    const baseQuery = {
      isBlocked: false,
      category: { $in: categoryIds }
    };

    // Fetch all products with category populated to get category offer
    const allProducts = await Product.find(baseQuery)
      .populate({
        path: 'category',
        select: 'categoryOffer'
      })
      .lean();

    // Process products to ensure offer consistency
    const processedProducts = allProducts.map(product => {
      const categoryOffer = product.category?.categoryOffer || 0;
      const productOffer = product.productOffer ? product.offerPercentage : 0;
      product.effectiveOffer = product.productOffer ? productOffer : categoryOffer;
      return product;
    });

    // 1. Branded Section: Highest priced product from each brand
    const brandedProducts = await getBrandedProducts(processedProducts);

    // 2. Popular Section: Highest priced products overall
    const popularProducts = [...processedProducts]
      .sort((a, b) => {
        const aPrice = Math.max(...a.combos.map(combo => combo.salesPrice));
        const bPrice = Math.max(...b.combos.map(combo => combo.salesPrice));
        return bPrice - aPrice;
      })
      .slice(0, 4);

    // 3. New Added Section: Latest products
    const newAddedProducts = [...processedProducts]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 4);

    // Fetch active banners
    const banners = await Banner.find({ 
      status: "Active",
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() }
    }).lean();

    // Prepare the final data object
    const productData = {
      branded: brandedProducts,
      popular: popularProducts,
      newAdded: newAddedProducts
    };

    if (user) {
      const userData = await User.findOne({ _id: user._id });
      return res.render("home", { 
        user: userData, 
        products: productData, 
        banners: banners 
      });
    } else {
      return res.render("home", { 
        products: productData, 
        banners: banners 
      });
    }
  } catch (error) {
    console.error('Detailed Error in loadHomepage:', error);
    next(error);
  }
};

// Helper function to get highest priced product from each brand
async function getBrandedProducts(products) {
  const brandMap = new Map();

  // Group products by brand and find highest priced product for each
  products.forEach(product => {
    const maxPrice = Math.max(...product.combos.map(combo => combo.salesPrice));
    
    if (!brandMap.has(product.brand) || 
        maxPrice > Math.max(...brandMap.get(product.brand).combos.map(combo => combo.salesPrice))) {
      brandMap.set(product.brand, product);
    }
  });

  // Convert map values to array and limit to 8 products
  return Array.from(brandMap.values()).slice(0, 4);
}

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, otp, next) {
  console.log("sendVerificationEmail called with:", email, otp);

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your account",
      text: `Your OTP is ${otp}`,
      html: `<b>Your OTP: ${otp}</b>`,
    });

    console.log("Email sent:", info.accepted); // Debugging line
    return info.accepted.length > 0;
  } catch (error) {
    next(error);
  }
}

const signup = async (req, res, next) => {
  try {
    const { name, email, password, confirm_password, referralCode } = req.body;

    if (password !== confirm_password) {
      return res.render("signup", { message: "Passwords do not match" });
    }

    const findUser = await User.findOne({ email });
    if (findUser) {
      return res.render("signup", {
        message: "User with this email already exists",
      });
    }

    // Validate referral code if provided
    let referredBy = null;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (!referrer) {
        return res.render("signup", {
          message: "Invalid referral code",
        });
      }
      referredBy = referrer._id;
    }

    const otp = generateOtp();

    const emailSent = await sendVerificationEmail(email, otp);
    console.log(emailSent, "EMAIL SENT");

    if (!emailSent) {
      return res.json("email-error");
    }

    req.session.userOtp = otp;
    req.session.userData = { name, email, password, referredBy };

    console.log("Session Data during signup:", req.session.userData);
    res.render("verify-otp");
    console.log("OTP Sent", otp);
  } catch (error) {
    next(error);
  }
};

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.error("Error securing password:", error);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const { otp } = req.body;

    if (otp === req.session.userOtp) {
      const user = req.session.userData;
      const passwordHash = await securePassword(user.password);
      
      // Generate referral code for new user
      const newReferralCode = await generateReferralCode();

      const saveUserData = new User({
        name: user.name,
        email: user.email,
        password: passwordHash,
        referralCode: newReferralCode,
        referredBy: user.referredBy || null
      });

      await saveUserData.save();

      // Check if user was referred and apply referral bonus
      let referralBonusApplied = false;
      if (user.referredBy) {
        const referrer = await User.findById(user.referredBy);
        if (referrer) {
          // Add ₹1000 to new user's wallet
          await walletController.addToWallet({
            user: saveUserData._id,
            amount: 1000,
            description: 'Referral bonus for signing up'
          });

          // Add ₹1000 to referrer's wallet
          await walletController.addToWallet({
            user: referrer._id,
            amount: 1000,
            description: 'Referral bonus for inviting a friend'
          });

          referralBonusApplied = true;
        }
      }

      req.session.user = saveUserData._id;
      res.json({ 
        success: true, 
        redirectUrl: "/home",
        referralBonusApplied // Flag to trigger SweetAlert on client side
      });
    } else {
      res
        .status(400)
        .json({ success: false, message: "Invalid OTP, Please try again" });
    }
  } catch (error) {
    next(error);
  }
};

const resendOtp = async (req, res, next) => {
  console.log("Session Data during OTP resend:", req.session.userData);

  try {
    const { email } = req.session.userData;
    if (!email) {
      return res
        .status(400)
        .json({ success: false, message: "Email not found in session" });
    }

    const otp = generateOtp();
    req.session.userOtp = otp;

    const emailSent = await sendVerificationEmail(email, otp); // Pass email and otp correctly
    if (emailSent) {
      console.log("Resend OTP:", otp);
      return res
        .status(200)
        .json({ success: true, message: "OTP Resent Successfully" });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to resend OTP. Please try again.",
      });
    }
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.render("login", { message: "User not found" });
    }

    if (user.isBlocked) {
      return res.render("login", { message: "User is blocked by admin" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.render("login", { message: "Invalid password" });
    }

    // Check if user has a referralCode, generate one if not
    if (!user.referralCode) {
      const newReferralCode = await generateReferralCode();
      await User.updateOne({ _id: user._id }, { $set: { referralCode: newReferralCode } });
    }

    req.session.user = user;
    res.redirect("/");
  } catch (error) {
    next(error);
  }
};

const logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).send("Server error");
    }
    res.redirect("/login");
  });
};


const loadShopingPage = async (req, res, next) => {
  try {
    const user = req.session.user;
    const userData = await User.findOne({ _id: user });
    const categories = await Category.find({ isListed: true });
    const brands = await Brand.find({ isBlocked: false });
    const categoryIds = categories.map((category) => category._id.toString());
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;

    const sizes = [5, 6, 7, 8, 9, 10, 11, 12, 13];
    const colors = ["Red", "Blue", "Green", "Yellow", "Black", "White"];

    const { category, brand, price, size, color, sort, search } = req.query;

    let productQuery = {
      isBlocked: false,
      category: { $in: categoryIds },
    };

    if (category) productQuery.category = category;
    if (brand) productQuery.brand = brand;
    if (price) {
      const [minPrice, maxPrice] = price.split('-').map(Number);
      productQuery['combos.salesPrice'] = { $gte: minPrice, $lte: maxPrice };
    }
    if (size) productQuery['combos.size'] = size;
    if (color) productQuery['combos.color'] = color;
    if (search) {
      productQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    let sortOption = { createdAt: -1 };
    if (sort) {
      switch (sort) {
        case 'price-asc': sortOption = { 'combos.0.salesPrice': 1 }; break;
        case 'price-desc': sortOption = { 'combos.0.salesPrice': -1 }; break;
        case 'name-asc': sortOption = { name: 1 }; break;
        case 'name-desc': sortOption = { name: -1 }; break;
        case 'new-arrivals': sortOption = { createdAt: -1 }; break;
        case 'old-arrivals': sortOption = { createdAt: 1 }; break;
        default: sortOption = { createdAt: -1 };
      }
    }

    const products = await Product.find(productQuery)
      .populate('category') // Populate category to get categoryOffer
      .sort(sortOption)
      .limit(limit)
      .skip(skip)
      .lean(); // Convert to plain JS object

    const totalProducts = await Product.countDocuments(productQuery);
    const totalPages = Math.ceil(totalProducts / limit);

    res.render("shop", {
      user: userData,
      categories,
      brands,
      products,
      totalPages,
      currentPage: page,
      sizes,
      colors,
      search,
      query: req.query,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  loadHomepage,
  pageNotFound,
  loadSignup,
  loadLogin,
  signup,
  verifyOtp,
  resendOtp,
  login,
  logout,
  loadShopingPage,
};
