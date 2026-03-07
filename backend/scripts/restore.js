/**
 * Restore MongoDB từ backup JSON (đã chạy backup.js)
 *
 * Cách dùng:
 *   npm run restore -- 2025-03-07T12-30-00     → restore từ backups/2025-03-07T12-30-00
 *   npm run restore -- backups/2025-03-07T12-30-00
 *   node scripts/restore.js 2025-03-07T12-30-00
 *
 * Không truyền tham số → in danh sách backup có sẵn.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/xtech';
const BACKUP_DIR = path.resolve(__dirname, '../backups');

// Thứ tự restore quan trọng (collection có ref sang collection trước)
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

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('Chưa có thư mục backups.');
    return [];
  }
  const dirs = fs.readdirSync(BACKUP_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => d.name);
  // Loại bỏ thư mục mongodump (dùng restore-mongodump.sh)
  return dirs.filter((d) => d !== 'mongodump').sort().reverse();
}

async function restore(backupFolder) {
  const restoreDir = path.isAbsolute(backupFolder)
    ? backupFolder
    : path.join(BACKUP_DIR, path.basename(backupFolder));

  if (!fs.existsSync(restoreDir)) {
    console.error('Không tìm thấy thư mục backup:', restoreDir);
    console.log('\nCác backup có sẵn:', listBackups().join(', ') || '(không có)');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');
  console.log('Restore từ:', restoreDir);
  console.log('');

  for (const name of modelFiles) {
    const filePath = path.join(restoreDir, `${name}.json`);
    if (!fs.existsSync(filePath)) {
      console.log(`  - ${name}: không có file, bỏ qua`);
      continue;
    }
    try {
      const model = require(`../src/models/${name}`);
      const raw = fs.readFileSync(filePath, 'utf8');
      const docs = JSON.parse(raw);
      if (!Array.isArray(docs) || docs.length === 0) {
        await model.deleteMany({});
        console.log(`  ✓ ${name}: 0 documents (đã xóa cũ)`);
        continue;
      }
      await model.deleteMany({});
      // Chuyển _id string về ObjectId nếu cần; User thiếu password (backup cũ) → gán mật khẩu tạm
      const toInsert = docs.map((d) => {
        const doc = { ...d };
        if (doc._id && typeof doc._id === 'string' && mongoose.Types.ObjectId.isValid(doc._id)) {
          doc._id = new mongoose.Types.ObjectId(doc._id);
        }
        if (name === 'User' && !doc.password) {
          doc.password = bcrypt.hashSync('ChangeMe123!', 10);
        }
        return doc;
      });
      if (name === 'User' && docs.some((d) => !d.password)) {
        console.log('  ⚠ Một số user không có password trong backup → đã gán tạm "ChangeMe123!" (nên đổi sau).');
      }
      await model.insertMany(toInsert);
      console.log(`  ✓ ${name}: ${toInsert.length} documents`);
    } catch (err) {
      console.error(`  ✗ ${name}:`, err.message);
    }
  }

  await mongoose.disconnect();
  console.log('\nRestore xong.');
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    const list = listBackups();
    console.log('Cách dùng: npm run restore -- <tên-thư-mục-backup>');
    console.log('Ví dụ:     npm run restore -- 2025-03-07T12-30-00');
    console.log('\nCác backup có sẵn (JSON):');
    if (list.length === 0) console.log('  (chưa có – chạy npm run backup trước)');
    else list.forEach((d) => console.log('  -', d));
    return;
  }
  await restore(arg);
}

main().catch((err) => {
  console.error('Restore lỗi:', err);
  process.exit(1);
});
