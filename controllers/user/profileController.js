const User = require("../../models/userSchema");
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
      return res
        .status(400)
        .json({
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
      res
        .status(500)
        .json({
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
    const { newPass1, newPass2 } = req.body;
    const email = req.session.userData.email; 

    if (newPass1 === newPass2) {
      const passwordHash = await securePassword(newPass1);
      await User.updateOne(
        { email: email },
        { $set: { password: passwordHash } }
      );
      res.redirect("/login");
    } else {
      res.render("reset-password", {
        message: "Passwords do not match",
      });
    }
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
};
