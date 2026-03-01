const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Exercise = require('../models/Exercise');
const Post = require('../models/Post');
const Enrollment = require('../models/Enrollment');

const list = async (req, res) => {
  try {
    const { page = 1, limit = 12, published, instructorId, search, price, sort } = req.query;
    const filter = {};
    if (published !== undefined) filter.isPublished = published === 'true';
    if (instructorId) filter.instructorId = instructorId;
    if (search) {
      filter.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') },
      ];
    }
    if (price === 'free') filter.price = 0;
    if (price === 'paid') filter.price = { $gt: 0 };
    const sortOpt = sort === 'price_asc' ? { price: 1, createdAt: -1 } : sort === 'price_desc' ? { price: -1, createdAt: -1 } : { createdAt: -1 };
    const skip = (Number(page) - 1) * Number(limit);
    const [courses, total] = await Promise.all([
      Course.find(filter)
        .populate('instructorId', 'name email avatar')
        .sort(sortOpt)
        .skip(skip)
        .limit(Number(limit)),
      Course.countDocuments(filter),
    ]);
    res.success({ courses, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const getById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate(
      'instructorId',
      'name email avatar'
    );
    if (!course) {
      return res.error('Không tìm thấy khóa học', 404, 'NOT_FOUND');
    }
    const instructorId = course.instructorId?._id || course.instructorId;
    if (!course.isPublished) {
      if (!req.user) return res.error('Khóa học chưa công bố', 404, 'NOT_FOUND');
      if (req.user.role !== 'admin' && instructorId?.toString() !== req.user._id.toString()) {
        return res.error('Khóa học chưa công bố', 404, 'NOT_FOUND');
      }
    }
    res.success({ course });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const create = async (req, res) => {
  try {
    const title = (req.body.title != null && String(req.body.title).trim()) ? String(req.body.title).trim() : '';
    const description = req.body.description != null ? String(req.body.description).trim() : '';
    const price = Math.max(0, Number(req.body.price)) || 0;
    const thumbnail = (req.body.thumbnail != null && String(req.body.thumbnail).trim()) ? String(req.body.thumbnail).trim() : null;
    if (!title) {
      return res.error('Thiếu tiêu đề', 400, 'VALIDATION_ERROR');
    }
    const course = await Course.create({
      title,
      description: description || '',
      price,
      thumbnail,
      instructorId: req.user._id,
      isPublished: false,
    });
    const populated = await course.populate('instructorId', 'name email avatar');
    res.success({ course: populated }, { statusCode: 201 });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const update = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.error('Không tìm thấy khóa học', 404, 'NOT_FOUND');
    }
    const canEdit = req.user.role === 'admin' || course.instructorId.toString() === req.user._id.toString();
    if (!canEdit) {
      return res.error('Không có quyền sửa khóa học', 403, 'FORBIDDEN');
    }
    const { title, description, price, thumbnail, isPublished } = req.body;
    if (title !== undefined) {
      const t = (title != null && String(title).trim()) ? String(title).trim() : '';
      if (!t) return res.error('Tiêu đề không được để trống', 400, 'VALIDATION_ERROR');
      course.title = t;
    }
    if (description !== undefined) course.description = String(description ?? '').trim();
    if (price !== undefined) course.price = Math.max(0, Number(price)) || 0;
    if (thumbnail !== undefined) course.thumbnail = (thumbnail != null && String(thumbnail).trim()) ? String(thumbnail).trim() : null;
    if (isPublished !== undefined && (req.user.role === 'admin' || req.user.role === 'instructor')) {
      course.isPublished = isPublished;
    }
    await course.save();
    const populated = await course.populate('instructorId', 'name email avatar');
    res.success({ course: populated });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const remove = async (req, res) => {
  try {
    const course = await Course.findOne({
      _id: req.params.id,
      $or: [
        { instructorId: req.user._id },
        ...(req.user.role === 'admin' ? [{}] : []),
      ],
    });
    if (!course) {
      return res.error('Không tìm thấy khóa học hoặc không có quyền', 404, 'NOT_FOUND');
    }
    const courseId = course._id;
    await Promise.all([
      Lesson.deleteMany({ courseId }),
      Exercise.deleteMany({ courseId }),
      Post.updateMany({ courseId }, { $set: { courseId: null } }),
    ]);
    await course.deleteOne();
    res.success(null, { message: 'Đã xóa khóa học' });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const myCourses = async (req, res) => {
  try {
    const list = req.user.role === 'instructor'
      ? await Course.find({ instructorId: req.user._id })
          .populate('instructorId', 'name email avatar')
          .sort({ updatedAt: -1 })
      : await Enrollment.find({ userId: req.user._id })
          .populate({
            path: 'courseId',
            populate: { path: 'instructorId', select: 'name email avatar' },
          })
          .sort({ updatedAt: -1 })
          .then((ens) => ens.map((e) => e.courseId).filter(Boolean));
    res.success({ courses: list });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

module.exports = { list, getById, create, update, remove, myCourses };
