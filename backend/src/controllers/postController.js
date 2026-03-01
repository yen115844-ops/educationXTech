const Post = require('../models/Post');
const Comment = require('../models/Comment');

const list = async (req, res) => {
  try {
    const { page = 1, limit = 20, courseId, type, search } = req.query;
    const filter = {};
    if (courseId) filter.courseId = courseId;
    if (type) filter.type = type;
    if (search) {
      filter.$or = [
        { title: new RegExp(search, 'i') },
        { content: new RegExp(search, 'i') },
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [posts, total] = await Promise.all([
      Post.find(filter)
        .populate('userId', 'name email avatar')
        .populate('courseId', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Post.countDocuments(filter),
    ]);
    res.success({ posts, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const getById = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('userId', 'name email avatar')
      .populate('courseId', 'title');
    if (!post) {
      return res.error('Không tìm thấy bài viết', 404, 'NOT_FOUND');
    }
    const comments = await Comment.find({ postId: post._id })
      .populate('userId', 'name email avatar')
      .sort({ createdAt: 1 });
    res.success({ post, comments });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const create = async (req, res) => {
  try {
    const title = (req.body.title != null && String(req.body.title).trim()) ? String(req.body.title).trim() : '';
    const content = (req.body.content != null && String(req.body.content).trim()) ? String(req.body.content).trim() : '';
    const type = req.body.type === 'share' ? 'share' : 'question';
    const courseId = req.body.courseId || null;
    if (!title) {
      return res.error('Vui lòng nhập tiêu đề', 400, 'VALIDATION_ERROR');
    }
    if (!content) {
      return res.error('Vui lòng nhập nội dung', 400, 'VALIDATION_ERROR');
    }
    const post = await Post.create({
      userId: req.user._id,
      courseId: courseId || null,
      title,
      content,
      type,
    });
    const populated = await post.populate('userId', 'name email avatar');
    res.success({ post: populated }, { statusCode: 201 });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const update = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.error('Không tìm thấy bài viết', 404, 'NOT_FOUND');
    }
    if (post.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.error('Không có quyền sửa', 403, 'FORBIDDEN');
    }
    const title = req.body.title !== undefined ? String(req.body.title).trim() : undefined;
    const content = req.body.content !== undefined ? String(req.body.content).trim() : undefined;
    const type = req.body.type === 'share' ? 'share' : req.body.type === 'question' ? 'question' : undefined;
    const courseId = req.body.courseId !== undefined ? (req.body.courseId || null) : undefined;
    if (title !== undefined) {
      if (!title) return res.error('Tiêu đề không được để trống', 400, 'VALIDATION_ERROR');
      post.title = title;
    }
    if (content !== undefined) {
      if (!content) return res.error('Nội dung không được để trống', 400, 'VALIDATION_ERROR');
      post.content = content;
    }
    if (type !== undefined) post.type = type;
    if (courseId !== undefined) post.courseId = courseId;
    await post.save();
    const populated = await post.populate('userId', 'name email avatar');
    res.success({ post: populated });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const remove = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.error('Không tìm thấy bài viết', 404, 'NOT_FOUND');
    }
    if (post.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.error('Không có quyền xóa', 403, 'FORBIDDEN');
    }
    await Comment.deleteMany({ postId: post._id });
    await post.deleteOne();
    res.success(null, { message: 'Đã xóa bài viết' });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

module.exports = { list, getById, create, update, remove };
