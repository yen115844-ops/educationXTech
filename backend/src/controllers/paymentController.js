const Payment = require('../models/Payment');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const momoService = require('../services/momo');

async function finalizeMomoSuccess(payment) {
  payment.status = 'completed';
  payment.paidAt = new Date();
  await payment.save();
  await Enrollment.findOneAndUpdate(
    { userId: payment.userId, courseId: payment.courseId },
    { $set: { userId: payment.userId, courseId: payment.courseId } },
    { upsert: true }
  );
}

async function finalizeMomoFailed(payment) {
  payment.status = 'failed';
  await payment.save();
}

const create = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await Course.findById(courseId);
    if (!course) {
      return res.error('Không tìm thấy khóa học', 404, 'NOT_FOUND');
    }
    const amount = course.price ?? 0;
    const method = req.body.method || 'mock';

    if (method === 'momo') {
      if (amount < momoService.MOMO_MIN_AMOUNT) {
        return res.error(
          `Thanh toán Momo yêu cầu tối thiểu ${momoService.MOMO_MIN_AMOUNT.toLocaleString('vi-VN')} VND. Khóa học này ${amount === 0 ? 'miễn phí' : 'có giá thấp hơn'}.`,
          400,
          'VALIDATION_ERROR'
        );
      }
      if (amount > momoService.MOMO_MAX_AMOUNT) {
        return res.error(`Số tiền vượt quá giới hạn Momo (${(momoService.MOMO_MAX_AMOUNT / 1e6).toFixed(0)}M VND).`, 400, 'VALIDATION_ERROR');
      }

      const orderId = `XTech_${courseId}_${req.user._id}_${Date.now()}`;
      let payment = await Payment.findOne({ transactionId: orderId, status: 'pending' });
      if (!payment) {
        payment = await Payment.create({
          userId: req.user._id,
          courseId,
          amount,
          method: 'momo',
          status: 'pending',
          transactionId: orderId,
        });
      }

      const publicApiBase = momoService.getPublicApiBaseUrl();
      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
      const momoResult = await momoService.createPayment({
        orderId,
        amount,
        orderInfo: `Thanh toán khóa học: ${course.title}`,
        redirectUrl: `${frontendUrl}/payments/return`,
        ipnUrl: `${publicApiBase}/api/payments/momo/ipn`,
        requestId: `req_${Date.now()}_${orderId}`,
        lang: 'vi',
      });

      if (!momoResult.success) {
        return res.error(momoResult.message || 'Không tạo được link thanh toán Momo', 400, 'VALIDATION_ERROR');
      }

      const populated = await payment.populate([
        { path: 'courseId', select: 'title price' },
        { path: 'userId', select: 'name email' },
      ]);
      return res.success({ payment: populated, payUrl: momoResult.payUrl }, { statusCode: 201 });
    }

    const payment = await Payment.create({
      userId: req.user._id,
      courseId,
      amount,
      method,
      status: 'pending',
      transactionId: req.body.transactionId || `TXN-${Date.now()}-${req.user._id}`,
    });
    const populated = await payment.populate([
      { path: 'courseId', select: 'title price' },
      { path: 'userId', select: 'name email' },
    ]);
    res.success({ payment: populated }, { statusCode: 201 });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const confirm = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await Payment.findOne({
      _id: paymentId,
      userId: req.user._id,
    }).populate('courseId', 'title price');
    if (!payment) {
      return res.error('Không tìm thấy thanh toán', 404, 'NOT_FOUND');
    }
    if (payment.status !== 'pending') {
      return res.error('Thanh toán đã xử lý', 400, 'VALIDATION_ERROR');
    }
    payment.status = 'completed';
    payment.paidAt = new Date();
    await payment.save();
    await Enrollment.findOneAndUpdate(
      { userId: req.user._id, courseId: payment.courseId._id },
      { $set: { userId: req.user._id, courseId: payment.courseId._id } },
      { upsert: true }
    );
    res.success({ payment });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const myPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id })
      .populate('courseId', 'title price thumbnail')
      .sort({ createdAt: -1 });
    res.success({ payments });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const getById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('courseId', 'title price')
      .populate('userId', 'name email');
    if (!payment) {
      return res.error('Không tìm thấy thanh toán', 404, 'NOT_FOUND');
    }
    if (payment.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.error('Không có quyền xem', 403, 'FORBIDDEN');
    }
    res.success({ payment });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

const listAll = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .populate('userId', 'name email')
        .populate('courseId', 'title price')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Payment.countDocuments(filter),
    ]);
    res.success({ payments, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

/**
 * IPN (Instant Payment Notification) từ Momo - không dùng auth.
 * Momo gửi POST JSON. Phải xác thực chữ ký và khớp partnerCode, amount với DB.
 * Thành công xử lý: HTTP 204 (trong 15s). Chữ ký sai / amount sai: 400 để MoMo biết chưa nhận hợp lệ.
 * @see https://developers.momo.vn/v3/docs/payment/api/result-handling/notification
 */
const momoIpn = async (req, res) => {
  try {
    const body = req.body;
    const config = momoService.getConfig();
    const secretKey = config.secretKey;
    const accessKey = config.accessKey;
    if (!secretKey || !accessKey) {
      res.status(503).end();
      return;
    }

    const isValid = momoService.verifyIpnSignature(secretKey, body, accessKey);
    if (!isValid) {
      res.status(400).end();
      return;
    }

    if (body.partnerCode !== config.partnerCode) {
      res.status(400).end();
      return;
    }

    const orderId = body.orderId;
    const payment = await Payment.findOne({ transactionId: orderId });
    if (!payment) {
      res.status(204).end();
      return;
    }
    if (payment.status !== 'pending') {
      res.status(204).end();
      return;
    }

    if (Number(body.amount) !== Number(payment.amount)) {
      res.status(400).end();
      return;
    }

    const success = momoService.isMomoSuccessResultCode(body.resultCode);
    if (success) {
      await finalizeMomoSuccess(payment);
    } else {
      await finalizeMomoFailed(payment);
    }

    res.status(204).end();
  } catch (err) {
    console.error('Momo IPN error:', err);
    res.status(500).end();
  }
};

/**
 * Sau redirect từ MoMo: tra cứu API query để đồng bộ DB (khi IPN chậm hoặc môi trường không nhận IPN).
 * Chỉ giao dịch của user đang đăng nhập.
 */
const momoSync = async (req, res) => {
  try {
    const orderId = req.body?.orderId;
    if (!orderId || typeof orderId !== 'string') {
      return res.error('Thiếu orderId', 400, 'VALIDATION_ERROR');
    }

    const payment = await Payment.findOne({
      transactionId: orderId,
      userId: req.user._id,
      method: 'momo',
    });
    if (!payment) {
      return res.error('Không tìm thấy giao dịch', 404, 'NOT_FOUND');
    }
    if (payment.status === 'completed') {
      const populated = await Payment.findById(payment._id).populate([
        { path: 'courseId', select: 'title price thumbnail' },
        { path: 'userId', select: 'name email' },
      ]);
      return res.success({ payment: populated, synced: false });
    }
    if (payment.status === 'failed') {
      return res.error('Giao dịch đã thất bại', 400, 'VALIDATION_ERROR');
    }

    const q = await momoService.queryTransaction(orderId);
    if (!q.success) {
      return res.error(q.message || 'Không tra cứu được MoMo', 502, 'BAD_GATEWAY');
    }

    const data = q.data;
    const cfg = momoService.getConfig();
    if (data.partnerCode !== cfg.partnerCode || Number(data.amount) !== Number(payment.amount)) {
      return res.error('Dữ liệu giao dịch không khớp', 400, 'VALIDATION_ERROR');
    }

    if (momoService.isMomoSuccessResultCode(data.resultCode)) {
      await finalizeMomoSuccess(payment);
    } else {
      await finalizeMomoFailed(payment);
    }

    const populated = await Payment.findById(payment._id).populate([
      { path: 'courseId', select: 'title price thumbnail' },
      { path: 'userId', select: 'name email' },
    ]);
    return res.success({ payment: populated, synced: true });
  } catch (err) {
    res.error(err.message, 500, 'SERVER_ERROR');
  }
};

module.exports = { create, confirm, myPayments, getById, listAll, momoIpn, momoSync };
