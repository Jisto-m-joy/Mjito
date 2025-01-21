
const multer = require('multer');
const path = require('path');

const storage = {
    _handleFile(req, file, cb) {
        const uploadPath = path.join(__dirname, '../public/uploads/productImages', file.originalname);
        const outStream = require('fs').createWriteStream(uploadPath);

        file.stream.pipe(outStream);
        outStream.on('error', cb);
        outStream.on('finish', function () {
            cb(null, {
                path: uploadPath,
                size: outStream.bytesWritten
            });
        });
    },
    _removeFile(req, file, cb) {
        const fs = require('fs');
        const path = file.path;

        fs.unlink(path, cb);
    }
};

module.exports = storage;