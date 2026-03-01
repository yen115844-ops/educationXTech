const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.error('Chưa đăng nhập', 401, 'UNAUTHORIZED');
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.error('Người dùng không tồn tại', 401, 'UNAUTHORIZED');
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.error('Token không hợp lệ', 401, 'UNAUTHORIZED');
    }
    if (err.name === 'TokenExpiredError') {
      return res.error('Token hết hạn', 401, 'TOKEN_EXPIRED');
    }
    return res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    if (user) req.user = user;
    next();
  } catch {
    next();
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.error('Chưa đăng nhập', 401, 'UNAUTHORIZED');
  }
  if (!roles.includes(req.user.role)) {
    return res.error('Không có quyền thực hiện', 403, 'FORBIDDEN');
  }
  next();
};

module.exports = { auth, optionalAuth, requireRole };
