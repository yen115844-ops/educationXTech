const jwt = require('jsonwebtoken');
const User = require('../models/User');

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

module.exports = { register, login, getMe };
