
const User = require("../../models/userSchema")


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

const signup = async (req, res) => {
    const { first_name, last_name, email, password } = req.body;
    console.log(req.body)
    try {

        const newUser = new User({first_name,last_name,email,password});
        console.log(newUser);

        await newUser.save();

        return res.redirect("/home")
        
    } catch (error) {

        console.error("Error for save user", error);
        res.status(500).send("Internal server error");
        
    }
}

module.exports = {
    loadHomepage,
    pageNotFound,
    loadSignup,
    signup
}