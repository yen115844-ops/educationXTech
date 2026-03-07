# X-Tech Backend API

Node.js + Express + MongoDB (Mongoose). API cho website học tập trực tuyến X-Tech.

## Cài đặt

```bash
cd backend
cp .env.example .env
# Sửa .env: MONGODB_URI, JWT_SECRET
npm install
```

## Chạy

- Development (tự động reload): `npm run dev`
- Production: `npm start`

## Seed dữ liệu (100 user, 30 khóa, 50 bài học/bài tập)

```bash
npm run seed
```

Sau khi seed: đăng nhập với `admin@xtech.vn` / `123456`, hoặc `instructor1@xtech.vn` / `123456`, `student1@xtech.vn` / `123456`.

## Backup MongoDB

**Cách 1 – Backup bằng Node (không cần cài thêm):**  
Dữ liệu export ra JSON trong `backend/backups/YYYY-MM-DD_HH-mm-ss/`.

```bash
npm run backup
```

**Cách 2 – Backup bằng mongodump (BSON, đầy đủ):**  
Cần cài [MongoDB Database Tools](https://www.mongodb.com/docs/database-tools/installation/). Trên macOS: `brew install mongodb-database-tools`. Sau đó:

```bash
chmod +x scripts/backup-mongodump.sh
./scripts/backup-mongodump.sh
```

Backup lưu tại `backend/backups/mongodump/<timestamp>/`.

**MongoDB Atlas:** Nếu dùng cluster M10 trở lên, có thể bật [Atlas Backup](https://www.mongodb.com/docs/atlas/backup/overview/) trên dashboard để backup tự động.

## Restore (import lại) MongoDB

### Restore từ backup JSON (sau khi chạy `npm run backup`)

1. **Xem danh sách backup có sẵn** (không truyền tham số):

   ```bash
   cd backend
   npm run restore
   ```

   Sẽ in ra các thư mục kiểu `2025-03-07T12-30-00` trong `backups/`.

2. **Import lại một bản backup** – thay `<tên-thư-mục>` bằng tên in ở bước 1:

   ```bash
   npm run restore -- <tên-thư-mục>
   ```

   Ví dụ:

   ```bash
   npm run restore -- 2025-03-07T12-30-00
   ```

   Script sẽ xóa dữ liệu hiện tại của từng collection rồi insert lại từ file JSON. Thứ tự collection được xử lý đúng để không lỗi tham chiếu (User → Course → Lesson → …).

### Restore từ backup mongodump (sau khi chạy `backup-mongodump.sh`)

1. **Xem danh sách backup mongodump**:

   ```bash
   cd backend
   ./scripts/restore-mongodump.sh
   ```

   Sẽ in ra các thư mục trong `backups/mongodump/` (vd: `2025-03-07_12-30-00`).

2. **Restore** – thay `<tên-thư-mục>` bằng tên tương ứng:

   ```bash
   ./scripts/restore-mongodump.sh <tên-thư-mục>
   ```

   Ví dụ:

   ```bash
   ./scripts/restore-mongodump.sh 2025-03-07_12-30-00
   ```

   Script sẽ hỏi xác nhận (Enter để tiếp tục), rồi chạy `mongorestore --drop` để ghi đè database hiện tại bằng dữ liệu trong backup.

**Lưu ý:** Cả hai cách restore đều **ghi đè** dữ liệu hiện tại. Nên backup lại trước nếu cần giữ bản hiện tại.

## Format phản hồi (Response format)

Mọi API đều trả về cùng một cấu trúc để frontend xử lý thống nhất.

**Thành công:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Tuỳ chọn, ví dụ: Đã xóa thành công"
}
```
- `data` có thể là object (ví dụ `{ user, token }`) hoặc null khi chỉ cần message.
- HTTP status: 200 (mặc định), 201 (tạo mới).

**Lỗi:**
```json
{
  "success": false,
  "message": "Mô tả lỗi bằng tiếng Việt",
  "code": "MÃ_LỖI"
}
```
- `code` dùng để frontend phân loại (redirect login, hiển thị form, v.v.).
- Các mã thường gặp: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `TOKEN_EXPIRED` (401), `SERVER_ERROR` (500).

**Cách xử lý ở frontend:**
```js
const res = await fetch('/api/...');
const json = await res.json();
if (json.success) {
  // dùng json.data, json.message (nếu có)
} else {
  // hiển thị json.message; switch (json.code) { ... }
}
```

## API Endpoints

Base URL: `http://localhost:5000`

| Nhóm | Method | Endpoint | Mô tả |
|------|--------|----------|--------|
| **Auth** | POST | /api/auth/register | Đăng ký |
| | POST | /api/auth/login | Đăng nhập |
| | GET | /api/auth/me | Thông tin user (Bearer token) |
| **Users** | GET | /api/users/profile | Xem/sửa profile (auth) |
| | PATCH | /api/users/profile | Cập nhật profile |
| | POST | /api/users/change-password | Đổi mật khẩu |
| | GET | /api/users | Danh sách user (admin) |
| | GET | /api/users/:id | Chi tiết user (admin) |
| | PATCH | /api/users/:id | Sửa user (admin) |
| | DELETE | /api/users/:id | Xóa user (admin) |
| **Courses** | GET | /api/courses | Danh sách khóa (có thể ?published=true) |
| | GET | /api/courses/my | Khóa của tôi (auth) |
| | GET | /api/courses/:id | Chi tiết khóa |
| | POST | /api/courses | Tạo khóa (instructor/admin) |
| | PATCH | /api/courses/:id | Sửa khóa |
| | DELETE | /api/courses/:id | Xóa khóa |
| **Enrollments** | GET | /api/enrollments | Danh sách đăng ký của tôi |
| | POST | /api/enrollments/:courseId | Đăng ký khóa (student) |
| | GET | /api/enrollments/:courseId | Chi tiết đăng ký |
| | PATCH | /api/enrollments/:courseId/progress | Cập nhật tiến độ (lessonId) |
| | PATCH | /api/enrollments/:courseId/lessons/:lessonId/watch | Cập nhật thời gian xem video |
| **Lessons** | GET | /api/lessons/course/:courseId | Danh sách bài học |
| | GET | /api/lessons/:id | Chi tiết bài học |
| | POST | /api/lessons/course/:courseId | Tạo bài học (instructor/admin) |
| | PATCH | /api/lessons/:id | Sửa bài học |
| | DELETE | /api/lessons/:id | Xóa bài học |
| **Exercises** | GET | /api/exercises/course/:courseId | Danh sách bài tập |
| | GET | /api/exercises/:id | Chi tiết bài tập |
| | POST | /api/exercises/course/:courseId | Tạo bài tập (instructor/admin) |
| | PATCH | /api/exercises/:id | Sửa bài tập |
| | DELETE | /api/exercises/:id | Xóa bài tập |
| **Payments** | GET | /api/payments | Lịch sử thanh toán của tôi |
| | GET | /api/payments/admin | Tất cả thanh toán (admin) |
| | GET | /api/payments/:id | Chi tiết thanh toán |
| | POST | /api/payments/course/:courseId | Tạo thanh toán |
| | POST | /api/payments/:paymentId/confirm | Xác nhận thanh toán (mock) |
| **Community** | GET | /api/posts | Danh sách bài viết (?courseId=) |
| | GET | /api/posts/:id | Chi tiết bài + comments |
| | POST | /api/posts | Tạo bài viết (auth) |
| | PATCH | /api/posts/:id | Sửa bài viết |
| | DELETE | /api/posts/:id | Xóa bài viết |
| | GET | /api/comments/post/:postId | Danh sách comment |
| | POST | /api/comments/post/:postId | Thêm comment (auth) |
| | DELETE | /api/comments/:id | Xóa comment |
| **Chatbot** | POST | /api/chatbot/chat | Gửi message, nhận reply (body: message, sessionId?) |
| **Upload** | POST | /api/upload/thumbnail | Upload ảnh thumbnail (instructor/admin) |
| | POST | /api/upload/video | Upload video bài học (instructor/admin) |

## Auth

Gửi header: `Authorization: Bearer <token>` cho các route yêu cầu đăng nhập.
