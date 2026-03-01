const { success, error } = require('../utils/response');

/**
 * Gắn res.success() và res.error() theo format chung.
 * Dùng trong controller: res.success(data), res.error('Lỗi', 404)
 */
function responseMiddleware(req, res, next) {
  res.success = (data, options) => success(res, data, options);
  res.error = (message, statusCodeOrOptions, code) => {
    let opts = {};
    if (typeof statusCodeOrOptions === 'number') {
      opts = { statusCode: statusCodeOrOptions };
      if (code) opts.code = code;
    } else if (statusCodeOrOptions && typeof statusCodeOrOptions === 'object') {
      opts = { ...statusCodeOrOptions };
    }
    error(res, message, opts);
  };
  next();
}

module.exports = responseMiddleware;
