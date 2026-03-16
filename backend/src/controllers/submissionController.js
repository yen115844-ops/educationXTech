const Submission = require('../models/Submission');
const Exercise = require('../models/Exercise');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

const normalizeAnswer = (value, caseSensitive = false) => {
  if (value == null) return '';
  const text = String(value).trim();
  return caseSensitive ? text : text.toLowerCase();
};

const getQuestionMode = (exerciseType, question = {}) => {
  if (question.inputType) return question.inputType;
  if (exerciseType === 'quiz') return 'choice';
  if (exerciseType === 'coding') return 'code_blank';
  return 'essay';
};

const getTotalPointsFromExercise = (exercise) => {
  const questions = exercise?.questions || [];
  return questions.reduce((sum, q) => sum + Math.max(0, Number(q?.points) || 0), 0);
};

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

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

    // Tự động chấm điểm cho câu hỏi khách quan; tự luận chuyển sang chờ chấm
    let score = 0;
    let totalPoints = 0;
    let hasManualQuestion = false;
    const grading = [];
    const questions = exercise.questions || [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const pts = q.points || 1;
      const userAnswer = answers.find((a) => a.questionIndex === i);

      const mode = getQuestionMode(exercise.type, q);
      if (mode === 'essay') {
        hasManualQuestion = true;
        grading.push({
          questionIndex: i,
          awardedPoints: 0,
          maxPoints: pts,
          comment: '',
          autoGraded: false,
          isCorrect: null,
        });
        continue;
      }

      totalPoints += pts;

      if (mode === 'choice') {
        const isCorrect = Boolean(
          userAnswer && normalizeAnswer(userAnswer.answer, q.caseSensitive) === normalizeAnswer(q.correctAnswer, q.caseSensitive)
        );
        const awarded = isCorrect ? pts : 0;
        score += awarded;
        grading.push({
          questionIndex: i,
          awardedPoints: awarded,
          maxPoints: pts,
          comment: '',
          autoGraded: true,
          isCorrect,
        });
        continue;
      }

      // code_blank
      const blanks = Array.isArray(q.blanks) ? q.blanks.filter((b) => b && b.key) : [];
      if (blanks.length > 0) {
        const submitted =
          userAnswer && userAnswer.answer && typeof userAnswer.answer === 'object'
            ? userAnswer.answer
            : {};
        let correctCount = 0;
        for (const blank of blanks) {
          const actual = normalizeAnswer(submitted[blank.key], q.caseSensitive);
          const expected = normalizeAnswer(blank.answer, q.caseSensitive);
          if (actual !== '' && actual === expected) correctCount += 1;
        }
        const awarded = correctCount > 0 ? (pts * correctCount) / blanks.length : 0;
        score += awarded;
        grading.push({
          questionIndex: i,
          awardedPoints: awarded,
          maxPoints: pts,
          comment: '',
          autoGraded: true,
          isCorrect: correctCount === blanks.length,
        });
        continue;
      }

      // backward compatibility for old coding questions using correctAnswer
      const isCorrect = Boolean(
        userAnswer && normalizeAnswer(userAnswer.answer, q.caseSensitive) === normalizeAnswer(q.correctAnswer, q.caseSensitive)
      );
      const awarded = isCorrect ? pts : 0;
      score += awarded;
      grading.push({
        questionIndex: i,
        awardedPoints: awarded,
        maxPoints: pts,
        comment: '',
        autoGraded: true,
        isCorrect,
      });
    }

    score = round2(score);

    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    const status = hasManualQuestion ? 'pending_review' : 'graded';

    if (submission) {
      // Cập nhật lần nộp mới
      submission.answers = answers;
      submission.score = score;
      submission.totalPoints = totalPoints;
      submission.percentage = percentage;
      submission.status = status;
      submission.grading = grading;
      submission.reviewNote = '';
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
        status,
        grading,
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

/**
 * PATCH /api/submissions/:id/grade
 * Instructor/Admin chấm bài thủ công
 */
const gradeSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { score, totalPoints, perQuestionGrades, reviewNote } = req.body;

    const submission = await Submission.findById(id)
      .populate('exerciseId', 'courseId questions')
      .populate('courseId', 'instructorId');
    if (!submission) {
      return res.error('Không tìm thấy bài nộp', 404, 'NOT_FOUND');
    }

    const course = submission.courseId;
    const canGrade =
      req.user.role === 'admin' ||
      (course && course.instructorId?.toString() === req.user._id.toString());
    if (!canGrade) {
      return res.error('Không có quyền chấm bài', 403, 'FORBIDDEN');
    }

    const questions = submission.exerciseId?.questions || [];
    let nextScore = 0;
    let nextTotalPoints = 0;
    let nextGrading = [];

    if (Array.isArray(perQuestionGrades) && perQuestionGrades.length > 0) {
      const questionPointMap = new Map();
      for (let i = 0; i < questions.length; i++) {
        questionPointMap.set(i, Math.max(0, Number(questions[i]?.points) || 0));
      }

      for (const item of perQuestionGrades) {
        const index = Number(item?.questionIndex);
        if (!Number.isInteger(index) || !questionPointMap.has(index)) {
          return res.error('Có câu chấm không hợp lệ', 400, 'VALIDATION_ERROR');
        }
        const maxPoints = questionPointMap.get(index);
        const rawAwarded = Number(item?.awardedPoints);
        if (!Number.isFinite(rawAwarded) || rawAwarded < 0 || rawAwarded > maxPoints) {
          return res.error(`Điểm câu ${index + 1} không hợp lệ`, 400, 'VALIDATION_ERROR');
        }
      }

      for (let i = 0; i < questions.length; i++) {
        const maxPoints = questionPointMap.get(i);
        const input = perQuestionGrades.find((x) => Number(x?.questionIndex) === i);
        const awarded = input ? round2(Number(input.awardedPoints) || 0) : 0;
        nextTotalPoints += maxPoints;
        nextScore += awarded;
        nextGrading.push({
          questionIndex: i,
          awardedPoints: awarded,
          maxPoints,
          comment: input?.comment ? String(input.comment).trim() : '',
          autoGraded: false,
          isCorrect: awarded === maxPoints ? true : awarded === 0 ? false : null,
        });
      }

      nextScore = round2(nextScore);
      nextTotalPoints = round2(nextTotalPoints);
    } else {
      if (score === undefined || score === null) {
        return res.error('Thiếu điểm chấm', 400, 'VALIDATION_ERROR');
      }
      const exercisePoints = getTotalPointsFromExercise(submission.exerciseId);
      const nextTotalPointsRaw =
        totalPoints !== undefined && totalPoints !== null
          ? Number(totalPoints)
          : submission.totalPoints > 0
            ? Number(submission.totalPoints)
            : exercisePoints;
      nextTotalPoints = Math.max(0, Number.isFinite(nextTotalPointsRaw) ? nextTotalPointsRaw : 0);

      const nextScoreRaw = Number(score);
      if (!Number.isFinite(nextScoreRaw) || nextScoreRaw < 0) {
        return res.error('Điểm chấm không hợp lệ', 400, 'VALIDATION_ERROR');
      }
      if (nextTotalPoints > 0 && nextScoreRaw > nextTotalPoints) {
        return res.error('Điểm chấm không được lớn hơn tổng điểm', 400, 'VALIDATION_ERROR');
      }
      nextScore = round2(nextScoreRaw);

      // backward compatibility: nếu chấm tổng, vẫn lưu 1 bản phân rã đều theo câu
      const count = questions.length || 1;
      const avg = round2(nextScore / count);
      nextGrading = questions.map((q, idx) => ({
        questionIndex: idx,
        awardedPoints: avg,
        maxPoints: Math.max(0, Number(q?.points) || 0),
        comment: '',
        autoGraded: false,
        isCorrect: null,
      }));
    }

    const nextPercentage = nextTotalPoints > 0 ? Math.round((nextScore / nextTotalPoints) * 100) : 0;

    submission.score = nextScore;
    submission.totalPoints = nextTotalPoints;
    submission.percentage = nextPercentage;
    submission.status = 'graded';
    submission.grading = nextGrading;
    if (reviewNote !== undefined) {
      submission.reviewNote = String(reviewNote || '').trim();
    }
    await submission.save();

    const populated = await submission.populate([
      { path: 'userId', select: 'name email avatar' },
      { path: 'exerciseId', select: 'title type questions' },
    ]);

    res.success({ submission: populated });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

module.exports = {
  submit,
  getMySubmission,
  getMySubmissionsByCourse,
  getAllSubmissionsByExercise,
  getAllSubmissionsByCourse,
  gradeSubmission,
};
