
const User = require("../../models/userSchema");
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt"); 


const loadSignup = async (req, res) => {
    try {
        return res.render('signup');
    } catch (error) {
        console.log('Signup Page not loading:', error);
        res.status(500).send('Server Error');
    }
}


const pageNotFound = async(req, res) => {
    try {
        res.render("page-404");
    } catch (error) {
        res.redirect("/pageNotFound")
    }
}


const loadHomepage = async(req, res) => {
    try {
        return res.render('home');
    } catch (error) {
        console.log('Home Page not found');
        res.status(500).send('Server error')
    }
}

function generateOtp(){
    return Math.floor(100000 + Math.random()*900000).toString();
}

async function sendVerificationEmail(email, otp) {
    console.log("sendVerificationEmail called with:", email, otp);   

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
        console.error("Invalid or missing email address:", email);
        return false;
    }

    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
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
        console.error("Error sending email", error);
        return false;
    }
}


const signup = async ( req, res) => {
    try {
        
    const { name, email, password, confirm_password } = req.body;

    if(password !== confirm_password){
        return res.render("signup", {message: "Passwords do not match"});
    }

    const findUser = await User.findOne({ email });
    if(findUser){
        return res.render("signup", {message: "User with this email already exists"});
    }

    const otp = generateOtp();
    // req.session.userOtp = otp;
    // req.session.userData = { name, email, password };

    const emailSent = await sendVerificationEmail( email, otp);
    console.log(emailSent,"EMAIL SENT")

    if(!emailSent){
        // return res.json("email-error")
        return res.render("signup", { message: "Failed to send verification email. Please try again." });

    }

    req.session.userOtp = otp;
    req.session.userData = { name, email, password};

    console.log("Session Data during signup:", req.session.userData);
    res.render("verify-otp");
    console.log('OTP Sent',otp);
} catch (error) {
        
    console.error('Signup error:',error);
    res.redirect('/pageNotFound')
    }
}


const securePassword = async (password) => {
    try {
        
        const passwordHash = await bcrypt.hash(password,10);

        return passwordHash;
    } catch (error) {
        
    }
}

const verifyOtp = (req, res) => {
    try {
      const userOtp = req.body.otp; // Get OTP from user input
      const sessionOtp = req.session.otp; // OTP stored in session
  
      if (!userOtp || !sessionOtp) {
        return res.status(400).send("OTP not found. Please try again.");
      }
  
      // Check if OTP matches
      if (userOtp === sessionOtp) {
        // Clear OTP from session after successful verification
        req.session.otp = null;
        return res.redirect("/signup-success"); // Adjust the redirect route as needed
      } else {
        return res.status(400).send("Invalid OTP. Please try again.");
      }
    } catch (error) {
      console.error("Error Verifying OTP", error);
      return res.status(500).send("Internal Server Error");
    }
  };
  



const resendOtp = async (req, res) => {

    console.log("Session Data during OTP resend:", req.session.userData);

    try {

        const userData = req.session.userData;
        console.log("Resend OTP User Data:", userData); 
        if (!userData || !userData.email) {
            return res.status(400).json({ success: false, message: "Email not found in session" });
        }

        const otp = generateOtp();
        req.session.userOtp = otp;

        const emailSent = await sendVerificationEmail(userData.email, otp);
        if (emailSent) {
            console.log("Resend OTP: ", otp);
            res.status(200).json({ success: true, message: "OTP Resent Successfully" });
        } else {
            res.status(500).json({ success: false, message: "Failed to resend OTP. Please try again" });
        }
    } catch (error) {
        console.error("Error resending OTP", error);
        res.status(500).json({ success: false, message: "Internal Server Error. Please try again" });
    }
};




module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    signup,
    verifyOtp,
    resendOtp
}