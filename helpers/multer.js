const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage(); // Use memory storage for Cloudinary

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/png', 'image/webp', 'image/jpeg'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PNG, WEBP, and JPEG files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

module.exports = upload;