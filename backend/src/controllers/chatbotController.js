const ChatbotLog = require('../models/ChatbotLog');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Enrollment = require('../models/Enrollment');
const Exercise = require('../models/Exercise');
const Submission = require('../models/Submission');
const { askGemini, getModel } = require('../services/gemini');

// ============================================================
// SYSTEM PROMPT cho Gemini
// ============================================================
const SYSTEM_PROMPT = `Bạn là trợ lý học tập AI của website X-Tech — một nền tảng học trực tuyến về công nghệ thông tin.

Nhiệm vụ:
- Hỗ trợ học viên về: đăng ký, đăng nhập, khóa học, bài học, bài tập, thanh toán, tiến độ học, cộng đồng.
- Giải đáp kiến thức liên quan đến các khóa học CNTT (HTML, CSS, JavaScript, React, Node.js, MongoDB, v.v.).
- Trả lời ngắn gọn, thân thiện, dùng tiếng Việt. Có thể dùng emoji phù hợp.
- Nếu được cung cấp context (khóa học đang học, tiến độ, bài tập), hãy sử dụng để trả lời chính xác.
- Nếu không biết, hãy nói thật và gợi ý cách tìm thêm.

Thông tin website:
- Đường dẫn: /courses (danh sách khóa), /dashboard (khóa học của tôi), /community (cộng đồng), /chatbot (chat AI)
- Thanh toán qua MoMo hoặc thanh toán giả lập
- Hỗ trợ 3 vai trò: Admin, Giảng viên, Học viên`;

// ============================================================
// Lấy context từ DB — dữ liệu platform + dữ liệu cá nhân
// ============================================================
async function buildContext(userId) {
  const parts = [];

  try {
    // ---- 1. Dữ liệu platform (luôn lấy, kể cả chưa login) ----
    const [allCourses, lessonCount, exerciseCount, enrollmentCount] = await Promise.all([
      Course.find({ isPublished: true })
        .populate('instructorId', 'name')
        .select('title description price instructorId')
        .sort({ createdAt: -1 })
        .lean(),
      Lesson.countDocuments(),
      Exercise.countDocuments(),
      Enrollment.countDocuments(),
    ]);

    parts.push(`Thống kê website: ${allCourses.length} khóa học, ${lessonCount} bài học, ${exerciseCount} bài tập, ${enrollmentCount} lượt đăng ký.`);

    if (allCourses.length > 0) {
      parts.push('\nDanh sách khóa học trên website:');
      for (const c of allCourses) {
        const instructor = c.instructorId?.name || 'Chưa rõ';
        const price = c.price > 0 ? `${c.price.toLocaleString('vi-VN')}₫` : 'Miễn phí';
        parts.push(`  - "${c.title}" — Giảng viên: ${instructor}, Giá: ${price}`);
      }
    }

    // ---- 2. Dữ liệu cá nhân (chỉ khi đã login) ----
    if (userId) {
      const [enrollments, submissions] = await Promise.all([
        Enrollment.find({ userId })
          .populate('courseId', 'title price')
          .limit(10)
          .lean(),
        Submission.find({ userId })
          .populate('exerciseId', 'title type')
          .sort({ submittedAt: -1 })
          .limit(10)
          .lean(),
      ]);

      if (enrollments.length > 0) {
        parts.push('\nKhóa học bạn đang theo học:');
        for (const e of enrollments) {
          const courseName = e.courseId?.title || 'Không rõ';
          parts.push(`  - "${courseName}" — tiến độ ${e.progress || 0}%`);
        }
      } else {
        parts.push('\nBạn chưa đăng ký khóa học nào.');
      }

      if (submissions.length > 0) {
        parts.push('\nBài tập đã nộp gần đây:');
        for (const s of submissions) {
          const exName = s.exerciseId?.title || 'Không rõ';
          parts.push(`  - "${exName}" — ${s.score}/${s.totalPoints} (${s.percentage}%)`);
        }
      }

      // Bài tập chưa làm
      if (enrollments.length > 0) {
        const courseIds = enrollments.map((e) => e.courseId?._id).filter(Boolean);
        const allExercises = await Exercise.find({ courseId: { $in: courseIds } })
          .select('title courseId')
          .lean();
        const submittedExIds = new Set(submissions.map((s) => s.exerciseId?._id?.toString()));
        const notDone = allExercises.filter((ex) => !submittedExIds.has(ex._id.toString()));
        if (notDone.length > 0) {
          parts.push(`\nBài tập chưa làm: ${notDone.length} bài`);
          for (const ex of notDone.slice(0, 5)) {
            parts.push(`  - "${ex.title}"`);
          }
          if (notDone.length > 5) parts.push(`  ... và ${notDone.length - 5} bài nữa`);
        }
      }
    } else {
      parts.push('\n(Người dùng chưa đăng nhập — không có dữ liệu cá nhân)');
    }
  } catch {
    // Nếu lỗi DB thì trả context rỗng, không crash
  }

  return parts.length > 0 ? '\n\n--- DỮ LIỆU THỰC TẾ TỪ HỆ THỐNG ---\n' + parts.join('\n') : '';
}

// ============================================================
// Fallback rule-based (khi không có Gemini API key)
// ============================================================
const fallbackResponses = {
  dang_ky: 'Bạn vào trang chủ, chọn "Đăng ký", điền email và mật khẩu rồi bấm Đăng ký. 📝',
  dang_nhap: 'Bạn chọn "Đăng nhập" ở góc phải, nhập email và mật khẩu đã đăng ký. 🔑',
  khoa_hoc: 'Danh sách khóa học nằm ở trang /courses. Bạn có thể xem chi tiết và đăng ký học. 📚',
  bai_tap: 'Bài tập nằm trong từng khóa học. Vào khóa đã đăng ký → Bài tập → Làm bài và nộp. ✏️',
  thanh_toan: 'Thanh toán: chọn khóa học, bấm "Mua khóa" và thực hiện qua MoMo hoặc thanh toán giả lập. 💳',
  tien_do: 'Xem tiến độ: vào "Khóa học của tôi" (/dashboard) để xem phần trăm hoàn thành. 📊',
  cong_dong: 'Cộng đồng: vào /community để đặt câu hỏi, chia sẻ, bình luận bài viết. 💬',
};

function getFallbackReply(message) {
  const m = (message || '').toLowerCase().trim();
  if (!m) return 'Xin chào! Tôi là trợ lý X-Tech 🤖. Bạn có thể hỏi về khóa học, bài tập, thanh toán, tiến độ học...';
  if (/đăng ký|đăng ky|dang ky|register|tạo tài khoản/.test(m)) return fallbackResponses.dang_ky;
  if (/đăng nhập|login|dang nhap|đăng nhap/.test(m)) return fallbackResponses.dang_nhap;
  if (/khóa học|khoa hoc|course|khoá/.test(m)) return fallbackResponses.khoa_hoc;
  if (/bài tập|bai tap|exercise|quiz|nộp bài/.test(m)) return fallbackResponses.bai_tap;
  if (/thanh toán|thanh toan|payment|mua|trả tiền/.test(m)) return fallbackResponses.thanh_toan;
  if (/tiến độ|tien do|progress|dashboard|hoàn thành/.test(m)) return fallbackResponses.tien_do;
  if (/cộng đồng|cong dong|community|bình luận|thảo luận/.test(m)) return fallbackResponses.cong_dong;
  if (/xin chào|hello|hi |chào|hey/.test(m)) return 'Xin chào! 👋 Tôi là trợ lý học tập X-Tech. Bạn cần hỗ trợ gì?';
  if (/cảm ơn|thank|cam on/.test(m)) return 'Không có gì! 😊 Nếu cần thêm giúp đỡ, cứ hỏi nhé!';
  return 'Tôi là trợ lý X-Tech 🤖. Hãy hỏi tôi về: đăng ký, khóa học, bài tập, thanh toán, tiến độ, cộng đồng!';
}

// ============================================================
// POST /api/chatbot/chat — Xử lý tin nhắn chat
// ============================================================
const chat = async (req, res) => {
  try {
    const { message, sessionId: clientSessionId } = req.body;
    if (!message || typeof message !== 'string') {
      return res.error('Thiếu message', 400, 'VALIDATION_ERROR');
    }

    const sessionId = clientSessionId || `sess_${Date.now()}_${Math.random().toString(36).slice(2, 15)}`;
    const userId = req.user?._id || null;

    // Tìm hoặc tạo log
    let log = await ChatbotLog.findOne({ sessionId });
    if (!log) {
      log = await ChatbotLog.create({ userId, sessionId, messages: [] });
    }

    let reply;
    const hasGemini = !!getModel();

    if (hasGemini) {
      // ---- Gemini AI mode ----
      const dbContext = await buildContext(userId);
      const fullSystemPrompt = SYSTEM_PROMPT + dbContext;

      // Chuyển lịch sử sang format Gemini (giữ 20 tin gần nhất)
      const recentMessages = log.messages.slice(-20);
      const history = recentMessages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

      try {
        reply = await askGemini(fullSystemPrompt, history, message);
      } catch (err) {
        console.error('Gemini API error:', err.message);
        reply = getFallbackReply(message) + '\n\n_(AI tạm thời không khả dụng, đây là trả lời tự động)_';
      }
    } else {
      // ---- Fallback rule-based ----
      reply = getFallbackReply(message);
    }

    // Lưu tin nhắn
    log.messages.push(
      { role: 'user', content: message },
      { role: 'assistant', content: reply },
    );
    await log.save();

    res.success({ reply, sessionId, mode: hasGemini ? 'ai' : 'rule-based' });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

// ============================================================
// GET /api/chatbot/history/:sessionId — lấy lại lịch sử chat
// ============================================================
const getHistory = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const log = await ChatbotLog.findOne({ sessionId });
    if (!log) return res.error('Không tìm thấy phiên chat', 404, 'NOT_FOUND');
    res.success({ messages: log.messages, sessionId });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

module.exports = { chat, getHistory };
