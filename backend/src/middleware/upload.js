const path = require('path');
const multer = require('multer');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const VIDEO_UPLOAD_DIR = path.join(UPLOAD_DIR, 'videos');
const AVATAR_UPLOAD_DIR = path.join(UPLOAD_DIR, 'avatars');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(VIDEO_UPLOAD_DIR)) {
  fs.mkdirSync(VIDEO_UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(AVATAR_UPLOAD_DIR)) {
  fs.mkdirSync(AVATAR_UPLOAD_DIR, { recursive: true });
}

const createStorage = (destinationDir, fallbackExt) => multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, destinationDir),
  filename: (_req, file, cb) => {
    const ext = (file.originalname && path.extname(file.originalname)) || fallbackExt;
    const safe = ext.toLowerCase().replace(/[^a-z0-9.]/g, '');
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safe || fallbackExt}`;
    cb(null, name);
  },
});

const THUMBNAIL_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const VIDEO_MIMES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-m4v',
  'video/x-msvideo',
];

const MAX_THUMBNAIL_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 300 * 1024 * 1024; // 300MB
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB

const createUploader = ({ destinationDir, fallbackExt, allowedMimes, maxSize, invalidTypeMessage, fieldName }) => {
  const fileFilter = (_req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(invalidTypeMessage), false);
    }
  };

  const upload = multer({
    storage: createStorage(destinationDir, fallbackExt),
    limits: { fileSize: maxSize },
    fileFilter,
  });

  return upload.single(fieldName);
};

const uploadThumbnail = createUploader({
  destinationDir: UPLOAD_DIR,
  fallbackExt: '.jpg',
  allowedMimes: THUMBNAIL_MIMES,
  maxSize: MAX_THUMBNAIL_SIZE,
  invalidTypeMessage: 'Chỉ chấp nhận ảnh: JPEG, PNG, GIF, WebP',
  fieldName: 'thumbnail',
});

const uploadVideo = createUploader({
  destinationDir: VIDEO_UPLOAD_DIR,
  fallbackExt: '.mp4',
  allowedMimes: VIDEO_MIMES,
  maxSize: MAX_VIDEO_SIZE,
  invalidTypeMessage: 'Chỉ chấp nhận video: MP4, WebM, OGG, MOV, M4V, AVI',
  fieldName: 'video',
});

const uploadAvatar = createUploader({
  destinationDir: AVATAR_UPLOAD_DIR,
  fallbackExt: '.jpg',
  allowedMimes: THUMBNAIL_MIMES,
  maxSize: MAX_AVATAR_SIZE,
  invalidTypeMessage: 'Chỉ chấp nhận ảnh: JPEG, PNG, GIF, WebP',
  fieldName: 'avatar',
});

module.exports = {
  uploadThumbnail,
  uploadVideo,
  uploadAvatar,
  UPLOAD_DIR,
  VIDEO_UPLOAD_DIR,
  AVATAR_UPLOAD_DIR,
  MAX_THUMBNAIL_SIZE,
  MAX_VIDEO_SIZE,
  MAX_AVATAR_SIZE,
};
