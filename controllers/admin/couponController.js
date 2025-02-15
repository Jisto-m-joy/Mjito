const Coupons = require('../../models/couponSchema');

const getCouponPage = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Items per page
        const skip = (page - 1) * limit;

        const totalCoupons = await Coupons.countDocuments({ isDeleted: false });
        const totalPages = Math.ceil(totalCoupons / limit);

        const coupons = await Coupons.find({ isDeleted: false })
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        res.render('coupon', { 
            coupons,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getCouponPage,
}