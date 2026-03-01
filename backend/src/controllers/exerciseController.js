const Exercise = require('../models/Exercise');
const Course = require('../models/Course');

const listByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId);
    if (!course) {
      return res.error('Không tìm thấy khóa học', 404, 'NOT_FOUND');
    }
    if (!course.isPublished && req.user?.role !== 'admin' && req.user?._id?.toString() !== course.instructorId?.toString()) {
      return res.error('Khóa học chưa công bố', 404, 'NOT_FOUND');
    }
    const exercises = await Exercise.find({ courseId }).populate('lessonId', 'title order').sort({ createdAt: -1 });
    res.success({ exercises });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const getById = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id)
      .populate('courseId', 'title instructorId')
      .populate('lessonId', 'title order');
    if (!exercise) {
      return res.error('Không tìm thấy bài tập', 404, 'NOT_FOUND');
    }
    const course = await Course.findById(exercise.courseId._id || exercise.courseId);
    if (!course) {
      return res.error('Khóa học không tồn tại', 404, 'NOT_FOUND');
    }
    if (!course.isPublished && req.user?.role !== 'admin' && req.user?._id?.toString() !== course.instructorId?.toString()) {
      return res.error('Không có quyền xem', 404, 'NOT_FOUND');
    }
    res.success({ exercise });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const create = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, type, lessonId, questions, deadline } = req.body;
    if (!title) {
      return res.error('Thiếu title', 400, 'VALIDATION_ERROR');
    }
    const course = await Course.findOne({
      _id: courseId,
      instructorId: req.user._id,
    });
    if (!course && req.user.role !== 'admin') {
      return res.error('Không tìm thấy khóa học hoặc không có quyền', 404, 'NOT_FOUND');
    }
    const adminCourse = req.user.role === 'admin' ? await Course.findById(courseId) : course;
    if (!adminCourse) {
      return res.error('Không tìm thấy khóa học', 404, 'NOT_FOUND');
    }
    const exercise = await Exercise.create({
      courseId,
      lessonId: lessonId || null,
      title,
      type: type || 'quiz',
      questions: questions || [],
      deadline: deadline || null,
    });
    const populated = await exercise.populate('lessonId', 'title order');
    res.success({ exercise: populated }, { statusCode: 201 });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const update = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id).populate('courseId', 'instructorId');
    if (!exercise) {
      return res.error('Không tìm thấy bài tập', 404, 'NOT_FOUND');
    }
    const canEdit = req.user.role === 'admin' || (exercise.courseId && exercise.courseId.instructorId?.toString() === req.user._id.toString());
    if (!canEdit) {
      return res.error('Không có quyền sửa', 403, 'FORBIDDEN');
    }
    const { title, type, lessonId, questions, deadline } = req.body;
    if (title !== undefined) exercise.title = title;
    if (type !== undefined) exercise.type = type;
    if (lessonId !== undefined) exercise.lessonId = lessonId;
    if (questions !== undefined) exercise.questions = questions;
    if (deadline !== undefined) exercise.deadline = deadline;
    await exercise.save();
    const populated = await exercise.populate('lessonId', 'title order');
    res.success({ exercise: populated });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const remove = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id).populate('courseId', 'instructorId');
    if (!exercise) {
      return res.error('Không tìm thấy bài tập', 404, 'NOT_FOUND');
    }
    const canDelete = req.user.role === 'admin' || (exercise.courseId && exercise.courseId.instructorId?.toString() === req.user._id.toString());
    if (!canDelete) {
      return res.error('Không có quyền xóa', 403, 'FORBIDDEN');
    }
    await exercise.deleteOne();
    res.success(null, { message: 'Đã xóa bài tập' });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

module.exports = { listByCourse, getById, create, update, remove };
