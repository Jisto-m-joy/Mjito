const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define the storage engine
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Define the destination folder for uploaded files
        const uploadPath = path.join(__dirname, '../public/uploads/productImages');
        fs.mkdirSync(uploadPath, { recursive: true }); // Create the directory if it doesn't exist
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Define the filename for uploaded files
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// Set up multer with the defined storage engine and file filter
const upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Allow files with names that start with 'replace_' or are 'images' or 'image'
        if (file.fieldname.startsWith('replace_') || file.fieldname === 'images' || file.fieldname === 'image') {
            cb(null, true);
        } else {
            cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname));
        }
    }
});

module.exports = upload;