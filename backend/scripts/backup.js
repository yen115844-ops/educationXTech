/**
 * Backup MongoDB qua Mongoose → JSON (chạy trong project, không cần cài mongodump)
 * Chạy: node scripts/backup.js
 * Backup lưu tại: backend/backups/YYYY-MM-DD_HH-mm-ss/
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/xtech';
const BACKUP_DIR = path.resolve(__dirname, '../backups');

// Danh sách model cần backup (khớp với thư mục models)
const modelFiles = [
  'User',
  'Course',
  'Lesson',
  'Exercise',
  'Enrollment',
  'Payment',
  'Post',
  'Comment',
  'Submission',
  'ChatbotLog',
];

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.join(BACKUP_DIR, timestamp);

  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  for (const name of modelFiles) {
    try {
      const model = require(`../src/models/${name}`);
      // User có password với select: false → cần .select('+password') để backup đủ
      const query = name === 'User' ? model.find({}).select('+password') : model.find({});
      const docs = await query.lean();
      const filePath = path.join(outDir, `${name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');
      console.log(`  ✓ ${name}: ${docs.length} documents`);
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') {
        console.log(`  - ${name}: skip (model not found)`);
      } else {
        console.error(`  ✗ ${name}:`, err.message);
      }
    }
  }

  await mongoose.disconnect();
  console.log('\nBackup xong:', outDir);
}

backup().catch((err) => {
  console.error('Backup lỗi:', err);
  process.exit(1);
});
