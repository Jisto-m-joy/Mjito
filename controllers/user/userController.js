
const User = require("../../models/userSchema");
const env = require("dotenv").config();
const nodemailer = require('nodemailer');
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

async function sendVerificationEmail(email,otp) {
    try {

        const transporter = nodemailer.createTransport({
            service : 'gmail',
            port : 587,
            secure : false,
            requireTLS : true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await transporter.sendMail({
            from : process.env.NODEMAILER_EMAIL,
            to : email,
            subject: "Verify your account",
            text : `Your OTP is ${otp}`,
            html : `<b>Your OTP : ${otp}</b>`,
        })
        
        return info.accepted.length > 0


    } catch (error) {
        console.error("Error sending email", error);
        return false;
    }
}

const signup = async (req, res) => {
    try {

        const { first_name, last_name, email, password, confirm_password } = req.body;

        if( password !== confirm_password){
            return res.send("signup",{ message: "Passwords do not match"});
        }

        const findUser = await User.findOne({ email });
        if(findUser){
            return res.render("signup", { message: "User with this email already exists"});
        }

        const otp = generateOtp();

        const emailSent = await sendVerificationEmail(email,otp);

        if(!emailSent){
            return res.json("email.error")
        }

        req.session.userOtp = otp;
        req.session.userData = { first_name, last_name, email, password };

        res.render('verify-otp');
        console.log('OTP Sent',otp);
        
    } catch (error) {

        console.error('signup error', error);
        res.redirect('/pageNotFound')
        
    }
}

const securePassword = async (password) => {
    try {
        
        const passwordHash = await
    } catch (error) {
        
    }
}

const verifyOtp = async (req,res) => {
    try {
        
        const {otp} = req.body;

        console.log(otp);

        if(otp === req.session.userOtp){
            const user = req.session.userData
            const passwordHash = await securePassword(user.password);
        }
    } catch (error) {
        
    }
}

// const signup = async (req, res) => {
//     const { first_name, last_name, email, password } = req.body;
//     console.log(req.body)
//     try {

//         const newUser = new User({first_name,last_name,email,password});
//         console.log(newUser);

//         await newUser.save();

//         return res.redirect("/home")
        
//     } catch (error) {

//         console.error("Error for save user", error);
//         res.status(500).send("Internal server error");
        
//     }
// }


module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    signup
}