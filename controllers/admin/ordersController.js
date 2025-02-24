const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");

const getAllOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 8;

        const searchText = req.query.search ? req.query.search.toLowerCase() : '';

        const orders = await Order.find()
            .populate('userId')
            .populate('orderedItems.product')
            .sort({ orderDate: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        const totalOrders = await Order.countDocuments();

        const formattedOrders = orders.map(order => ({
            _id: order.orderId,
            date: order.orderDate,
            customer: order.userId.name,
            products: order.orderedItems.map(item => ({
                name: item.product.name,
                image: item.product.images[0],
                quantity: item.quantity,
                size: item.product.combos[0].size
            })),
            total: order.finalAmount,
            payment: order.paymentMethod,
            status: order.status
        })).filter(order => order.products.some(product => product.name.toLowerCase().includes(searchText)));

        res.render('orders', { 
            orders: formattedOrders,
            currentPage: page,
            totalPages: Math.ceil(totalOrders / limit)
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Error fetching orders');
    }
};

const getOrderDetails = async (req, res) => {
    try {
        const order = await Order.findOne({ orderId: req.params.orderId })
            .populate('userId', 'name email mobile_number')
            .populate('orderedItems.product');

        if (!order) {
            console.log('Order not found');
            return res.status(404).json({ error: 'Order not found' });
        }

        const formattedOrder = {
            _id: order.orderId,
            date: order.orderDate,
            payment: order.paymentMethod,
            total: order.finalAmount,
            customer: {
                name: order.userId.name,
                email: order.userId.email,
                phone: order.userId.mobile_number || 'N/A'
            },
            shippingAddress: {
                fullName: order.shippingAddress.fullName,
                address: order.shippingAddress.address,
                landMark: order.shippingAddress.landmark || 'N/A',
                city: order.shippingAddress.city,
                state: order.shippingAddress.state,
                pincode: order.shippingAddress.pincode,
                phone: order.shippingAddress.phone,
                altPhone: order.shippingAddress.altPhone || 'N/A'
            },
            products: order.orderedItems.map(item => ({
                name: item.product.name,
                image: item.product.images[0],
                price: item.price,
                size: item.product.combos[0].size,
                quantity: item.quantity,
                status: order.status
            }))
        };

        res.json(formattedOrder);
    } catch (error) {
        console.error('Error in getOrderDetails:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        const order = await Order.findOne({ orderId: orderId });
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Prevent status changes for cancelled or returned orders
        if (order.status === 'Cancelled' || order.status === 'Returned') {
            return res.status(400).json({ 
                error: `Cannot modify status of a ${order.status.toLowerCase()} order` 
            });
        }

        order.status = status;
        await order.save();

        res.json({ message: 'Order status updated successfully' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


const getReturnRequests = async (req, res) => {
    try {
        const returnRequests = await Order.find({ status: 'Return Request' })
            .populate('userId', 'name')
            .populate('orderedItems.product');

        const formattedRequests = returnRequests.map(order => ({
            _id: order.orderId,
            customer: order.userId.name,
            products: order.orderedItems.map(item => ({
                name: item.product.name,
                quantity: item.quantity
            })),
            total: order.finalAmount,
            return_reason: order.return_reason,
            status: order.status  // Add status for filtering in frontend
        }));

        res.json(formattedRequests);
    } catch (error) {
        console.error('Error fetching return requests:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const updateReturnStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        const order = await Order.findOne({ orderId: orderId });
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Only allow updating to 'Returned' from 'Return Request'
        if (order.status !== 'Return Request') {
            return res.status(400).json({ error: 'Order is not in Return Request status' });
        }

        if (order.status === 'Cancelled' || order.status === 'Returned') {
            return res.status(400).json({ 
                error: `Cannot modify status of a ${order.status.toLowerCase()} order` 
            });
        }

        order.status = status;
        await order.save();

        res.json({ message: 'Order status updated to Returned successfully' });
    } catch (error) {
        console.error('Error updating return status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getAllOrders,
    getOrderDetails,
    updateOrderStatus,
    getReturnRequests,
    updateReturnStatus,

};