const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Wishlist = require("../../models/wishlistSchema");

const loadWishlistPage = async (req, res, next) => {
    try {
        // Check if user exists in request
        if (!req.user) {
            return res.redirect('/login');
        }
        
        // Find wishlist for current user and populate product details
        const wishlist = await Wishlist.findOne({ userId: req.user._id })
            .populate({
                path: 'products.productId',
                select: 'name description images combos'
            });

        res.render('wishlist', { 
            wishlistItems: wishlist ? wishlist.products : [] 
        });
    } catch(error) {
        next(error);
    }
}
const addToWishlist = async (req, res) => {
    try {
        const productId = req.params.productId;
        const userId = req.user._id;

        // Validate if product exists
        const productExists = await Product.findById(productId);
        if (!productExists) {
            return res.status(404).json({ 
                success: false, 
                error: 'Product not found' 
            });
        }

        let wishlist = await Wishlist.findOne({ userId });

        if (!wishlist) {
            wishlist = new Wishlist({
                userId,
                products: [{ productId }]
            });
        } else if (!wishlist.products.some(item => item.productId.toString() === productId)) {
            wishlist.products.push({ productId });
        } else {
            return res.json({ 
                success: false, 
                error: 'Product already in wishlist' 
            });
        }

        await wishlist.save();
        res.json({ 
            success: true,
            message: 'Product added to wishlist successfully'
        });
    } catch (error) {
        console.error('Wishlist error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to add product to wishlist' 
        });
    }
};

const removeFromWishlist = async (req, res) => {
    try {
        const productId = req.params.productId;
        const userId = req.user._id;

        const wishlist = await Wishlist.findOne({ userId });
        
        if (!wishlist) {
            return res.status(404).json({ 
                success: false, 
                error: 'Wishlist not found' 
            });
        }

        wishlist.products = wishlist.products.filter(
            item => item.productId.toString() !== productId
        );

        await wishlist.save();
        res.json({ 
            success: true,
            message: 'Product removed from wishlist successfully'
        });
    } catch (error) {
        console.error('Wishlist error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to remove product from wishlist' 
        });
    }
};

const checkWishlistStatus = async (req, res) => {
    try {
        const productId = req.query.productId;
        const userId = req.user._id;

        const wishlist = await Wishlist.findOne({ userId });
        
        const inWishlist = wishlist ? 
            wishlist.products.some(item => item.productId.toString() === productId) : 
            false;

        res.json({ 
            success: true, 
            inWishlist 
        });
    } catch (error) {
        console.error('Wishlist status check error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to check wishlist status' 
        });
    }
};


module.exports = {
    loadWishlistPage,
    addToWishlist,
    removeFromWishlist,
    checkWishlistStatus
};
