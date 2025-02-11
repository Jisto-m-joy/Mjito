const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();

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
  
  const updateUserName = async (req, res, next) => {
    try {
      const userId = req.session.user._id;
      const { name } = req.body;
  
      const user = await User.findByIdAndUpdate(
        userId,
        { $set: { name } },
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
      
      const { newPassword } = req.body;
      if (!newPassword) {
        return res.status(400).json({ success: false, message: "All fields are required" });
      }
  
      const hashedPassword = await bcrypt.hash(newPassword, 10);
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
  
  const updateAddress = async (req, res, next) => {
    try {
      const userId = req.session.user._id;
      const addressId = req.params.addressId;
      const updatedAddress = {
        fullName: req.body.fullName,
        phone: Number(req.body.phone),
        altPhone: Number(req.body.altPhone || req.body.phone),
        address: req.body.address,
        landmark: req.body.landmark || "",
        city: req.body.city,
        state: req.body.state,
        pincode: req.body.pincode,
        addressType: req.body.addressType,
      };
  
      const userAddress = await Address.findOneAndUpdate(
        { userId, "address._id": addressId },
        { $set: { "address.$": updatedAddress } },
        { new: true }
      );
  
      if (!userAddress) {
        return res.status(404).json({ success: false, message: "Address not found" });
      }
  
      res.json({ success: true, address: updatedAddress });
    } catch (error) {
      console.error("Address update error:", error);
      res.status(500).json({ success: false, message: error.message || "Error updating address" });
    }
  };
  
  const getAddressById = async (req, res, next) => {
    try {
      const userId = req.session.user._id;
      const addressId = req.params.addressId;
  
      const userAddress = await Address.findOne({ userId, "address._id": addressId }, { "address.$": 1 });
  
      if (!userAddress) {
        return res.status(404).json({ success: false, message: "Address not found" });
      }
  
      res.json({ success: true, address: userAddress.address[0] });
    } catch (error) {
      console.error("Error fetching address:", error);
      res.status(500).json({ success: false, message: error.message || "Error fetching address" });
    }
  };

  const deleteAddress = async (req, res, next) => {
    try {
      const userId = req.session.user._id;
      const addressId = req.params.addressId;
  
      const userAddress = await Address.findOneAndUpdate(
        { userId },
        { $pull: { address: { _id: addressId } } },
        { new: true }
      );
  
      if (!userAddress) {
        return res.status(404).json({ success: false, message: "Address not found" });
      }
  
      res.json({ success: true, message: "Address deleted successfully" });
    } catch (error) {
      console.error("Address deletion error:", error);
      res.status(500).json({ success: false, message: error.message || "Error deleting address" });
    }
  };
  

module.exports = {
  loadUserProfile,
  addAddress,
  updateUserProfile,
  resetPassword,
  loadUserAddress,
  updateAddress,
  deleteAddress,
  getAddressById,
  updateUserName
};
