const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");

const pageerror = async (req, res) => {
  res.render("admin-error");
};

const loadLogin = async (req, res) => {
  if (req.session.admin) {
    return res.redirect("/admin/dashboard");
  }
  res.render("adminLogin", { message: null });
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const admin = await User.findOne({ email, isAdmin: true });
    if (admin) {
      const passwordMatch = bcrypt.compare(password, admin.password);
      if (passwordMatch) {
        req.session.admin = true;
        return res.redirect("/admin");
      } else {
        return res.redirect("/login");
      }
    } else {
      return res.redirect("/login");
    }
  } catch (error) {
    next(error);
  }
};

const loadDashboard = async (req, res, next) => {
  if (req.session.admin) {
    try {
      // Get total counts
      const totalUsers = await User.countDocuments({ isAdmin: false });
      const totalProducts = await Product.countDocuments();
      const totalOrders = await Order.countDocuments();
      
      // Calculate total revenue
      const orders = await Order.find();
      const totalRevenue = orders.reduce((sum, order) => sum + order.finalAmount, 0);
      
      // Get recent orders with populated data
      const recentOrders = await Order.find()
        .populate('userId', 'name')
        .populate('orderedItems.product', 'name')
        .sort({ orderDate: -1 })
        .limit(5);
        
      // Format recent orders for display
      const formattedRecentOrders = recentOrders.map(order => ({
        orderId: order.orderId,
        customerName: order.userId.name,
        productName: order.orderedItems[0].product.name,
        amount: order.finalAmount,
        status: order.status,
        date: order.orderDate.toLocaleDateString()
      }));

      // Prepare data for charts
      // Last 6 months of revenue and orders
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      
      const monthlyData = await Order.aggregate([
        {
          $match: {
            orderDate: { $gte: sixMonthsAgo }
          }
        },
        {
          $group: {
            _id: { 
              month: { $month: "$orderDate" },
              year: { $year: "$orderDate" }
            },
            revenue: { $sum: "$finalAmount" },
            orderCount: { $sum: 1 }
          }
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
      ]);

      const revenueData = monthlyData.map(data => data.revenue);
      const ordersData = monthlyData.map(data => data.orderCount);

      // Get top 3 products data
      const topProducts = await Order.aggregate([
        { $unwind: "$orderedItems" },
        {
          $group: {
            _id: "$orderedItems.product",
            totalQuantity: { $sum: "$orderedItems.quantity" }
          }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 3 },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "productInfo"
          }
        }
      ]);

      const productLabels = topProducts.map(p => p.productInfo[0].name);
      const productData = topProducts.map(p => p.totalQuantity);

      res.render("dashboard", {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue,
        recentOrders: formattedRecentOrders,
        revenueData,
        ordersData,
        productLabels,
        productData
      });
      
    } catch (error) {
      next(error);
    }
  } else {
    res.redirect('/admin/login');
  }
};

const logout = async (req, res, next) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("Error destroying session", err);
        return res.redirect("/pageerror");
      }
      res.redirect("/admin/login");
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  loadLogin,
  login,
  loadDashboard,
  pageerror,
  logout,
};
