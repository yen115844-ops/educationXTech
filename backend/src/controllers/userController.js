const User = require('../models/User');

const list = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(filter).select('-password').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments(filter),
    ]);
    res.success({ users, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const getProfile = async (req, res) => {
  try {
    res.success({ user: req.user });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const getById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.error('Không tìm thấy người dùng', 404, 'NOT_FOUND');
    }
    res.success({ user });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, avatar } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (avatar !== undefined) update.avatar = avatar;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      update,
      { new: true }
    ).select('-password');
    res.success({ user });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.error('Cần currentPassword và newPassword', 400, 'VALIDATION_ERROR');
    }
    if (newPassword.length < 6) {
      return res.error('Mật khẩu mới tối thiểu 6 ký tự', 400, 'VALIDATION_ERROR');
    }
    const user = await User.findById(req.user._id).select('+password');
    const match = await user.comparePassword(currentPassword);
    if (!match) {
      return res.error('Mật khẩu hiện tại không đúng', 400, 'VALIDATION_ERROR');
    }
    user.password = newPassword;
    await user.save();
    res.success(null, { message: 'Đổi mật khẩu thành công' });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const updateById = async (req, res) => {
  try {
    const { name, role, avatar } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (role !== undefined && ['admin', 'instructor', 'student'].includes(role)) update.role = role;
    if (avatar !== undefined) update.avatar = avatar;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true }
    ).select('-password');
    if (!user) {
      return res.error('Không tìm thấy người dùng', 404, 'NOT_FOUND');
    }
    res.success({ user });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const deleteById = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.error('Không tìm thấy người dùng', 404, 'NOT_FOUND');
    }
    res.success(null, { message: 'Đã xóa người dùng' });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

module.exports = {
  list,
  getProfile,
  getById,
  updateProfile,
  changePassword,
  updateById,
  deleteById,
};
