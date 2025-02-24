const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const walletController = require('../../controllers/user/walletController');

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
      status: getOrderStatus(order.status),
      totalAmount: order.finalAmount,
      quantity: order.orderedItems.reduce((sum, item) => sum + item.quantity, 0),
      product: {
        name: order.orderedItems[0]?.product?.name || 'Product Not Found',
        image: order.orderedItems[0]?.product?.images?.[0] || '/placeholder-image.jpg'
      },
      cancellation_reason: order.cancellation_reason,
      return_reason: order.return_reason  // Add this line
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

module.exports = {
  loadMyOrders,
  cancelOrder,
  returnOrder,
  approveReturn
};