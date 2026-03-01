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

## Auth

Gửi header: `Authorization: Bearer <token>` cho các route yêu cầu đăng nhập.
