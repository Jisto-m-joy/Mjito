const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");


const loadLogin = async (req, res) => {
    if(req.session.admin){
        return res.redirect('/admin/dashboard');
    }
    res.render('adminLogin',{message: null});
}


module.exports = {
    loadLogin
}