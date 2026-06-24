const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const {
  deleteCloudinaryAsset,
  uploadProfilePhoto,
} = require('../services/cloudinaryService');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');
const { normalizeDoc } = require('../utils/normalize');
const mime = require('mime-types');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Blocked MIME types (security)
const BLOCKED_MIME_TYPES = [
  'image/svg+xml',
  'text/html',
  'application/xhtml+xml',
  'application/javascript',
  'text/javascript',
];

// Safe extension mapping based on MIME type
const SAFE_EXTENSIONS = {
  'text/plain': '.txt',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'application/zip': '.zip',
  'application/json': '.json',
  'text/csv': '.csv',
};

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    // Derive extension from content type for safety instead of original filename
    const contentType = file.mimetype;
    const safeExt =
      SAFE_EXTENSIONS[contentType] || mime.extension(contentType)
        ? '.' + mime.extension(contentType)
        : path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (BLOCKED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new Error('File type not allowed'), false);
    }
    cb(null, true);
  },
});

// POST /api/upload — general file upload (chat attachments, etc.)
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({
      fileUrl,
      originalname: req.file.originalname,
      size: req.file.size,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// POST /api/upload/profile-photo — upload profile photo to Cloudinary
router.post(
  '/profile-photo',
  authMiddleware,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const uid = req.user.uid;

      // Fetch existing user to check for old photo
      const currentUser = await User.findOne({ uid }).lean();
      if (currentUser?.photoURL) {
        try {
          await deleteCloudinaryAsset(currentUser.photoURL);
          console.log(`Deleted old profile photo for user: ${uid}`);
        } catch (deleteError) {
          console.warn(
            'Failed to delete old photo from Cloudinary:',
            deleteError.message
          );
          // We continue anyway even if deletion fails
        }
      }

      // Upload to Cloudinary with unique ID via service
      const result = await uploadProfilePhoto(req.file.path, uid);

      // Remove local temp file
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.warn('Failed to remove temp file:', e.message);
      }

      const photoURL = result.secure_url;

      // Update user record
      await User.updateOne({ uid }, { $set: { photoURL } });

      res.json({ photoURL });
    } catch (error) {
      console.error('Error uploading profile photo:', error);
      // Clean up temp file on error
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          /* ignore */
        }
      }
      res.status(500).json({ message: 'Upload failed', error: error.message });
    }
  }
);

// Error handler for multer errors
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  }
  if (err.message === 'File type not allowed') {
    return res.status(400).json({ message: 'File type not allowed' });
  }
  next(err);
});

module.exports = router;
