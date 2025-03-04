const Banner = require("../../models/bannerSchema");
const cloudinary = require("../../config/cloudinary");
const fs = require("fs");

const loadBannerPage = async (req, res, next) => {
    try {
        const banners = await Banner.find().sort({ createdAt: -1 });
        res.render("banner", { banners });
    } catch (error) {
        next(error);
    }
}

const validateImage = (file) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    const blockedTypes = ['application/pdf', 'application/vnd.ms-excel', 
                         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                         'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (blockedTypes.includes(file.mimetype)) {
        return { valid: false, message: 'PDF, Excel, and Word files are not allowed' };
    }
    if (!allowedTypes.includes(file.mimetype)) {
        return { valid: false, message: 'Only PNG, JPEG, and WEBP images are allowed' };
    }
    return { valid: true };
}

const addBanner = async (req, res, next) => {
    try {
        const { title, subtitle, startDate, endDate } = req.body;
        // Server-side date validation remains the same
        const today = new Date('2025-03-03');
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start < today.setHours(0, 0, 0, 0)) {
            return res.render('banner', { 
                error: 'Start date cannot be in the past',
                banners: await Banner.find().sort({ createdAt: -1 })
            });
        }
        if (end <= start) {
            return res.render('banner', { 
                error: 'End date must be after the start date',
                banners: await Banner.find().sort({ createdAt: -1 })
            });
        }

        // Image validation remains the same
        if (!req.files || req.files.length === 0) {
            return res.render('banner', { 
                error: 'Please upload at least one image',
                banners: await Banner.find().sort({ createdAt: -1 })
            });
        }

        for (let file of req.files) {
            const validation = validateImage(file);
            if (!validation.valid) {
                req.files.forEach(f => fs.unlinkSync(f.path));
                return res.render('banner', { 
                    error: validation.message,
                    banners: await Banner.find().sort({ createdAt: -1 })
                });
            }
        }

        // Upload to Cloudinary remains the same
        const uploadPromises = req.files.map(file => 
            cloudinary.uploader.upload(file.path, {
                folder: 'banners',
                resource_type: 'image'
            })
        );

        const results = await Promise.all(uploadPromises);
        const imageUrls = results.map(result => result.secure_url);

        req.files.forEach(file => fs.unlinkSync(file.path));

        const banner = new Banner({
            title,
            subtitle,
            startDate,
            endDate,
            images: imageUrls,
            status: 'Active'
        });

        await banner.save();
        res.redirect('/admin/banner?success=true');
    } catch (error) {
        if (req.files) {
            req.files.forEach(file => fs.unlinkSync(file.path));
        }
        next(error);
    }
}

const toggleBannerStatus = async (req, res, next) => {
    try {
        const { bannerId } = req.params;
        const { status } = req.body;
        
        await Banner.findByIdAndUpdate(bannerId, { status });
        res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
}

const deleteBanner = async (req, res, next) => {
    try {
        const { bannerId } = req.params;
        const banner = await Banner.findById(bannerId);
        
        // Delete images from Cloudinary
        const publicIds = banner.images.map(url => {
            const parts = url.split('/');
            const filename = parts[parts.length - 1].split('.')[0];
            return `banners/${filename}`;
        });
        
        await Promise.all(publicIds.map(id => 
            cloudinary.uploader.destroy(id)
        ));

        await Banner.findByIdAndDelete(bannerId);
        res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    loadBannerPage,
    addBanner,
    toggleBannerStatus,
    deleteBanner
}