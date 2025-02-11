const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");

const getAllOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 8;

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
        }));

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

        // Prevent status changes for cancelled orders
        if (order.status === 'Cancelled') {
            return res.status(400).json({ error: 'Cannot modify status of a cancelled order' });
        }

        order.status = status;
        await order.save();

        res.json({ message: 'Order status updated successfully' });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getAllOrders,
    getOrderDetails,
    updateOrderStatus
};