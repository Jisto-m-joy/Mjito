const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const walletController = require('../../controllers/user/walletController');
const PDFKit = require('pdfkit');
const razorpay = require('../../config/razorpay');
const crypto = require('crypto');

const loadMyOrders = async (req, res, next) => {
  try {
    const userId = req.session.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // Orders per page
    
    // Fetch orders with pagination and populate necessary fields
    const totalOrders = await Order.countDocuments({ userId });
    const totalPages = Math.ceil(totalOrders / limit);
    
    const orders = await Order.find({ userId })
      .populate({
        path: 'orderedItems.product',
        select: 'name images' 
      })
      // .populate('address')
      .sort({ orderDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Format orders for the template
    const formattedOrders = orders.map(order => ({
      orderId: order.orderId,
      placedOn: order.orderDate.toLocaleDateString(),
      status: order.status, // Use raw string status instead of getOrderStatus
      totalAmount: order.finalAmount,
      quantity: order.orderedItems.reduce((sum, item) => sum + item.quantity, 0),
      products: order.orderedItems.map(item => ({
        _id: item.product?._id || null,
        name: item.product?.name || 'Product Not Found',
        image: item.product?.images?.[0] || '/placeholder-image.jpg',
        quantity: item.quantity
      })),
      cancellation_reason: order.cancellation_reason,
      return_reason: order.return_reason
    }));

    res.render('my-orders', {
      orders: formattedOrders,
      currentPage: page,
      totalPages: totalPages
    });
    
  } catch (error) {
    next(error);
  }
};

// Helper function to convert status to number for progress bar
function getOrderStatus(status) {
  const statusMap = {
    'Pending': 1,
    'Pending COD': 1,
    'Processing': 2,
    'Shipped': 3,
    'Delivered': 4,
    'Return Request': 5,
    'Returned': 6, 
    'Cancelled': 0
  };
  return statusMap[status] || 0;
}

const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id; // Use req.user._id to match walletController
    const { cancellationReason } = req.body || {}; // Default to empty object if req.body is undefined

    // Find the order and ensure it’s not delivered (status < 4 based on your status mapping)
    const order = await Order.findOne({ orderId, userId });
    
    if (!order) {
      return res.status(400).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    // Check if order is not delivered (use numeric status from getOrderStatus)
    const currentStatus = getOrderStatus(order.status);
    if (currentStatus >= 4) { // Assuming 4 is 'Delivered'
      return res.status(400).json({ 
        success: false, 
        message: 'Order cannot be cancelled after delivery' 
      });
    }

    // Update order status and store cancellation reason
    order.status = 'Cancelled';
    order.cancellation_reason = cancellationReason || 'No reason provided';
    await order.save();

    // Restore product quantities
    for (const item of order.orderedItems) {
      const product = await Product.findById(item.product);
      if (product) {
        const combo = product.combos.find(combo => 
          combo.color === item.color && // Assuming orderedItems has color/size fields; adjust if needed
          combo.size === item.size
        );
        if (combo) {
          combo.quantity += item.quantity;
          await product.save();
        }
      }
    }

    // Refund logic: If not COD, transfer amount to user's wallet using walletController
    if (order.paymentMethod !== 'cod') {
      await walletController.addToWallet({
        user: userId, // Pass user ID as part of an object to match walletController's expected format
        amount: order.finalAmount,
        description: `Refund from order #${order.orderId}`
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in cancelOrder:', error); // Log the error for debugging
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const returnOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;
    const { returnReason } = req.body;

    const order = await Order.findOne({ orderId, userId });
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    // Check if order is delivered (status = 4)
    const currentStatus = getOrderStatus(order.status);
    if (currentStatus !== 4) {
      return res.status(400).json({ 
        success: false, 
        message: 'Only delivered orders can be returned' 
      });
    }

    // Update order status and store return reason
    order.status = 'Return Request';
    order.return_reason = returnReason || 'No reason provided';
    await order.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error in returnOrder:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const approveReturn = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Find the order
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'Return Request') {
      return res.status(400).json({ success: false, message: 'No return request pending' });
    }

    // Check if already refunded to prevent duplicate refunds
    if (order.status === 'Returned') {
      return res.status(400).json({ success: false, message: 'Order already returned and refunded' });
    }

    // Update status to Returned
    order.status = 'Returned';
    await order.save();
    console.log(`Order ${orderId} status updated to Returned`);

    // Restore product quantities
    for (const item of order.orderedItems) {
      const product = await Product.findById(item.product);
      if (product) {
        const combo = product.combos.find(combo => 
          combo.color === item.color && // Adjust based on your orderedItems schema
          combo.size === item.size
        );
        if (combo) {
          combo.quantity += item.quantity;
          await product.save();
        }
      }
    }

    // Refund to wallet if not COD (assuming COD orders don't need refunds)
    if (order.paymentMethod !== 'cod') {
      try {
        await walletController.addToWallet({
          user: order.userId.toString(), // Ensure userId is a string to match wallet schema
          amount: order.finalAmount,
          description: `Refund for returned order #${order.orderId}`
        });
        console.log(`Refund processed for order ${orderId}: ₹${order.finalAmount} added to wallet`);
      } catch (walletError) {
        console.error('Wallet update failed:', walletError);
        // Optionally revert the status change if refund fails
        order.status = 'Return Request';
        await order.save();
        return res.status(500).json({ success: false, message: 'Return approved, but refund failed: ' + walletError.message });
      }
    } else {
      console.log(`No refund processed for order ${orderId} as payment method is COD`);
    }

    res.json({ success: true, message: 'Return approved and amount refunded to wallet' });
  } catch (error) {
    console.error('Error in approveReturn:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

const getOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.session.user._id;

    const order = await Order.findOne({ orderId, userId })
      .populate({
        path: 'orderedItems.product',
        select: 'name images'
      })
      .lean();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Fetch user details (assuming you have a User model)
    const user = await User.findById(userId).select('name email phone').lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const responseData = {
      success: true,
      order: {
        orderId: order.orderId,
        orderDate: order.orderDate,
        paymentMethod: order.paymentMethod,
        finalAmount: order.finalAmount,
        userName: user.name,
        userEmail: user.email,
        userPhone: user.phone,
        shippingAddress: order.shippingAddress,
        orderedItems: order.orderedItems.map(item => ({
          product: item.product,
          price: item.price,
          quantity: item.quantity,
          size: item.size || 'N/A' // Adjust based on your schema
        })),
        status: order.status
      }
    };

    res.json(responseData);
  } catch (error) {
    console.error('Error in getOrderDetails:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const retryRazorpayPayment = async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    const userId = req.session.user._id;

    const order = await Order.findOne({ orderId, userId });
    if (!order || order.status !== 'Failed') {
      return res.status(400).json({ success: false, error: 'Invalid order or status' });
    }

    // Generate a short receipt (max 40 chars)
    const shortOrderId = orderId.slice(-8); // Take last 8 characters of orderId
    const receipt = `retry_${shortOrderId}_${Date.now().toString().slice(-4)}`; // e.g., "retry_12345678_1234"

    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: "INR",
      receipt: receipt // Use the shortened receipt
    };

    const razorpayOrder = await razorpay.orders.create(options);
    res.json({
      success: true,
      order: razorpayOrder,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Error in retryRazorpayPayment:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate payment' });
  }
};

const verifyRetryRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId
    } = req.body;
    const userId = req.session.user._id;

    // Verify payment signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_SECRET_KEY)
      .update(sign)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Invalid signature' });
    }

    // Find and update the order
    const order = await Order.findOne({ orderId, userId }).populate('orderedItems.product');
    if (!order || order.status !== 'Failed') {
      return res.status(400).json({ success: false, error: 'Invalid order or status' });
    }

    // Update product quantities
    for (const item of order.orderedItems) {
      const product = await Product.findById(item.product._id);
      if (!product) {
        return res.status(400).json({ success: false, error: `Product not found: ${item.product.name}` });
      }

      const combo = product.combos.find(c =>
        String(c.color).toLowerCase() === String(item.color || product.combos[0].color).toLowerCase() &&
        Number(c.size) === Number(item.size || product.combos[0].size)
      );

      if (!combo) {
        return res.status(400).json({ success: false, error: `No matching combo found for ${product.name}` });
      }

      if (combo.quantity < item.quantity) {
        return res.status(400).json({ success: false, error: `Insufficient stock for ${product.name}` });
      }

      await Product.updateOne(
        {
          _id: item.product._id,
          'combos': {
            $elemMatch: {
              color: combo.color,
              size: Number(combo.size),
              quantity: { $gte: item.quantity }
            }
          }
        },
        {
          $inc: { 'combos.$.quantity': -item.quantity }
        }
      );
    }

    // Update order status to Processing
    order.status = 'Processing';
    await order.save();

    res.json({ success: true });
  } catch (error) {
    console.error('Error in verifyRetryRazorpayPayment:', error);
    res.status(500).json({ success: false, error: 'Payment verification failed' });
  }
};

const downloadInvoice = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const userId = req.session.user._id;

    // Fetch the order
    const order = await Order.findOne({ orderId, userId })
      .populate({
        path: 'orderedItems.product',
        select: 'name images',
      })
      .lean();

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Fetch user details
    const user = await User.findById(userId).select('name email').lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Validate required order fields
    if (!order.shippingAddress || !order.shippingAddress.city || !order.shippingAddress.state || !order.shippingAddress.pincode || !order.shippingAddress.phone) {
      return res.status(400).json({ success: false, message: 'Incomplete shipping address in order' });
    }

    if (!order.orderedItems || order.orderedItems.length === 0) {
      return res.status(400).json({ success: false, message: 'No items found in order' });
    }

    // Create PDF
    const doc = new PDFKit({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice_${orderId}.pdf"`);
    doc.pipe(res);

    // Header Section
    doc.rect(0, 0, 612, 80).fill('#007bff'); // Blue header background
    doc.fontSize(20).fillColor('#fff').text('INVOICE', 50, 30, { align: 'center' });
    doc.fontSize(10).fillColor('#fff')
      .text(`Order ID: ${order.orderId.slice(-8)}`, 400, 20, { align: 'right' })
      .text(`Invoice Date: ${new Date().toLocaleDateString('en-GB')}`, 400, 35, { align: 'right' })
      .text(`Payment: ${(order.paymentMethod || 'N/A').toUpperCase()}`, 400, 50, { align: 'right' });

    // Company Info
    doc.fillColor('#000').fontSize(14).font('Helvetica-Bold').text('GoalZone', 50, 100);
    doc.fontSize(10).font('Helvetica')
      .text('World of Football Products', 50, 115)
      .text('123 Football Street, Malappuram', 50, 130)
      .text('Kerala, India - 679536', 50, 145)
      .text('GSTIN: 32AAALCG7E567N1ZR', 50, 160);

    // Bill To Section
    doc.fontSize(12).font('Helvetica-Bold').text('Bill To:', 400, 100);
    doc.fontSize(10).font('Helvetica')
      .text(`${user.name || 'N/A'}`, 400, 115)
      .text(`${order.shippingAddress.address}`, 400, 130)
      .text(`${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`, 400, 145)
      .text(`Phone: ${order.shippingAddress.phone}`, 400, 160)
      .text(`Email: ${user.email || 'N/A'}`, 400, 175);

    // Separator Line
    doc.moveTo(50, 195).lineTo(550, 195).stroke('#ddd');

    // Items Table Header
    doc.rect(50, 200, 500, 20).fill('#f0f0f0');
    doc.fillColor('#000').fontSize(10).font('Helvetica-Bold')
      .text('Item Description', 55, 205)
      .text('Price', 300, 205 )
      .text('Qty', 400, 205)
      .text('Total', 500, 205);

    // Items Table Rows
    let yPosition = 230;
    let subtotal = 0;
    order.orderedItems.forEach((item, index) => {
      if (!item.product || !item.product.name) {
        console.warn(`Invalid product data for order ${orderId}:`, item);
        return;
      }
      const itemTotal = (item.price || 0) * (item.quantity || 1);
      subtotal += itemTotal;

      doc.font('Helvetica').fillColor('#000').fontSize(10)
        .text(`${index + 1}. ${item.product.name}`, 55, yPosition)
        .text(`₹${(item.price || 0).toFixed(2)}`, 300, yPosition)
        .text(`${item.quantity || 1}`, 400, yPosition)
        .text(`₹${itemTotal.toFixed(2)}`, 500, yPosition);

      yPosition += 20;
      if (yPosition > 700) { // Handle page overflow
        doc.addPage();
        yPosition = 50;
      }
    });

    // Separator Line
    doc.moveTo(50, yPosition + 10).lineTo(550, yPosition + 10).stroke('#ddd');

    // Totals Section
    const totalsY = yPosition + 20;
    const discount = order.discount || 0;
    const gst = (subtotal - discount) * 0.18; // 18% GST as per image
    const grandTotal = subtotal - discount + gst;

    // Increase box height to 140px and adjust spacing to prevent collision
    doc.rect(300, totalsY, 250, 140).fill('#f8f9fa');
    doc.fillColor('#000').fontSize(10).font('Helvetica')
      .text('Subtotal:', 310, totalsY + 15)
      .text(`₹${subtotal.toFixed(2)}`, 370)
      .text('Discount:', 310, totalsY + 35, { width: 220 }) // Increased spacing
      .text(`₹${discount.toFixed(2)}`, 370)
      .text('GST (18%):', 310, totalsY + 55, { width: 220 }) // Increased spacing
      .text(`₹${gst.toFixed(2)}`, 370)
      .font('Helvetica-Bold').fillColor('#28a745')
      .text('Grand Total:', 310, totalsY + 85, { width: 220 }) // Increased spacing
      .text(`₹${grandTotal.toFixed(2)}`, 370);

    // Footer
    doc.font('Helvetica').fillColor('#555').fontSize(8)
      .text('Thank you for shopping with GoalZone!', 50, 750, { align: 'center' })
      .text('Contact us: support@goalzone.com | +91 123-456-7890', 50, 760, { align: 'center' });

    doc.end();

  } catch (error) {
    console.error('Error in downloadInvoice:', error.stack);
    res.status(500).json({ success: false, message: `Failed to generate invoice: ${error.message}` });
  }
};

module.exports = {
  loadMyOrders,
  cancelOrder,
  returnOrder,
  approveReturn,
  getOrderDetails,
  downloadInvoice,
  retryRazorpayPayment,
  verifyRetryRazorpayPayment
};