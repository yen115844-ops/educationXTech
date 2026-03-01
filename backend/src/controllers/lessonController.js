const Lesson = require('../models/Lesson');
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
    const lessons = await Lesson.find({ courseId }).sort({ order: 1, createdAt: 1 });
    res.success({ lessons });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const getById = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).populate('courseId', 'title instructorId');
    if (!lesson) {
      return res.error('Không tìm thấy bài học', 404, 'NOT_FOUND');
    }
    const course = await Course.findById(lesson.courseId._id || lesson.courseId);
    if (!course) {
      return res.error('Khóa học không tồn tại', 404, 'NOT_FOUND');
    }
    if (!course.isPublished && req.user?.role !== 'admin' && req.user?._id?.toString() !== course.instructorId?.toString()) {
      return res.error('Không có quyền xem', 404, 'NOT_FOUND');
    }
    res.success({ lesson });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const create = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { title, order, content, videoUrl, duration } = req.body;
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
    const lesson = await Lesson.create({
      courseId,
      title,
      order: order ?? 0,
      content: content || '',
      videoUrl: videoUrl || null,
      duration: duration ?? 0,
    });
    res.success({ lesson }, { statusCode: 201 });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const update = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).populate('courseId', 'instructorId');
    if (!lesson) {
      return res.error('Không tìm thấy bài học', 404, 'NOT_FOUND');
    }
    const canEdit = req.user.role === 'admin' || (lesson.courseId && lesson.courseId.instructorId?.toString() === req.user._id.toString());
    if (!canEdit) {
      return res.error('Không có quyền sửa', 403, 'FORBIDDEN');
    }
    const { title, order, content, videoUrl, duration } = req.body;
    if (title !== undefined) lesson.title = title;
    if (order !== undefined) lesson.order = order;
    if (content !== undefined) lesson.content = content;
    if (videoUrl !== undefined) lesson.videoUrl = videoUrl;
    if (duration !== undefined) lesson.duration = duration;
    await lesson.save();
    res.success({ lesson });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const remove = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id).populate('courseId', 'instructorId');
    if (!lesson) {
      return res.error('Không tìm thấy bài học', 404, 'NOT_FOUND');
    }
    const canDelete = req.user.role === 'admin' || (lesson.courseId && lesson.courseId.instructorId?.toString() === req.user._id.toString());
    if (!canDelete) {
      return res.error('Không có quyền xóa', 403, 'FORBIDDEN');
    }
    await lesson.deleteOne();
    res.success(null, { message: 'Đã xóa bài học' });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

module.exports = { listByCourse, getById, create, update, remove };
