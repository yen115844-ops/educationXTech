const Comment = require('../models/Comment');
const Post = require('../models/Post');

const listByPost = async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.postId })
      .populate('userId', 'name email avatar')
      .sort({ createdAt: 1 });
    res.success({ comments });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const create = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.error('Thiếu content', 400, 'VALIDATION_ERROR');
    }
    const post = await Post.findById(postId);
    if (!post) {
      return res.error('Không tìm thấy bài viết', 404, 'NOT_FOUND');
    }
    const comment = await Comment.create({
      postId,
      userId: req.user._id,
      content: content.trim(),
    });
    const populated = await comment.populate('userId', 'name email avatar');
    res.success({ comment: populated }, { statusCode: 201 });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const remove = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.error('Không tìm thấy bình luận', 404, 'NOT_FOUND');
    }
    if (comment.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.error('Không có quyền xóa', 403, 'FORBIDDEN');
    }
    await comment.deleteOne();
    res.success(null, { message: 'Đã xóa bình luận' });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const update = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.error('Không tìm thấy bình luận', 404, 'NOT_FOUND');
    }
    if (comment.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.error('Không có quyền sửa', 403, 'FORBIDDEN');
    }
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.error('Nội dung không được để trống', 400, 'VALIDATION_ERROR');
    }
    comment.content = content.trim();
    await comment.save();
    const populated = await comment.populate('userId', 'name email avatar');
    res.success({ comment: populated });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

module.exports = { listByPost, create, remove, update };
