const User = require("../../models/userSchema");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Brand = require("../../models/brandSchema");
const Cart = require("../../models/cartSchema");
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const { name, render } = require("ejs");

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

    const productQuery = {
      isBlocked: false,
      category: { $in: categoryIds }
    };

    const allProducts = await Product.find(productQuery)
      .populate('category')
      .lean(); // For better performance and easier debugging


    // Sort and limit products
    let productData = allProducts
      .sort((a, b) => new Date(b.createdOn || b.createdAt) - new Date(a.createdOn || a.createdAt))
      .slice(0, 4);

    if (user) {
      const userData = await User.findOne({ _id: user._id });
      return res.render("home", { user: userData, products: productData });
    } else {
      return res.render("home", { products: productData });
    }
  } catch (error) {
    console.error('Detailed Error in loadHomepage:', error);
    next(error);
  }
};


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
    const { name, email, password, confirm_password } = req.body;

    if (password !== confirm_password) {
      return res.render("signup", { message: "Passwords do not match" });
    }

    const findUser = await User.findOne({ email });
    if (findUser) {
      return res.render("signup", {
        message: "User with this email already exists",
      });
    }

    const otp = generateOtp();

    const emailSent = await sendVerificationEmail(email, otp);
    console.log(emailSent, "EMAIL SENT");

    if (!emailSent) {
      return res.json("email-error");
    }

    req.session.userOtp = otp;
    req.session.userData = { name, email, password };

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

    console.log(otp);

    if (otp === req.session.userOtp) {
      const user = req.session.userData;
      const passwordHash = await securePassword(user.password);

      const saveUserData = new User({
        name: user.name,
        email: user.email,
        password: passwordHash,
      });

      await saveUserData.save();
      req.session.user = saveUserData._id;
      res.json({ success: true, redirectUrl: "/home" });
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

    if (category) {
      productQuery.category = category;
    }
    if (brand) {
      productQuery.brand = brand;
    }
    if (price) {
      const [minPrice, maxPrice] = price.split('-').map(Number);
      productQuery['combos.salesPrice'] = { $gte: minPrice, $lte: maxPrice };
    }
    if (size) {
      productQuery['combos.size'] = size;
    }
    if (color) {
      productQuery['combos.color'] = color;
    }
    if (search) {
      productQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    let sortOption = { createdAt: -1 }; // Default sort by newest first
    if (sort) {
      switch(sort) {
        case 'price-asc':
          sortOption = { 'combos.0.salesPrice': 1 };
          break;
        case 'price-desc':
          sortOption = { 'combos.0.salesPrice': -1 };
          break;
        case 'name-asc':
          sortOption = { name: 1 };
          break;
        case 'name-desc':
          sortOption = { name: -1 };
          break;
        case 'new-arrivals':
          sortOption = { createdAt: -1 };
          break;
        case 'old-arrivals':
          sortOption = { createdAt: 1 };
          break;
        default:
          sortOption = { createdAt: -1 };
      }
    }

    const products = await Product.find(productQuery)
      .sort(sortOption)
      .limit(limit)
      .skip(skip);

    const totalProducts = await Product.countDocuments(productQuery);
    const totalPages = Math.ceil(totalProducts / limit);

    res.render("shop", {
      user: userData,
      categories: categories,
      brands: brands,
      products: products,
      totalPages: totalPages,
      currentPage: page,
      sizes: sizes,
      colors: colors,
      search: search,
      query: req.query
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
