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

const addCoupon = async (req, res) => {
    try {
        let {
            code,
            offerPrice,
            minimumPrice,
            startOn,
            maxUses,
            expireOn
        } = req.body;

        // Validate code presence and format
        if (!code || typeof code !== 'string' || code.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Valid coupon code is required'
            });
        }

        // Clean and format the code
        code = code.trim().toUpperCase();

        // Rest of your validation logic...

        // Create new coupon with explicit fields
        const newCoupon = new Coupons({
            code,
            offerPrice: Number(offerPrice),
            minimumPrice: Number(minimumPrice),
            startOn: new Date(startOn),
            maxUses: Number(maxUses),
            expireOn: new Date(expireOn),
            createdOn: new Date(),
            usesCount: 0,
            isListed: true,
            isDeleted: false
        });

        await newCoupon.save();

        res.status(200).json({
            success: true,
            message: 'Coupon created successfully'
        });
    } catch (error) {
        console.error('Error in addCoupon:', error);
        
        // Handle duplicate key error specifically
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'This coupon code already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

const toggleCouponStatus = async (req, res) => {
    try {
        const { couponId } = req.params;
        const coupon = await Coupons.findById(couponId);
        const newStatus = !coupon.isListed;
        await Coupons.findByIdAndUpdate(couponId, { isListed: newStatus });
        res.status(200).json({ 
            success: true, 
            message: `Coupon ${newStatus ? 'listed' : 'unlisted'} successfully`,
            isListed: newStatus
        });
    } catch (error) {
        console.error('Error in toggleCouponStatus:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

const applyCoupon = async (req, res) => {
    try {
      const { couponCode } = req.body;
      const userId = req.user._id; // Assuming you have user authentication middleware
  
      const coupon = await Coupons.findOne({ 
        code: couponCode,
        isListed: true,
        isDeleted: false,
        startOn: { $lte: new Date() },
        expireOn: { $gte: new Date() }
      });
  
      if (!coupon) {
        return res.status(404).json({
          success: false,
          message: 'Coupon not found or invalid'
        });
      }
  
      // Check user's usage
      let userUsage = coupon.userUses.find(use => use.userId.toString() === userId.toString());
      
      if (!userUsage) {
        // First time user is using this coupon
        userUsage = { userId, count: 0 };
        coupon.userUses.push(userUsage);
      }
  
      if (userUsage.count >= coupon.maxUses) {
        return res.status(400).json({
          success: false,
          message: 'You have reached the maximum usage limit for this coupon'
        });
      }
  
      // Increment usage counts
      userUsage.count += 1;
      coupon.usesCount += 1;
  
      await coupon.save();
  
      res.status(200).json({
        success: true,
        message: 'Coupon applied successfully',
        discount: coupon.offerPrice
      });
    } catch (error) {
      console.error('Error in applyCoupon:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  };
  
  module.exports = {
    getCouponPage,
    addCoupon,
    toggleCouponStatus,
    applyCoupon
  };