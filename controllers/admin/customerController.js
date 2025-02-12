const User = require('../../models/userSchema');

const customerInfo = async (req, res, next) => {
    try {
        const searchQuery = req.query.search;
        const itemsPerPage = 4;
        const currentPage = parseInt(req.query.page) || 1;
        
        // Build the base query
        let query = { isAdmin: false };
        
        // Add search condition if search parameter exists
        if (searchQuery) {
            query = {
                ...query,
                $or: [
                    { name: { $regex: searchQuery, $options: 'i' } },
                    { email: { $regex: searchQuery, $options: 'i' } }
                ]
            };
        }

        // Calculate skip value for pagination
        const skip = (currentPage - 1) * itemsPerPage;

        // Get total count of matching documents
        const totalCustomers = await User.countDocuments(query);
        const totalPages = Math.ceil(totalCustomers / itemsPerPage);

        // Fetch paginated and filtered customers
        const customers = await User.find(query)
            .skip(skip)
            .limit(itemsPerPage)
            .sort({ createdAt: -1 });

        res.render('customers', {
            data: customers,
            totalPages: totalPages,
            currentPage: currentPage,
            search: searchQuery || '' // Pass the search query to the template
        });
    } catch (error) {
        next(error);
    }
};

const blockCustomer = async (req, res, next) => {
    try {
        const userId = req.body.id;
        await User.findByIdAndUpdate(userId, { isBlocked: true });
        res.sendStatus(200);
    } catch (error) {
        next(error);
    }
};

const unblockCustomer = async (req, res, next) => {
    try {
        const userId = req.body.id;
        await User.findByIdAndUpdate(userId, { isBlocked: false });
        res.sendStatus(200);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    customerInfo,
    blockCustomer,
    unblockCustomer
};