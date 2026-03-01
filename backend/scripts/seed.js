/**
 * Seed script: 100 users, 30 courses, 50 lessons/exercises (theo SRS 4.2)
 * Chạy: node scripts/seed.js (cần MONGODB_URI trong .env)
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const User = require('../src/models/User');
const Course = require('../src/models/Course');
const Lesson = require('../src/models/Lesson');
const Exercise = require('../src/models/Exercise');
const Enrollment = require('../src/models/Enrollment');
const Payment = require('../src/models/Payment');
const Post = require('../src/models/Post');
const Comment = require('../src/models/Comment');
const Submission = require('../src/models/Submission');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/xtech';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  await User.deleteMany({});
  await Course.deleteMany({});
  await Lesson.deleteMany({});
  await Exercise.deleteMany({});
  await Enrollment.deleteMany({});
  await Payment.deleteMany({});
  await Comment.deleteMany({});
  await Post.deleteMany({});
  await Submission.deleteMany({});

  const users = [];
  users.push(
    await User.create({
      email: 'admin@xtech.vn',
      password: '123456',
      name: 'Admin X-Tech',
      role: 'admin',
    })
  );
  for (let i = 1; i <= 10; i++) {
    users.push(
      await User.create({
        email: `instructor${i}@xtech.vn`,
        password: '123456',
        name: `Giảng viên ${i}`,
        role: 'instructor',
      })
    );
  }
  for (let i = 1; i <= 89; i++) {
    users.push(
      await User.create({
        email: `student${i}@xtech.vn`,
        password: '123456',
        name: `Học viên ${i}`,
        role: 'student',
      })
    );
  }
  console.log('Created 100 users (1 admin, 10 instructors, 89 students)');

  const instructors = users.filter((u) => u.role === 'instructor');
  const students = users.filter((u) => u.role === 'student');
  const courses = [];
  for (let i = 1; i <= 30; i++) {
    const instructor = instructors[(i - 1) % instructors.length];
    courses.push(
      await Course.create({
        title: `Khóa học ${i}: Chủ đề ${i}`,
        description: `Mô tả khóa học số ${i}. Nội dung học tập trực tuyến.`,
        instructorId: instructor._id,
        price: [0, 199000, 299000, 499000][i % 4],
        isPublished: i <= 25,
      })
    );
  }
  console.log('Created 30 courses');

  let lessonCount = 0;
  let exerciseCount = 0;
  const allExercises = [];
  const quizBanks = [
    [
      { question: 'HTML là viết tắt của gì?', options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Home Tool Markup Language'], correctAnswer: 'Hyper Text Markup Language', points: 1 },
      { question: 'CSS dùng để làm gì?', options: ['Tạo cấu trúc trang', 'Tạo giao diện/kiểu dáng', 'Xử lý logic'], correctAnswer: 'Tạo giao diện/kiểu dáng', points: 1 },
      { question: 'JavaScript chạy ở đâu?', options: ['Chỉ trên server', 'Chỉ trên trình duyệt', 'Cả server và trình duyệt'], correctAnswer: 'Cả server và trình duyệt', points: 1 },
    ],
    [
      { question: 'MongoDB là loại CSDL gì?', options: ['SQL', 'NoSQL', 'Graph'], correctAnswer: 'NoSQL', points: 1 },
      { question: 'Node.js sử dụng engine nào?', options: ['SpiderMonkey', 'V8', 'Chakra'], correctAnswer: 'V8', points: 1 },
      { question: 'REST API thường dùng định dạng nào?', options: ['XML', 'JSON', 'CSV'], correctAnswer: 'JSON', points: 2 },
    ],
    [
      { question: 'React là gì?', options: ['Thư viện UI', 'Framework backend', 'Hệ quản trị CSDL'], correctAnswer: 'Thư viện UI', points: 1 },
      { question: 'Virtual DOM giúp gì?', options: ['Tăng tốc render', 'Lưu dữ liệu', 'Kết nối mạng'], correctAnswer: 'Tăng tốc render', points: 1 },
      { question: 'JSX là gì?', options: ['JavaScript XML', 'Java Syntax Extension', 'JSON Extra'], correctAnswer: 'JavaScript XML', points: 1 },
    ],
  ];
  for (let c = 0; c < courses.length; c++) {
    const courseId = courses[c]._id;
    const numLessons = c < 15 ? 2 : 1;
    for (let L = 0; L < numLessons; L++) {
      const lesson = await Lesson.create({
        courseId,
        title: `Bài ${L + 1} - Khóa ${c + 1}`,
        order: L + 1,
        content: `Nội dung bài học mẫu cho Bài ${L + 1} Khóa ${c + 1}.\n\n## Mục tiêu\n- Hiểu kiến thức cơ bản\n- Áp dụng vào thực tế\n\n## Nội dung\nĐây là nội dung chi tiết bài ${L + 1}.`,
        duration: 15 + L * 5,
      });
      lessonCount++;
      if (exerciseCount < 50) {
        const questions = quizBanks[exerciseCount % quizBanks.length];
        const ex = await Exercise.create({
          courseId,
          lessonId: lesson._id,
          title: `Bài tập bài ${L + 1} - Khóa ${c + 1}`,
          type: 'quiz',
          questions,
        });
        allExercises.push(ex);
        exerciseCount++;
      }
    }
  }
  console.log(`Created ${lessonCount} lessons, ${exerciseCount} exercises`);

  for (let s = 0; s < Math.min(50, students.length); s++) {
    const course = courses[s % courses.length];
    if (!course.isPublished) continue;
    await Enrollment.create({
      userId: students[s]._id,
      courseId: course._id,
      progress: (s % 5) * 20,
      completedLessons: [],
    });
  }
  console.log('Created enrollments');

  for (let i = 0; i < 20; i++) {
    await Payment.create({
      userId: students[i % students.length]._id,
      courseId: courses[i % courses.length]._id,
      amount: courses[i % courses.length].price,
      method: 'mock',
      status: i % 3 === 0 ? 'pending' : 'completed',
      paidAt: i % 3 !== 0 ? new Date() : null,
    });
  }
  console.log('Created payments');

  for (let i = 0; i < 15; i++) {
    const post = await Post.create({
      userId: users[1 + (i % 10)]._id,
      courseId: i % 2 === 0 ? courses[i % courses.length]._id : null,
      title: `Bài viết cộng đồng ${i + 1}`,
      content: 'Nội dung bài viết mẫu.',
      type: i % 2 === 0 ? 'question' : 'share',
    });
    if (i % 3 === 0) {
      await Comment.create({
        postId: post._id,
        userId: students[i % students.length]._id,
        content: 'Bình luận mẫu.',
      });
    }
  }
  console.log('Created posts and comments');

  // ---- Submissions (mô phỏng học viên làm bài) ----
  let submissionCount = 0;
  for (let i = 0; i < Math.min(30, allExercises.length); i++) {
    const ex = allExercises[i];
    const qs = ex.questions || [];
    // Vài student làm bài cho mỗi exercise
    for (let s = 0; s < Math.min(3, students.length); s++) {
      const student = students[(i * 3 + s) % students.length];
      const answers = qs.map((q, idx) => {
        // 70% trả lời đúng
        const isCorrect = Math.random() < 0.7;
        return {
          questionIndex: idx,
          answer: isCorrect ? String(q.correctAnswer) : (q.options && q.options[q.options.length - 1]) || 'X',
        };
      });
      let score = 0;
      let totalPoints = 0;
      for (let qi = 0; qi < qs.length; qi++) {
        const pts = qs[qi].points || 1;
        totalPoints += pts;
        if (String(answers[qi]?.answer) === String(qs[qi].correctAnswer)) score += pts;
      }
      const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
      await Submission.create({
        userId: student._id,
        exerciseId: ex._id,
        courseId: ex.courseId,
        answers,
        score,
        totalPoints,
        percentage,
      });
      submissionCount++;
    }
  }
  console.log(`Created ${submissionCount} submissions`);

  await mongoose.disconnect();
  console.log('Seed done.');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
