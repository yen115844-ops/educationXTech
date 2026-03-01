const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendResetPasswordEmail } = require('../services/email');

const register = async (req, res) => {
  try {
    const { email, password, name, role = 'student' } = req.body;
    if (!email || !password || !name) {
      return res.error('Thiếu email, password hoặc name', 400, 'VALIDATION_ERROR');
    }
    if (password.length < 6) {
      return res.error('Mật khẩu tối thiểu 6 ký tự', 400, 'VALIDATION_ERROR');
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.error('Email đã được sử dụng', 400, 'CONFLICT');
    }
    const allowedRoles = ['student', 'instructor', 'admin'];
    const userRole = allowedRoles.includes(role) ? role : 'student';
    const user = await User.create({
      email,
      password,
      name,
      role: userRole,
    });
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    const u = user.toObject();
    delete u.password;
    res.success({ user: u, token }, { statusCode: 201 });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.error('Thiếu email hoặc password', 400, 'VALIDATION_ERROR');
    }
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.error('Email hoặc mật khẩu không đúng', 401, 'UNAUTHORIZED');
    }
    const match = await user.comparePassword(password);
    if (!match) {
      return res.error('Email hoặc mật khẩu không đúng', 401, 'UNAUTHORIZED');
    }
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    const u = user.toObject();
    delete u.password;
    res.success({ user: u, token });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const getMe = async (req, res) => {
  try {
    res.success({ user: req.user });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

/**
 * POST /api/auth/forgot-password
 * Gửi mã OTP 6 chữ số qua email, hạn 15 phút.
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.error('Vui lòng nhập email', 400, 'VALIDATION_ERROR');
    }
    const user = await User.findOne({ email });
    if (!user) {
      // Không tiết lộ email có tồn tại hay không (bảo mật)
      return res.success(null, { message: 'Nếu email tồn tại, mã xác nhận đã được gửi.' });
    }

    // Tạo mã OTP 6 chữ số
    const code = crypto.randomInt(100000, 999999).toString();
    user.resetPasswordCode = code;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 phút
    await user.save();

    await sendResetPasswordEmail(email, code);

    res.success(null, { message: 'Mã xác nhận đã được gửi đến email của bạn.' });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

/**
 * POST /api/auth/verify-reset-code
 * Xác minh mã OTP, trả về tạm token cho bước đặt lại mật khẩu.
 */
const verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.error('Cần email và mã xác nhận', 400, 'VALIDATION_ERROR');
    }
    const user = await User.findOne({
      email,
      resetPasswordCode: code,
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) {
      return res.error('Mã xác nhận không đúng hoặc đã hết hạn', 400, 'INVALID_CODE');
    }

    // Tạo token tạm thời cho reset password (5 phút)
    const resetToken = jwt.sign(
      { userId: user._id, purpose: 'reset-password' },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );

    res.success({ resetToken }, { message: 'Mã xác nhận hợp lệ.' });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

/**
 * POST /api/auth/reset-password
 * Đặt lại mật khẩu mới bằng resetToken.
 */
const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.error('Cần resetToken và newPassword', 400, 'VALIDATION_ERROR');
    }
    if (newPassword.length < 6) {
      return res.error('Mật khẩu mới tối thiểu 6 ký tự', 400, 'VALIDATION_ERROR');
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return res.error('Token không hợp lệ hoặc đã hết hạn', 400, 'INVALID_TOKEN');
    }

    if (decoded.purpose !== 'reset-password') {
      return res.error('Token không hợp lệ', 400, 'INVALID_TOKEN');
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.error('Người dùng không tồn tại', 404, 'NOT_FOUND');
    }

    user.password = newPassword;
    user.resetPasswordCode = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.success(null, { message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập.' });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

module.exports = { register, login, getMe, forgotPassword, verifyResetCode, resetPassword };
