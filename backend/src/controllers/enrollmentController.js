const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');

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
    const { lessonId } = req.body;
    let enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId,
    });
    if (!enrollment) {
      return res.error('Chưa đăng ký khóa học này', 404, 'NOT_FOUND');
    }
    const Lesson = require('../models/Lesson');
    const totalLessons = await Lesson.countDocuments({ courseId });
    if (totalLessons === 0) {
      return res.success({ enrollment });
    }
    const completed = enrollment.completedLessons.map((id) => id.toString());
    if (lessonId && !completed.includes(lessonId)) {
      enrollment.completedLessons.push(lessonId);
    }
    enrollment.progress = Math.min(
      100,
      Math.round((enrollment.completedLessons.length / totalLessons) * 100)
    );
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

module.exports = { enroll, getMyEnrollment, updateProgress, listByUser };
