const Order = require("../../models/orderSchema");

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
      .populate('address')
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
      }
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
    'Cancelled': 0,
    'Return Request': 0,
    'Returned': 0
  };
  return statusMap[status] || 0;
}

module.exports = {
  loadMyOrders,
};