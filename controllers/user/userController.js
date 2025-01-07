
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

    const emailSent = await sendVerificationEmail( email, otp);

    if(!emailSent){
        return res.json("email-error")
    }

    req.session.userOtp = otp;
    req.session.userData = { name, email, password};

    res.render("verify-otp");
    console.log('OTP Sent',otp);
} catch (error) {
        
    console.error('signup error',error);
    res.redirect('/pageNotFound')
    }
}

// const signup = (req, res) => {
//     const { name, email, password, confirm_password } = req.body;
//     console.log(req.body,"req-body-signup")
//     if (password !== confirm_password) {
//         return res.status(400).json({ success: false, message: "Passwords do not match" });
//     }

//     // Save user data in session
//     req.session.userData = { name, email };
//     const otp = generateOtp();
//     req.session.userOtp = otp;

//     console.log("Session after signup:", req.session);

//     sendVerificationEmail(email, otp)
//         .then(() => {
//             // Redirect to the OTP verification page
//             res.render('verify-otp'); // Replace with your OTP page route
//         })
//         .catch((err) => {
//             console.error("Error sending OTP email:", err);
//             res.status(500).json({ success: false, message: "Failed to send OTP" });
//         });
// };





const securePassword = async (password) => {
    try {
        
        const passwordHash = await bcrypt.hash(password,10);

        return passwordHash;
    } catch (error) {
        
    }
}

const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
        console.log(req.body,"req-body")

        if (!req.session.userOtp || !req.session.userData) {
            return res.status(400).json({ success: false, message: "Session expired, please sign up again." });
        }

        if (otp === req.session.userOtp) {
            const user = req.session.userData;
            const passwordHash = await securePassword(user.password); // Hash the password

            const saveUserData = new User({
                name: user.name,
                email: user.email,
                password: passwordHash
            });

            await saveUserData.save(); // Save to the database
            req.session.user = saveUserData._id;
            res.json({ success: true, redirectUrl: "/" });
        } else {
            res.status(400).json({ success: false, message: "Invalid OTP, please try again." });
        }
    } catch (error) {
        console.error("Error Verifying OTP", error);
        res.status(500).json({ success: false, message: "An error occurred." });
    }
};



const resendOtp = async (req, res) => {
    try {
        console.log("Session Data on Resend OTP:", req.session.userData);

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