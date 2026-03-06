const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');

const toIdSet = (ids = []) => new Set(ids.map((id) => id.toString()));

const normalizeCompletedLessons = (enrollment) => {
  const unique = Array.from(toIdSet(enrollment.completedLessons));
  enrollment.completedLessons = unique;
};

const recomputeProgress = async (enrollment) => {
  const totalLessons = await Lesson.countDocuments({ courseId: enrollment.courseId });
  if (totalLessons === 0) {
    enrollment.progress = 0;
    return;
  }
  enrollment.progress = Math.min(
    100,
    Math.round((enrollment.completedLessons.length / totalLessons) * 100)
  );
};

const enroll = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId);
    if (!course) {
      return res.error('Không tìm thấy khóa học', 404, 'NOT_FOUND');
    }
    if (!course.isPublished) {
      return res.error('Khóa học chưa công bố', 400, 'VALIDATION_ERROR');
    }
    const existing = await Enrollment.findOne({
      userId: req.user._id,
      courseId,
    });
    if (existing) {
      return res.error('Đã đăng ký khóa học này', 400, 'CONFLICT');
    }
    const enrollment = await Enrollment.create({
      userId: req.user._id,
      courseId,
    });
    const populated = await enrollment.populate([
      { path: 'courseId', populate: { path: 'instructorId', select: 'name email' } },
      { path: 'userId', select: 'name email' },
    ]);
    res.success({ enrollment: populated }, { statusCode: 201 });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const getMyEnrollment = async (req, res) => {
  try {
    const { courseId } = req.params;
    const enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId,
    }).populate({
      path: 'courseId',
      populate: { path: 'instructorId', select: 'name email avatar' },
    });
    if (!enrollment) {
      return res.error('Chưa đăng ký khóa học này', 404, 'NOT_FOUND');
    }
    res.success({ enrollment });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const updateProgress = async (req, res) => {
  try {
    const { courseId } = req.params;
    let enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId,
    });
    if (!enrollment) {
      return res.error('Chưa đăng ký khóa học này', 404, 'NOT_FOUND');
    }

    normalizeCompletedLessons(enrollment);
    await recomputeProgress(enrollment);
    await enrollment.save();

    enrollment = await enrollment.populate({
      path: 'courseId',
      populate: { path: 'instructorId', select: 'name email avatar' },
    });
    res.success({ enrollment });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const updateLessonWatchProgress = async (req, res) => {
  try {
    const { courseId, lessonId } = req.params;
    const watchedSecondsRaw = Number(req.body?.watchedSeconds || 0);
    const durationSecondsRaw = Number(req.body?.durationSeconds || 0);
    const watchedSeconds = Number.isFinite(watchedSecondsRaw)
      ? Math.max(0, watchedSecondsRaw)
      : 0;
    const durationSeconds = Number.isFinite(durationSecondsRaw)
      ? Math.max(0, durationSecondsRaw)
      : 0;

    let enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId,
    });
    if (!enrollment) {
      return res.error('Chưa đăng ký khóa học này', 404, 'NOT_FOUND');
    }

    const lesson = await Lesson.findOne({ _id: lessonId, courseId });
    if (!lesson) {
      return res.error('Không tìm thấy bài học trong khóa học', 404, 'NOT_FOUND');
    }

    const courseLessons = await Lesson.find({ courseId })
      .sort({ order: 1, createdAt: 1 })
      .select('_id');
    const currentIndex = courseLessons.findIndex((l) => l._id.toString() === lessonId);
    if (currentIndex === -1) {
      return res.error('Không tìm thấy bài học trong danh sách khóa học', 404, 'NOT_FOUND');
    }

    normalizeCompletedLessons(enrollment);
    const completedSet = toIdSet(enrollment.completedLessons);
    const prevNotCompleted = courseLessons
      .slice(0, currentIndex)
      .find((l) => !completedSet.has(l._id.toString()));
    if (prevNotCompleted) {
      return res.error('Bạn cần hoàn thành các bài học trước đó', 403, 'LESSON_LOCKED');
    }

    let stat = enrollment.lessonWatchStats.find(
      (item) => item.lessonId.toString() === lessonId
    );
    if (!stat) {
      stat = {
        lessonId,
        watchedSeconds: 0,
        durationSeconds: 0,
        completedAt: null,
      };
      enrollment.lessonWatchStats.push(stat);
    }

    stat.watchedSeconds = Math.max(stat.watchedSeconds || 0, watchedSeconds);
    stat.durationSeconds = Math.max(stat.durationSeconds || 0, durationSeconds);

    const totalDuration = stat.durationSeconds || durationSeconds;
    const completionThreshold = totalDuration > 0
      ? Math.max(totalDuration * 0.95, totalDuration - 15)
      : 0;

    if (completionThreshold > 0 && stat.watchedSeconds >= completionThreshold) {
      if (!completedSet.has(lessonId)) {
        enrollment.completedLessons.push(lessonId);
        completedSet.add(lessonId);
      }
      if (!stat.completedAt) {
        stat.completedAt = new Date();
      }
    }

    await recomputeProgress(enrollment);
    await enrollment.save();

    enrollment = await enrollment.populate({
      path: 'courseId',
      populate: { path: 'instructorId', select: 'name email avatar' },
    });

    res.success({ enrollment });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const listByUser = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ userId: req.user._id })
      .populate({
        path: 'courseId',
        populate: { path: 'instructorId', select: 'name email avatar' },
      })
      .sort({ updatedAt: -1 });
    res.success({ enrollments });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

module.exports = {
  enroll,
  getMyEnrollment,
  updateProgress,
  updateLessonWatchProgress,
  listByUser,
};
