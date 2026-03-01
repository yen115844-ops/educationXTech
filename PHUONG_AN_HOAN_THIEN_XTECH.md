# Phương án hoàn thiện website X-Tech (Học tập trực tuyến)

## Tóm tắt từ SRS (srs.docx)

- **Mục tiêu:** Website học tập trực tuyến X-Tech: quản lý khóa học, người dùng, bài học, bài tập, thanh toán, cộng đồng.
- **Vai trò:** Quản trị viên, Giảng viên, Học viên.
- **5 nhóm chức năng chính (UC):** Quản lý người dùng, Quản lý khóa học, Quản lý bài học & bài tập, Quản lý thanh toán, Quản lý cộng đồng.
- **Công nghệ yêu cầu:** MongoDB (Mongoose), Web API (server), triển khai hosting, dữ liệu thử nghiệm (100 user, 30 khóa học, 50 bài học/bài tập), tích hợp chatbot hỗ trợ học tập.

---

## 1. Kiến trúc tổng thể (Next.js + Node.js + MongoDB)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Next.js (Full-stack)                         │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐ │
│  │  Frontend (React)    │    │  API Routes / Server Actions     │ │
│  │  - App Router       │───▶│  - /api/auth, /api/courses, ...   │ │
│  │  - SSR/SSG/CSR      │    │  - Bảo mật, validate, gọi DB     │ │
│  └─────────────────────┘    └──────────────┬──────────────────┘ │
└─────────────────────────────────────────────┼───────────────────┘
                                              │
                    ┌─────────────────────────▼────────────────────┐
                    │           Node.js API (tùy chọn)             │
                    │  - Có thể tách riêng Express/Fastify          │
                    │  - Hoặc dùng chỉ Next.js API Routes          │
                    └─────────────────────────┬────────────────────┘
                                              │
                    ┌─────────────────────────▼────────────────────┐
                    │              MongoDB (Mongoose)              │
                    │  users, courses, lessons, exercises,          │
                    │  payments, community (posts, comments)       │
                    └─────────────────────────────────────────────┘
```

**Hai hướng triển khai:**

| Cách | Mô tả | Phù hợp khi |
|------|--------|-------------|
| **A. Next.js thuần** | Frontend + API Routes + Server Actions, Mongoose kết nối trực tiếp từ Next.js | MVP, team nhỏ, deploy đơn giản (Vercel + MongoDB Atlas) |
| **B. Next.js + API riêng** | Next.js chỉ làm frontend; Node.js (Express/Fastify) chạy riêng làm REST/GraphQL API | Cần tách rõ backend, scale API độc lập, mobile app dùng chung API |

Đề xuất bắt đầu với **cách A** để nhanh hoàn thiện đủ 5 UC và triển khai; sau có thể tách API sang cách B nếu cần.

---

## 2. Cấu trúc thư mục gợi ý (Next.js App Router + MongoDB)

```
educationXTech/
├── src/
│   ├── app/
│   │   ├── (auth)/                    # Nhóm route cần/không cần đăng nhập
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── admin/                 # Quản trị viên
│   │   │   ├── instructor/            # Giảng viên
│   │   │   ├── student/               # Học viên
│   │   │   └── layout.tsx
│   │   ├── api/                       # API Routes
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── courses/
│   │   │   ├── lessons/
│   │   │   ├── exercises/
│   │   │   ├── payments/
│   │   │   ├── community/
│   │   │   └── chatbot/
│   │   ├── layout.tsx
│   │   └── page.tsx                   # Trang chủ
│   ├── components/
│   │   ├── ui/
│   │   ├── course/
│   │   ├── lesson/
│   │   ├── community/
│   │   └── chatbot/
│   ├── lib/
│   │   ├── db/
│   │   │   └── mongoose.ts            # Kết nối MongoDB
│   │   ├── auth.ts                    # Session/JWT
│   │   └── validations/
│   ├── models/                        # Mongoose models
│   │   ├── User.ts
│   │   ├── Course.ts
│   │   ├── Lesson.ts
│   │   ├── Exercise.ts
│   │   ├── Payment.ts
│   │   ├── Post.ts
│   │   └── Comment.ts
│   └── types/
├── public/
├── .env.local                         # MONGODB_URI, NEXTAUTH_SECRET, ...
├── package.json
└── next.config.js
```

---

## 3. Sơ đồ CSDL MongoDB (Mongoose) – tương ứng PI 2.1

| Collection | Mô tả chính |
|------------|-------------|
| **users** | email, password (hash), name, role (admin \| instructor \| student), avatar, createdAt |
| **courses** | title, description, instructorId (ref User), price, thumbnail, isPublished, createdAt |
| **lessons** | courseId (ref Course), title, order, content (HTML/markdown), videoUrl, duration |
| **exercises** | lessonId hoặc courseId, title, type (quiz \| coding \| text), questions/answers, deadline |
| **enrollments** | userId, courseId, progress (%), completedLessons[], enrolledAt |
| **payments** | userId, courseId, amount, method, status, transactionId, paidAt |
| **posts** | userId, courseId (optional), title, content, type (question \| share), createdAt |
| **comments** | postId, userId, content, createdAt |
| **chatbot_logs** | userId, sessionId, messages[], createdAt (phục vụ AI chatbot) |

Quan hệ: User 1–n Course (instructor), User n–n Course (enrollment), Course 1–n Lesson, Lesson/Course 1–n Exercise, Post 1–n Comment.

---

## 4. Ánh xạ 5 UC → API & trang (PI 3.3)

| UC | Chức năng | API (Next.js) | Trang / Luồng |
|----|-----------|----------------|----------------|
| **1. Quản lý thông tin người dùng** | Đăng ký, đăng nhập, xem/sửa hồ sơ, đổi mật khẩu; Admin: CRUD user, phân quyền | `/api/auth/*`, `/api/users/*` | login, register, profile, admin/users |
| **2. Quản lý khóa học** | Tạo/sửa/xóa khóa, duyệt khóa (admin), danh sách khóa, chi tiết khóa, đăng ký khóa | `/api/courses/*` | courses, course/[id], instructor/courses, admin/courses |
| **3. Quản lý bài học & bài tập** | Thêm/sửa bài học, thêm/sửa bài tập, nộp bài, chấm điểm, tiến độ học | `/api/lessons/*`, `/api/exercises/*`, `/api/enrollments/*` | course/[id]/lessons, lesson/[id], exercise/[id], dashboard/student |
| **4. Quản lý thanh toán** | Thanh toán khóa (mô phỏng hoặc cổng thật), lịch sử thanh toán, voucher (nếu có) | `/api/payments/*` | checkout, payments/history, admin/payments |
| **5. Quản lý cộng đồng** | Tạo bài viết, bình luận, theo khóa hoặc chung; xóa/ẩn (admin) | `/api/community/posts`, `/api/community/comments` | community, course/[id]/discussion |

---

## 5. Công nghệ & thư viện đề xuất

| Nhóm | Công nghệ |
|------|-----------|
| Framework | Next.js 14+ (App Router), React 18 |
| Database | MongoDB Atlas, Mongoose |
| Auth | NextAuth.js (credentials + JWT) hoặc Auth.js, bcrypt |
| UI | Tailwind CSS, shadcn/ui hoặc Material UI |
| Form & Validate | Zod, React Hook Form |
| Thanh toán (mô phỏng / thật) | Stripe (test mode) hoặc API mô phỏng nội bộ |
| Chatbot | OpenAI API hoặc mô phỏng đơn giản (rule-based) theo PI 3.4 |

---

## 6. Chatbot hỗ trợ học tập (PI 3.4 – AI Chatbot đơn giản)

- **Option 1 – Đơn giản:** Rule-based: trả lời FAQ (hướng dẫn đăng ký, nộp bài, xem tiến độ…) bằng keyword hoặc intent đơn giản.
- **Option 2 – AI:** Gọi OpenAI API (hoặc model tương tự): context = khóa học hiện tại + vài bài gần đây, trả lời câu hỏi học tập.
- Lưu lịch sử hội thoại vào `chatbot_logs` (userId, sessionId, messages) để sau có thể nâng cấp hoặc phân tích.

API gợi ý: `POST /api/chatbot` (body: `{ message, courseId?, sessionId? }`), trả về `{ reply }`.

---

## 7. Triển khai & dữ liệu thử nghiệm (PI 4.1, 4.2)

- **Hosting:**  
  - Next.js: Vercel (khuyến nghị) hoặc VPS (PM2 + Nginx).  
  - Nếu tách API: Render, Railway, hoặc VPS.
- **MongoDB:** Atlas (free tier), kết nối bằng `MONGODB_URI` trong `.env`.
- **Dữ liệu thử nghiệm:**  
  - Script seed (Node + Mongoose): 100 user (admin, instructor, student), 30 khóa học, 50 bài học/bài tập (có thể đính kèm file mô phỏng).  
  - Chạy một lần: `node scripts/seed.js` hoặc `npm run seed`.

---

## 8. Lộ trình thực hiện (gợi ý)

| Giai đoạn | Nội dung |
|-----------|----------|
| **1. Khởi tạo** | Tạo project Next.js, cấu hình MongoDB (Mongoose), env, cấu trúc thư mục như trên. |
| **2. Auth & User (UC1)** | Models User, API đăng ký/đăng nhập, session (NextAuth), trang login/register/profile, middleware phân quyền. |
| **3. Khóa học (UC2)** | Models Course, Enrollment; CRUD API courses; trang danh sách/chi tiết khóa, trang instructor/admin. |
| **4. Bài học & Bài tập (UC3)** | Models Lesson, Exercise; API lessons, exercises, enrollments (tiến độ); trang học bài, làm bài, nộp bài. |
| **5. Thanh toán (UC4)** | Model Payment; API tạo/hồi đáp thanh toán (Stripe hoặc mô phỏng); trang checkout, lịch sử. |
| **6. Cộng đồng (UC5)** | Models Post, Comment; API posts, comments; trang community, discussion trong khóa. |
| **7. Chatbot** | API `/api/chatbot`, rule-based hoặc OpenAI, component chat trên layout/một số trang. |
| **8. Seed & Deploy** | Script seed đủ 100 user, 30 khóa, 50 bài; deploy Next.js + MongoDB Atlas; kiểm tra trên Internet. |

---

## 9. Checklist đáp ứng SRS

> 📄 Chi tiết tài liệu: xem file **[TAILIEU_SRS_XTECH.md](TAILIEU_SRS_XTECH.md)**

- [x] **1.1** Sơ đồ BPMN quy trình nghiệp vụ + mô tả chi tiết. → *6 sơ đồ BPMN (Mermaid): Đăng ký/Đăng nhập, Quản lý khóa học, Đăng ký & Học, Thanh toán, Cộng đồng, Chatbot*
- [x] **1.2** Bảng yêu cầu chức năng & phi chức năng. → *39 yêu cầu chức năng (FR-01 → FR-39) + 18 yêu cầu phi chức năng (NFR-01 → NFR-18)*
- [x] **1.3** Sơ đồ UC tổng quát (5 UC chính) + đặc tả từng UC. → *Sơ đồ UC tổng quát (Mermaid) + 5 bảng đặc tả chi tiết*
- [x] **2.1** Sơ đồ CSDL MongoDB (có thể export từ Mongoose schema hoặc vẽ tay). → *Sơ đồ ER (Mermaid) + bảng chi tiết 10 collections*
- [x] **2.2** Bản thiết kế kiến trúc UML (MVC). → *4 sơ đồ: Kiến trúc tổng quan, MVC chi tiết, Sequence diagram, Bảng ánh xạ MVC*
- [ ] **2.3** Mockup Figma các giao diện chính.
- [x] **3.1** CSDL MongoDB xây bằng Mongoose. → *10 Mongoose models đã triển khai*
- [x] **3.2** Có thành phần server (API Next.js hoặc Node riêng). → *Express.js backend với 13 route groups, 12 controllers*
- [x] **3.3** Thi công đủ 5 UC theo thiết kế. → *5 UC đầy đủ: User, Course, Lesson/Exercise, Payment, Community*
- [x] **3.4** Tích hợp chatbot hỗ trợ học tập. → *Gemini AI + rule-based fallback, lưu log ChatbotLog*
- [ ] **4.1** Triển khai server/website ra Internet.
- [x] **4.2** Seed 100 user, 30 khóa học, 50 bài học/bài tập. → *Script seed.js đã chạy thành công*

---

Bạn có thể bắt đầu từ **Bước 1 (Khởi tạo project Next.js + MongoDB)**. Nếu bạn muốn, tôi có thể viết giúp: cấu trúc thư mục, file kết nối Mongoose, và vài API đầu tiên (auth, courses) để bạn code tiếp theo đúng phương án này.
