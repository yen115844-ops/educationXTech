/**
 * Format phản hồi API thống nhất cho frontend.
 *
 * Success: { success: true, data?, message? }
 * Error:   { success: false, message, code? }
 *
 * Frontend có thể xử lý:
 * - if (res.success) → dùng res.data
 * - else → hiển thị res.message, switch theo res.code (optional)
 */

const success = (res, data = null, options = {}) => {
  const { message, statusCode = 200 } = options;
  const body = { success: true };
  if (data !== null && data !== undefined) body.data = data;
  if (message) body.message = message;
  res.status(statusCode).json(body);
};

const error = (res, message, options = {}) => {
  const { statusCode = 400, code } = options;
  const body = { success: false, message };
  if (code) body.code = code;
  res.status(statusCode).json(body);
};

module.exports = { success, error };
