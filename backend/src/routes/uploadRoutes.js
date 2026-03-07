const express = require('express');
const {
  uploadThumbnail,
  uploadVideo,
  uploadAvatar,
  MAX_THUMBNAIL_SIZE,
  MAX_VIDEO_SIZE,
  MAX_AVATAR_SIZE,
} = require('../middleware/upload');
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
          return res.error(`Kích thước ảnh tối đa ${Math.round(MAX_THUMBNAIL_SIZE / 1024 / 1024)}MB`, 400, 'VALIDATION_ERROR');
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
    const url = `/uploads/${req.file.filename}`;
    res.success({ url, filename: req.file.filename });
  }
);

router.post(
  '/video',
  auth,
  requireRole('instructor', 'admin'),
  (req, res, next) => {
    uploadVideo(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.error(`Kích thước video tối đa ${Math.round(MAX_VIDEO_SIZE / 1024 / 1024)}MB`, 400, 'VALIDATION_ERROR');
        }
        return res.error(err.message || 'Upload video thất bại', 400, 'VALIDATION_ERROR');
      }
      next();
    });
  },
  (req, res) => {
    if (!req.file || !req.file.filename) {
      return res.error('Chưa chọn video', 400, 'VALIDATION_ERROR');
    }
    const url = `/uploads/videos/${req.file.filename}`;
    res.success({ url, filename: req.file.filename });
  }
);

// Upload avatar: mọi user đã đăng nhập (học viên, giảng viên, admin)
router.post(
  '/avatar',
  auth,
  (req, res, next) => {
    uploadAvatar(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.error(`Kích thước ảnh tối đa ${Math.round(MAX_AVATAR_SIZE / 1024 / 1024)}MB`, 400, 'VALIDATION_ERROR');
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
    const url = `/uploads/avatars/${req.file.filename}`;
    res.success({ url, filename: req.file.filename });
  }
);

module.exports = router;
