const Submission = require('../models/Submission');
const Exercise = require('../models/Exercise');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

/**
 * POST /api/submissions/:exerciseId
 * Nộp bài tập – tự động chấm điểm quiz
 */
const submit = async (req, res) => {
  try {
    const { exerciseId } = req.params;
    const { answers } = req.body;

    if (!answers || !Array.isArray(answers)) {
      return res.error('Thiếu câu trả lời', 400, 'VALIDATION_ERROR');
    }

    const exercise = await Exercise.findById(exerciseId);
    if (!exercise) return res.error('Không tìm thấy bài tập', 404, 'NOT_FOUND');

    // Kiểm tra đã đăng ký khóa học chưa
    const enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId: exercise.courseId,
    });
    if (!enrollment && req.user.role !== 'admin') {
      return res.error('Bạn chưa đăng ký khóa học này', 403, 'FORBIDDEN');
    }

    if (req.user.role === 'student' && exercise.lessonId) {
      const completedSet = new Set((enrollment?.completedLessons || []).map((id) => id.toString()));
      if (!completedSet.has(exercise.lessonId.toString())) {
        return res.error('Bạn cần hoàn thành video bài học trước khi nộp bài tập này', 403, 'LESSON_NOT_COMPLETED');
      }
    }

    // Kiểm tra đã nộp chưa (cho phép nộp lại)
    let submission = await Submission.findOne({
      userId: req.user._id,
      exerciseId,
    });

    // Tự động chấm điểm cho quiz
    let score = 0;
    let totalPoints = 0;
    const questions = exercise.questions || [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const pts = q.points || 1;
      totalPoints += pts;
      const userAnswer = answers.find((a) => a.questionIndex === i);
      if (userAnswer && String(userAnswer.answer) === String(q.correctAnswer)) {
        score += pts;
      }
    }

    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;

    if (submission) {
      // Cập nhật lần nộp mới
      submission.answers = answers;
      submission.score = score;
      submission.totalPoints = totalPoints;
      submission.percentage = percentage;
      submission.submittedAt = new Date();
      await submission.save();
    } else {
      submission = await Submission.create({
        userId: req.user._id,
        exerciseId,
        courseId: exercise.courseId,
        answers,
        score,
        totalPoints,
        percentage,
      });
    }

    const populated = await submission.populate([
      { path: 'exerciseId', select: 'title type questions' },
      { path: 'userId', select: 'name email' },
    ]);

    res.success({ submission: populated }, { statusCode: submission.isNew ? 201 : 200 });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

/**
 * GET /api/submissions/exercise/:exerciseId/my
 * Xem kết quả nộp bài của mình cho 1 bài tập
 */
const getMySubmission = async (req, res) => {
  try {
    const { exerciseId } = req.params;
    const submission = await Submission.findOne({
      userId: req.user._id,
      exerciseId,
    }).populate('exerciseId', 'title type questions');

    if (!submission) {
      return res.error('Chưa nộp bài tập này', 404, 'NOT_FOUND');
    }
    res.success({ submission });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

/**
 * GET /api/submissions/course/:courseId/my
 * Xem tất cả submissions của mình trong 1 khóa học
 */
const getMySubmissionsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const submissions = await Submission.find({
      userId: req.user._id,
      courseId,
    })
      .populate('exerciseId', 'title type')
      .sort({ submittedAt: -1 });

    res.success({ submissions });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

/**
 * GET /api/submissions/exercise/:exerciseId/all
 * Instructor/Admin xem tất cả submissions cho 1 bài tập
 */
const getAllSubmissionsByExercise = async (req, res) => {
  try {
    const { exerciseId } = req.params;
    const exercise = await Exercise.findById(exerciseId).populate('courseId', 'instructorId');
    if (!exercise) return res.error('Không tìm thấy bài tập', 404, 'NOT_FOUND');

    const canView =
      req.user.role === 'admin' ||
      (exercise.courseId && exercise.courseId.instructorId?.toString() === req.user._id.toString());
    if (!canView) return res.error('Không có quyền xem', 403, 'FORBIDDEN');

    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [submissions, total] = await Promise.all([
      Submission.find({ exerciseId })
        .populate('userId', 'name email avatar')
        .populate('exerciseId', 'title type')
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Submission.countDocuments({ exerciseId }),
    ]);

    res.success({ submissions, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

/**
 * GET /api/submissions/course/:courseId/all
 * Instructor/Admin xem tất cả submissions cho 1 khóa học
 */
const getAllSubmissionsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId);
    if (!course) return res.error('Không tìm thấy khóa học', 404, 'NOT_FOUND');

    const canView =
      req.user.role === 'admin' ||
      course.instructorId?.toString() === req.user._id.toString();
    if (!canView) return res.error('Không có quyền xem', 403, 'FORBIDDEN');

    const { page = 1, limit = 100, exerciseId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = { courseId };
    if (exerciseId) filter.exerciseId = exerciseId;

    const [submissions, total] = await Promise.all([
      Submission.find(filter)
        .populate('userId', 'name email avatar')
        .populate('exerciseId', 'title type questions')
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Submission.countDocuments(filter),
    ]);

    res.success({ submissions, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

module.exports = { submit, getMySubmission, getMySubmissionsByCourse, getAllSubmissionsByExercise, getAllSubmissionsByCourse };
