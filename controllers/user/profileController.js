const User = require('../../models/userSchema');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt')
const env = require('dotenv').config();
const session = require("express-session");

function generateOtp(){
    const digits = '1234567890';
    let otp = '';
    for(let i = 0; i < 6; i++){
        otp+=digits[Math.floor(Math.random()*10)];
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
        const {email} = req.body;
        const findUser = await User.findOne({email: email});
        if(findUser){
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email,otp);
            
            if(emailSent){
                req.session.userOtp = otp;
                req.session.email = email;
                res.render('forgotPass-otp');
                console.log("OTP:", otp);
            }else {
                res.json({success: false, message: "Failed to send OTP, Please try again"});
            }
        }else {
            res.render('forgot-password', {
                message: 'User with this email does not exist'
            })
        }
    } catch (error) {
        next(error);
    }
}

const getEmailVerificationPage = async (req, res, next) => {
    try {
        res.render("forgotPass-otp");
    } catch (error) {
        next(error);
    }
};

const verifyForgotPassOtp = async (req, res, next) => {
    try {
        const enteredOtp = req.body.otp;
        if(enteredOtp === req.session.userOtp){
            res.json({ success: true, redirectUrl: '/reset-password' });
        }else {
            res.json({ success: false, message: 'OTP not matching'});
        }
    } catch (error) {
        next(error);
    }
}
 

const getResetPassPage = async (req, res, next) => {
    try {
        res.render('reset-password');
    } catch (error) {
        next(error)
    }
}



module.exports = {
    getForgotPassPage,
    forgotEmailValid,
    getEmailVerificationPage,
    verifyForgotPassOtp,
    getResetPassPage
}