const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const router = express.Router();

const mediaUploadDir = path.resolve(__dirname, '../../data/generated/media');
if (!fs.existsSync(mediaUploadDir)) {
    fs.mkdirSync(mediaUploadDir, { recursive: true });
}

const mediaStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, mediaUploadDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname || '').toLowerCase() || '.bin';
        cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
    },
});

const mediaUpload = multer({
    storage: mediaStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (String(file.mimetype || '').startsWith('image/')) {
            cb(null, true);
            return;
        }
        cb(new Error('Only image uploads are allowed'));
    },
});

router.post('/media/upload', (req, res) => {
    mediaUpload.single('file')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ error: err.message || 'Upload failed' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded. Use multipart/form-data with field "file".' });
        }

        const publicUrl = `/generated/media/${req.file.filename}`;
        return res.json({
            success: true,
            url: publicUrl,
            filename: req.file.filename,
            mimetype: req.file.mimetype,
            size: req.file.size,
        });
    });
});

module.exports = router;
