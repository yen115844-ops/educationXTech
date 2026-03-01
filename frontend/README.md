# X-Tech Frontend

Next.js 16 (App Router) + React 19 + Tailwind CSS 4. Giao diện website học tập trực tuyến X-Tech.

## Cài đặt

```bash
cd frontend
cp .env.local.example .env.local
# Sửa .env.local: NEXT_PUBLIC_API_URL trỏ tới backend (vd: http://localhost:5000)
npm install
```

## Chạy

- Development: `npm run dev` (mặc định http://localhost:3000)
- Production: `npm run build` rồi `npm start`

## Cấu trúc chính

- **app/** – Trang (App Router)
  - **page.tsx** – Trang chủ (khóa nổi bật)
  - **(auth)/** – Đăng nhập, Đăng ký
  - **courses/** – Danh sách khóa, chi tiết, đăng ký, vào học, bài học
  - **dashboard/** – Khóa học của tôi
  - **profile/** – Hồ sơ, đổi mật khẩu
  - **payments/** – Lịch sử thanh toán
  - **community/** – Bài viết, bình luận
  - **chatbot/** – Chatbot hỗ trợ học tập
  - **admin/** – Quản trị (admin)
- **components/** – Header, CourseCard
- **context/AuthContext.tsx** – Trạng thái đăng nhập (user, token, login, logout)
- **lib/api.ts** – Gọi API backend (format success/data/message/code)
- **lib/auth.ts** – Token trong localStorage
- **types/index.ts** – User, Course, Lesson, Post, v.v.

## Kết nối Backend

Frontend gọi `NEXT_PUBLIC_API_URL` (ví dụ `http://localhost:5000`). Cần chạy backend và cấu hình CORS cho origin của frontend (localhost:3000 khi dev).
