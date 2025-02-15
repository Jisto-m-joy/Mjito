const User = require('../../models/userSchema');
const Wallet = require('../../models/walletSchema');
const Address = require('../../models/addressSchema');
const Cart = require('../../models/cartSchema');
const Order = require('../../models/orderSchema');
const razorpay = require('../../config/razorpay');
const crypto = require('crypto');

const loadWalletPage = async (req, res, next) => {
    try {
        // Get user's wallet or create if doesn't exist
        let wallet = await Wallet.findOne({ user: req.user._id });
        if (!wallet) {
            wallet = new Wallet({ user: req.user._id });
            await wallet.save();
        }

        // Get transactions sorted by date
        const transactions = wallet.transactions.sort((a, b) => b.date - a.date);

        res.render('user-wallet', {
            wallet,
            transactions
        });
    } catch (error) {
        next(error);
    }
};

const addMoneyToWallet = async (req, res, next) => {
    try {
        const { amount } = req.body;

        // Find the user's wallet
        let wallet = await Wallet.findOne({ user: req.user._id });
        if (!wallet) {
            wallet = new Wallet({ user: req.user._id });
        }

        // Check if the amount exceeds the per-transaction limit
        if (amount > 100000) {
            return res.json({
                success: false,
                error: 'You cannot add more than ₹1,00,000 at a time.'
            });
        }

        // Check if adding the amount would exceed the wallet balance limit
        if (wallet.balance + Number(amount) > 200000) {
            return res.json({
                success: false,
                error: 'Your wallet cannot hold more than ₹2,00,000.'
            });
        }
    
        // Create Razorpay order
        const options = {
            amount: amount * 100, // Convert to paise
            currency: "INR",
            receipt: `wallet_${Date.now()}`
        };
        
        const order = await razorpay.orders.create(options);
        
        res.json({
            success: true,
            order,
            keyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        next(error);
    }
};

const verifyPayment = async (req, res, next) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        // Verify signature
        const sign = razorpay_order_id + "|" + razorpay_payment_id;
        const generated_signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_SECRET_KEY)
            .update(sign)
            .digest('hex');

        if (generated_signature === razorpay_signature) {
            // Get order details
            const order = await razorpay.orders.fetch(razorpay_order_id);
            const amount = order.amount / 100; // Convert from paise to rupees

            // Update wallet
            let wallet = await Wallet.findOne({ user: req.user._id });
            if (!wallet) {
                wallet = new Wallet({ user: req.user._id });
            }

            wallet.transactions.push({
                type: 'credit',
                amount: amount,
                description: `Wallet recharge - ${razorpay_payment_id}`
            });

            wallet.balance += Number(amount);
            await wallet.save();

            res.json({
                success: true,
                message: 'Payment verified successfully',
                newBalance: wallet.balance
            });
        } else {
            throw new Error('Payment verification failed');
        }
    } catch (error) {
        next(error);
    }
};


module.exports = {
    loadWalletPage,
    addMoneyToWallet,
    verifyPayment
}