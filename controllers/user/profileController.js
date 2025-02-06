const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();

function generateOtp() {
  const digits = "1234567890";
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
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

const getForgotPassPage = async (req, res, next) => {
  try {
    res.render("forgot-password");
  } catch (error) {
    next(error);
  }
};

const forgotEmailValid = async (req, res, next) => {
  try {
    const { email } = req.body;
    const findUser = await User.findOne({ email: email });
    if (findUser) {
      const otp = generateOtp();
      const emailSent = await sendVerificationEmail(email, otp);

      if (emailSent) {
        req.session.userData = {
          userOtp: otp,
          email: email,
        };
        req.session.save((err) => {
          if (err) {
            return next(err);
          }
          res.render("forgotPass-otp");
        });
        console.log("OTP generated and session saved:", otp); // Debugging line
      } else {
        res.json({
          success: false,
          message: "Failed to send OTP, Please try again",
        });
      }
    } else {
      res.render("forgot-password", {
        message: "User with this email does not exist",
      });
    }
  } catch (error) {
    next(error);
  }
};

const verifyForgotPassOtp = async (req, res, next) => {
  try {
    const enteredOtp = req.body.otp;
    if (req.session.userData && enteredOtp === req.session.userData.userOtp) {
      res.json({ success: true, redirectUrl: "/reset-password" });
    } else {
      res.json({ success: false, message: "OTP not matching" });
    }
  } catch (error) {
    next(error);
  }
};

const getEmailVerificationPage = async (req, res, next) => {
  try {
    res.render("forgotPass-otp");
  } catch (error) {
    next(error);
  }
};

const getResetPassPage = async (req, res, next) => {
  try {
    res.render("reset-password");
  } catch (error) {
    next(error);
  }
};

const resendOtp = async (req, res, next) => {
  try {
    const otp = generateOtp();
    const { email } = req.session.userData;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Session expired. Please restart the process.",
      });
    }
    req.session.userData.userOtp = otp; // Update the OTP in session data
    console.log("Resending OTP to email:", email); // Debugging line
    const emailSent = await sendVerificationEmail(email, otp);
    if (emailSent) {
      console.log("Resend OTP:", otp); // Debugging line
      res
        .status(200)
        .json({ success: true, message: "Resend OTP sent successfully" });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to send OTP. Please try again.",
      });
    }
  } catch (error) {
    console.error("Error in resending OTP:", error); // Debugging line
    next(error);
  }
};

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.error("Error in hashing password:", error); // Debugging line
    throw new Error("Error in hashing password");
  }
};

const postNewPassword = async (req, res, next) => {
    try {
      // Check if userData exists in session
      if (!req.session.userData || !req.session.userData.email) {
        return res.status(400).json({ success: false, message: 'Session expired or invalid. Please restart the process.' });
      }
      
      const { newPass1, newPass2 } = req.body;
      const email = req.session.userData.email;
  
      if (newPass1 === newPass2) {
        const passwordHash = await securePassword(newPass1);
        await User.updateOne(
          { email: email },
          { $set: { password: passwordHash } }
        );
        res.status(200).json({ success: true, message: 'Password changed successfully' });
      } else {
        res.status(400).json({ success: false, message: 'Passwords do not match' });
      }
    } catch (error) {
      res.status(500).json({ success: false, message: 'Internal server error' });
      next(error);
    }
  };


  const loadUserProfile = async (req, res, next) => {
    try {
      const userId = req.session.user._id;
      const user = await User.findById(userId);
      const addressDoc = await Address.findOne({ userId: userId });
      
      if (!user) {
        return res.redirect('/login');
      }
      
      res.render('user-profile', { 
        user: user,
        addresses: addressDoc?.address || []
      });
    } catch (error) {
      next(error);
    }
  };

  const updateUserProfile = async (req, res, next) => {
    try {
      const userId = req.session.user._id;
      const updates = req.body;
      
      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true }
      );
      
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      
      res.json({ success: true, user });
    } catch (error) {
      next(error);
    }
  };
  
  const addAddress = async (req, res, next) => {
    try {
      const userId = req.session.user._id;
      const newAddress = {
        fullName: req.body.fullName,
        phone: Number(req.body.phone),
        altPhone: Number(req.body.altPhone || req.body.phone),
        address: req.body.address,
        landmark: req.body.landmark || "",
        city: req.body.city,
        state: req.body.state,
        pincode: req.body.pincode,
        addressType: req.body.addressType
      };
  
      // Validate required fields
      const requiredFields = ['fullName', 'phone', 'address', 'city', 'state', 'pincode', 'addressType'];
      const missingFields = requiredFields.filter(field => !newAddress[field]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: `Missing required fields: ${missingFields.join(', ')}` 
        });
      }
  
      const userAddress = await Address.findOne({ userId });
      
      if (userAddress) {
        userAddress.address.push(newAddress);
        await userAddress.save();
      } else {
        await Address.create({
          userId,
          address: [newAddress]
        });
      }
      
      res.json({ success: true, address: newAddress });
    } catch (error) {
      console.error('Address creation error:', error);
      res.status(500).json({ 
        success: false, 
        message: error.message || 'Error adding address'
      });
    }
  };

const resetPassword = async (req, res, next) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) {
      return res.status(400).json({ success: false, message: "Session expired. Please restart the process." });
    }
    
    const { newPass1, newPass2 } = req.body;
    if (newPass1 !== newPass2) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    const hashedPassword = await bcrypt.hash(newPass1, 10);
    await User.findByIdAndUpdate(userId, { password: hashedPassword });

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};

const loadUserAddress = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const user = await User.findById(userId);
    const addresses = await Address.findOne({ userId: userId });

    if (!user) {
      return res.redirect('/login');
    }

    res.render('user-address', {
      user: user,
      addresses: addresses?.address || []
    });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  getForgotPassPage,
  forgotEmailValid,
  getEmailVerificationPage,
  getResetPassPage,
  verifyForgotPassOtp,
  resendOtp,
  postNewPassword,
  loadUserProfile,
  addAddress,
  updateUserProfile,
  resetPassword,
  loadUserAddress
};
