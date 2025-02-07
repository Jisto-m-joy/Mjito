const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");

const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('userId')
            .populate('orderedItems.product')
            .sort({ orderDate: -1 });

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

        res.render('orders', { orders: formattedOrders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Error fetching orders');
    }
};

const getOrderDetails = async (req, res) => {
    try {
        console.log('Fetching order details for orderId:', req.params.orderId);

        const order = await Order.findOne({ orderId: req.params.orderId })
            .populate('userId', 'name email mobile_number')
            .populate('orderedItems.product')
            .populate({
                path: 'address',
                model: 'Address',
                populate: {
                    path: 'address',
                    model: 'Address'
                }
            });

        if (!order) {
            console.log('Order not found');
            return res.status(404).json({ error: 'Order not found' });
        }

        console.log('Found order:', JSON.stringify(order, null, 2));

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
            shippingAddress: order.address && order.address.address[0] ? {
                fullName: order.address.address[0].fullName || 'N/A',
                address: order.address.address[0].address || 'N/A',
                landMark: order.address.address[0].landMark || 'N/A',
                city: order.address.address[0].city || 'N/A',
                state: order.address.address[0].state || 'N/A',
                pincode: order.address.address[0].pincode || 'N/A',
                phone: order.address.address[0].phone || 'N/A',
                altPhone: order.address.address[0].altPhone || 'N/A'
            } : {
                fullName: 'N/A',
                address: 'N/A',
                landMark: 'N/A',
                city: 'N/A',
                state: 'N/A',
                pincode: 'N/A',
                phone: 'N/A',
                altPhone: 'N/A'
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

        console.log('Formatted order:', JSON.stringify(formattedOrder, null, 2));
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