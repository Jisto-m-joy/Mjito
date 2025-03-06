const mongoose = require("mongoose");
const User = require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

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

          // Prepare data for charts - default to yearly
          const monthlyData = await getMonthlyData('yearly');
          const { revenueData, ordersData, chartLabels } = monthlyData;

          // Get top data
          const topProducts = await getTopProductsData();
          const topCategories = await getTopCategoriesData();
          const topBrands = await getTopBrandsData();

          res.render("dashboard", {
              totalUsers,
              totalProducts,
              totalOrders,
              totalRevenue,
              recentOrders: formattedRecentOrders,
              chartData: {
                  revenueData,
                  ordersData,
                  chartLabels,
                  topProductLabels: topProducts.productLabels,
                  topProductData: topProducts.productData,
                  topCategoryLabels: topCategories.categoryLabels,
                  topCategoryData: topCategories.categoryData,
                  topBrandLabels: topBrands.brandLabels,
                  topBrandData: topBrands.brandData
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

const getChartData = async (req, res) => {
  try {
      const range = req.query.range || 'yearly';
      const chartData = await getMonthlyData(range);
      res.json(chartData);
  } catch (error) {
      console.error("Error fetching chart data:", error);
      res.status(500).json({ error: "Failed to fetch chart data" });
  }
};

const downloadReport = async (req, res) => {
  try {
      const { reportType, reportFormat, startDate, endDate } = req.query;
      const { startDate: start, endDate: end } = getDateRange(reportType, startDate, endDate);

      // Get orders data
      const orders = await Order.find({
        orderDate: { $gte: start, $lte: end }
    }).populate('userId', 'name').sort({ orderDate: -1 });  // Sort by date ascending

      // Process data for report
      const reportData = orders.map(order => ({
        orderId: order.orderId,
        date: order.orderDate.toLocaleDateString(),
        customerName: order.userId?.name || 'Unknown',
        status: order.status,
        revenue: order.finalAmount || 0,
        orders: 1,
        productsSold: order.orderedItems ? 
            order.orderedItems.reduce((sum, item) => sum + (item.quantity || 0), 0) : 0
    }));

      // Group data by date
      const groupedData = reportData.reduce((acc, curr) => {
        const date = curr.date;
        if (!acc[date]) {
            acc[date] = {
                date: date,
                orderId: curr.orderId,  // Include orderId
                customerName: curr.customerName,  // Include customerName
                status: curr.status,    // Include status
                orders: 0,
                revenue: 0,
                productsSold: 0
            };
        }
        acc[date].orders += curr.orders;
        acc[date].revenue += curr.revenue;
        acc[date].productsSold += curr.productsSold;
        return acc;
    }, {});

      // Convert grouped data back to array
      const finalReportData = Object.values(groupedData);

      // Generate report based on format
      if (reportFormat === 'excel') {
            const workbook = await generateExcelReport(reportData, reportType); // Use reportData instead of finalReportData
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=sales_report_${reportType}.xlsx`);
            await workbook.xlsx.write(res);
            res.end();
        } else if (reportFormat === 'pdf') {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=sales_report_${reportType}.pdf`);
            const doc = generatePDFReport(finalReportData, reportType);
            doc.pipe(res);
            doc.end();
        }
  } catch (error) {
      console.error('Report generation error:', error);
      res.status(500).json({ error: 'Failed to generate report' });
  }
};

// Helper functions
const getDateRange = (reportType, startDate, endDate) => {
  const endDateTime = new Date();
  let startDateTime = new Date();
  
  switch(reportType) {
      case 'daily':
          startDateTime.setDate(startDateTime.getDate() - 1);
          break;
      case 'weekly':
          startDateTime.setDate(startDateTime.getDate() - 7);
          break;
      case 'yearly':
          startDateTime.setFullYear(startDateTime.getFullYear() - 1);
          break;
      case 'custom':
          if (startDate && endDate) {
              startDateTime = new Date(startDate);
              endDateTime.setTime(new Date(endDate).getTime() + 86399999); // Set to end of day
          }
          break;
  }
  
  return { startDate: startDateTime, endDate: endDateTime };
};

const generateExcelReport = async (data, reportType) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sales Report');

  // Headers matching the PDF report
  worksheet.addRow(['Order ID', 'Date', 'Customer', 'Status', 'Amount']);

  // Detailed order data
  data.forEach(row => {
      worksheet.addRow([row.orderId, row.date, row.customerName, row.status, row.revenue]);
  });

  worksheet.getRow(1).font = { bold: true };
  worksheet.columns.forEach(column => {
      column.width = 20; // Adjust width for better readability
  });

  return workbook;
};

const generatePDFReport = (data, reportType, startDate, endDate) => {
  const doc = new PDFDocument();
  
  // Title
  doc.fontSize(20).text('GoalZone Sales Report', {
      align: 'center'
  });
  
  // Report details
  doc.fontSize(12).moveDown();
  doc.text(`Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`, {
      align: 'center'
  });
  doc.text(`Generated Date: ${new Date().toLocaleDateString()}`, {
      align: 'center'
  });
  
  // Period dates
  const periodStart = data[0]?.date || '';
  const periodEnd = data[data.length - 1]?.date || '';
  doc.text(`Period: ${periodStart} to ${periodEnd}`, {
      align: 'center'
  });

  // Summary section
  doc.moveDown();
  doc.text('Summary:', {
      align: 'center'
  });
  const totalOrders = data.reduce((sum, row) => sum + row.orders, 0);
  const totalRevenue = data.reduce((sum, row) => sum + row.revenue, 0);
  doc.text(`Total Orders: ${totalOrders}`, {
      align: 'center'
  });
  doc.text(`Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}`, {
    align: 'center'
  });

 // Table headers
  doc.moveDown();
  const tableTop = 250;

  // Draw headers with increased spacing
  doc.fontSize(12).text('Order ID', 50, tableTop);  
  doc.text('Date', 200, tableTop);  
  doc.text('Customer', 300, tableTop);  
  doc.text('Status', 400, tableTop);  
  doc.text('Amount', 500, tableTop);  

  // Draw line under headers
  doc.lineWidth(1)
    .moveTo(50, tableTop + 20)
    .lineTo(600, tableTop + 20)  
    .stroke();

  // Order data
  let yPosition = tableTop + 40;  

  // Use the data passed from downloadReport function
  data.forEach(row => {
    doc.fontSize(10);
    doc.text(row.orderId || '', 50, yPosition, { width: 150 });  
    doc.text(row.date || '', 200, yPosition, { width: 100 });  
    doc.text(row.customerName || 'Unknown', 300, yPosition, { width: 100 });
    doc.text(row.status || '', 400, yPosition, { width: 100 });
    doc.text(`₹${row.revenue.toLocaleString('en-IN')}`, 500, yPosition, { width: 100 });
    
    // Draw light line between rows
    yPosition += 30;  
    doc.lineWidth(0.5)
      .moveTo(50, yPosition - 5)
      .lineTo(600, yPosition - 5)  
      .stroke();
  });

  return doc;
};

  async function getMonthlyData(range = 'yearly') {
    const now = new Date();
    let startDate;

    switch (range) {
        case 'weekly':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
        case 'monthly':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
        case 'yearly':
        default:
            startDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
    }

    const orders = await Order.aggregate([
        { $match: { orderDate: { $gte: startDate, $lte: new Date() } } },
        {
            $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$orderDate" } },
                totalRevenue: { $sum: "$finalAmount" }, // Ensure finalAmount is the correct field
                totalOrders: { $sum: 1 }
            }
        },
        { $sort: { "_id": 1 } }
    ]);

    const chartLabels = orders.map(item => item._id);
    const revenueData = orders.map(item => item.totalRevenue || 0); // Default to 0 if null
    const ordersData = orders.map(item => item.totalOrders || 0); // Default to 0 if null

    return { chartLabels, revenueData, ordersData };
  }

  async function getTopProductsData() {
    const topProducts = await Order.aggregate([
        { $unwind: "$orderedItems" },
        {
            $group: {
                _id: "$orderedItems.product",
                totalQuantity: { $sum: "$orderedItems.quantity" },
                totalRevenue: { $sum: { $multiply: ["$orderedItems.quantity", "$orderedItems.price"] } }
            }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 },
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "product"
            }
        }
    ]);

    const productLabels = topProducts.map(p => p.product[0]?.name || 'Unknown Product');
    const productData = topProducts.map(p => p.totalQuantity);

    return { productLabels, productData };
  }

  async function getTopCategoriesData() {
    const topCategories = await Order.aggregate([
        { $unwind: "$orderedItems" },
        {
            $lookup: {
                from: "products",
                localField: "orderedItems.product",
                foreignField: "_id",
                as: "product"
            }
        },
        { $unwind: "$product" },
        {
            $group: {
                _id: "$product.category",
                totalQuantity: { $sum: "$orderedItems.quantity" }
            }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 },
        {
            $lookup: {
                from: "categories",
                localField: "_id",
                foreignField: "_id",
                as: "category"
            }
        }
    ]);

    const categoryLabels = topCategories.map(c => c.category[0]?.name || 'Unknown Category');
    const categoryData = topCategories.map(c => c.totalQuantity);

    return { categoryLabels, categoryData };
  }

  async function getTopBrandsData() {
    const topBrands = await Order.aggregate([
        { $unwind: "$orderedItems" },
        {
            $lookup: {
                from: "products",
                localField: "orderedItems.product",
                foreignField: "_id",
                as: "product"
            }
        },
        { $unwind: "$product" },
        {
            $group: {
                _id: "$product.brand",
                totalQuantity: { $sum: "$orderedItems.quantity" }
            }
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 }
    ]);

    const brandLabels = topBrands.map(b => b._id || 'Unknown Brand');
    const brandData = topBrands.map(b => b.totalQuantity);

    return { brandLabels, brandData };
  }

module.exports = {
    loadDashboard,
    downloadReport,
    generateExcelReport,
    generatePDFReport,
    getChartData
};