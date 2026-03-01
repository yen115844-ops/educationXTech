const express = require('express');
const path = require('path');
const { uploadThumbnail } = require('../middleware/upload');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post(
  '/thumbnail',
  auth,
  requireRole('instructor', 'admin'),
  (req, res, next) => {
    uploadThumbnail(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.error('Kích thước ảnh tối đa 5MB', 400, 'VALIDATION_ERROR');
        }
        return res.error(err.message || 'Upload thất bại', 400, 'VALIDATION_ERROR');
      }
      next();
    });
  },
  (req, res) => {
    if (!req.file || !req.file.filename) {
      return res.error('Chưa chọn ảnh', 400, 'VALIDATION_ERROR');
    }
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
    const url = `${baseUrl}/uploads/${req.file.filename}`;
    res.success({ url, filename: req.file.filename });
  }
);

module.exports = router;
