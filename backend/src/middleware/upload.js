const path = require('path');
const multer = require('multer');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = (file.originalname && path.extname(file.originalname)) || '.jpg';
    const safe = ext.toLowerCase().replace(/[^a-z0-9.]/g, '');
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safe || '.jpg'}`;
    cb(null, name);
  },
});

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận ảnh: JPEG, PNG, GIF, WebP'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter,
});

const uploadThumbnail = upload.single('thumbnail');

module.exports = { uploadThumbnail, UPLOAD_DIR };
