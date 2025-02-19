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
        customerName: order.userId ? order.userId.name : 'Unknown Customer',
        productName: order.orderedItems.length > 0 && order.orderedItems[0].product ? order.orderedItems[0].product.name : 'Unknown Product',
        amount: order.finalAmount,
        status: order.status,
        date: order.orderDate.toLocaleDateString()
      }));

      // Prepare data for charts - last 6 months of revenue and orders
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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

      // Setup default data for the past 6 months
      const last6Months = [];
      for (let i = 0; i < 6; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        last6Months.unshift({ month: d.getMonth() + 1, year: d.getFullYear() });
      }

      // Initialize arrays with zeros
      const revenueData = new Array(6).fill(0);
      const ordersData = new Array(6).fill(0);

      // Fill in actual data where it exists
      monthlyData.forEach(data => {
        const month = data._id.month;
        const year = data._id.year;
        
        // Find the position in our last6Months array
        const index = last6Months.findIndex(m => m.month === month && m.year === year);
        if (index !== -1) {
          revenueData[index] = data.revenue;
          ordersData[index] = data.orderCount;
        }
      });

      // Create labels for the chart
      const chartLabels = last6Months.map(m => monthNames[m.month - 1]);

      // Get top 3 products data (handling the case with no products)
      let productLabels = [];
      let productData = [];

      try {
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
          },
          { $match: { "productInfo.0": { $exists: true } } }
        ]);

        if (topProducts.length > 0) {
          productLabels = topProducts.map(p => p.productInfo[0]?.name || 'Unknown Product');
          productData = topProducts.map(p => p.totalQuantity);
        } else {
          productLabels = ['No Products'];
          productData = [100];
        }
      } catch(err) {
        console.error('Error fetching top products:', err);
        productLabels = ['Error'];
        productData = [100];
      }

      console.log('Sending to frontend:', {
        revenueData,
        ordersData,
        chartLabels,
        productLabels,
        productData
    });

      res.render("dashboard", {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue,
        recentOrders: formattedRecentOrders,
        // Add a chartData object to contain all chart-related data
        chartData: {
            revenueData,
            ordersData,
            chartLabels,
            productLabels,
            productData
        }
    });
      
    } catch (error) {
      console.error("Dashboard Error:", error);
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
