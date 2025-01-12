const User = require('../../models/userSchema');

const customerInfo = async (req, res) => {
    try {
        const customers = await User.find(); // Fetch customer data from the database
        const itemsPerPage = 10; // Define items per page
        const totalPages = Math.ceil(customers.length / itemsPerPage); // Calculate total pages based on items per page
        const currentPage = parseInt(req.query.page) || 1; // Get current page from query parameters

        res.render('admin/customers', {
            data: customers,
            totalPages: totalPages,
            currentPage: currentPage
        });
    } catch (error) {
        console.error('Error fetching customer data:', error);
        res.status(500).send('Server error');
    }
};

module.exports = {
    customerInfo
};