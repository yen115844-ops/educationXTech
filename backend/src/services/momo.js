const crypto = require('crypto');

const MOMO_MIN_AMOUNT = 1000;
const MOMO_MAX_AMOUNT = 50000000;

/**
 * URL API công khai (HTTPS) mà MoMo gọi tới cho IPN.
 * Production: đặt PUBLIC_API_URL = https://api.yourdomain.com (trùng domain IPN đăng ký với MoMo).
 */
function getPublicApiBaseUrl() {
  const raw = process.env.PUBLIC_API_URL || process.env.BASE_URL || 'http://localhost:5000';
  return String(raw).replace(/\/+$/, '');
}

const getConfig = () => {
  const partnerCode = process.env.MOMO_PARTNER_CODE;
  const accessKey = process.env.MOMO_ACCESS_KEY;
  const secretKey = process.env.MOMO_SECRET_KEY;
  const env = process.env.MOMO_ENV || 'test';
  const baseUrl = getPublicApiBaseUrl();
  const baseMomo = env === 'production' ? 'https://payment.momo.vn' : 'https://test-payment.momo.vn';
  return { partnerCode, accessKey, secretKey, baseUrl, baseMomo };
};

/**
 * Tạo chữ ký HMAC SHA256 cho request tạo giao dịch (captureWallet).
 * Thứ tự key a-z: accessKey, amount, extraData, ipnUrl, orderId, orderInfo, partnerCode, redirectUrl, requestId, requestType
 */
function createPaymentSignature(secretKey, payload) {
  const raw = [
    `accessKey=${payload.accessKey}`,
    `amount=${payload.amount}`,
    `extraData=${payload.extraData || ''}`,
    `ipnUrl=${payload.ipnUrl}`,
    `orderId=${payload.orderId}`,
    `orderInfo=${payload.orderInfo}`,
    `partnerCode=${payload.partnerCode}`,
    `redirectUrl=${payload.redirectUrl}`,
    `requestId=${payload.requestId}`,
    `requestType=${payload.requestType}`,
  ].join('&');
  return crypto.createHmac('sha256', secretKey).update(raw).digest('hex');
}

/**
 * IPN: accessKey&amount&extraData&message&orderId&orderInfo&orderType&partnerCode&payType&requestId&responseTime&resultCode&transId
 * Thử ký có/không accessKey (tương thích bản MoMo).
 * @see https://developers.momo.vn/v3/docs/payment/api/wallet/onetime/
 */
function verifyIpnSignature(secretKey, body, accessKey) {
  if (!body?.signature || !body.orderId) return false;
  const parts = [
    `amount=${body.amount}`,
    `extraData=${body.extraData ?? ''}`,
    `message=${body.message ?? ''}`,
    `orderId=${body.orderId}`,
    `orderInfo=${body.orderInfo ?? ''}`,
    `orderType=${body.orderType ?? ''}`,
    `partnerCode=${body.partnerCode}`,
    `payType=${body.payType ?? ''}`,
    `requestId=${body.requestId ?? ''}`,
    `responseTime=${body.responseTime}`,
    `resultCode=${body.resultCode}`,
    `transId=${body.transId}`,
  ];
  const rawWithAccessKey = accessKey ? `accessKey=${accessKey}&${parts.join('&')}` : null;
  const rawWithoutAccessKey = parts.join('&');
  const signWith = rawWithAccessKey
    ? crypto.createHmac('sha256', secretKey).update(rawWithAccessKey).digest('hex')
    : '';
  const signWithout = crypto.createHmac('sha256', secretKey).update(rawWithoutAccessKey).digest('hex');
  return body.signature === signWith || body.signature === signWithout;
}

function createQuerySignature(secretKey, payload) {
  const raw = [
    `accessKey=${payload.accessKey}`,
    `orderId=${payload.orderId}`,
    `partnerCode=${payload.partnerCode}`,
    `requestId=${payload.requestId}`,
  ].join('&');
  return crypto.createHmac('sha256', secretKey).update(raw).digest('hex');
}

/**
 * Gọi Momo API tạo giao dịch captureWallet, trả về payUrl.
 * @param {object} opts - { orderId, amount (VND), orderInfo, redirectUrl, ipnUrl, extraData (string base64 optional), lang }
 * @returns {Promise<{ success: boolean, payUrl?: string, message?: string }>}
 */
function getDefaultRedirectUrl() {
  const fe = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${String(fe).replace(/\/+$/, '')}/payments/return`;
}

async function createPayment(opts) {
  const { partnerCode, accessKey, secretKey, baseMomo } = getConfig();
  if (!partnerCode || !accessKey || !secretKey) {
    return { success: false, message: 'Thiếu cấu hình Momo (MOMO_PARTNER_CODE, MOMO_ACCESS_KEY, MOMO_SECRET_KEY)' };
  }

  const amount = Number(opts.amount);
  if (amount < MOMO_MIN_AMOUNT || amount > MOMO_MAX_AMOUNT) {
    return { success: false, message: `Số tiền phải từ ${MOMO_MIN_AMOUNT.toLocaleString('vi-VN')} đến ${MOMO_MAX_AMOUNT.toLocaleString('vi-VN')} VND` };
  }

  const publicBase = getPublicApiBaseUrl();
  const requestId = opts.requestId || `req_${Date.now()}_${opts.orderId}`;
  const payload = {
    partnerCode,
    requestType: 'payWithMethod',
    amount: Math.round(amount),
    orderId: String(opts.orderId),
    orderInfo: String(opts.orderInfo || 'Thanh toán khóa học'),
    requestId,
    lang: opts.lang || 'vi',
    redirectUrl: opts.redirectUrl || getDefaultRedirectUrl(),
    ipnUrl: opts.ipnUrl || `${publicBase}/api/payments/momo/ipn`,
    extraData: opts.extraData || '',
    accessKey,
  };

  payload.signature = createPaymentSignature(secretKey, payload);

  const url = `${baseMomo}/v2/gateway/api/create`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json();

    if (data.resultCode === 0 && data.payUrl) {
      return { success: true, payUrl: data.payUrl, requestId: data.requestId, orderId: data.orderId };
    }
    return { success: false, message: data.message || 'Momo không trả về link thanh toán' };
  } catch (err) {
    clearTimeout(timeout);
    return { success: false, message: err.message || 'Lỗi kết nối Momo' };
  }
}

/**
 * POST /v2/gateway/api/query — đối chiếu trạng thái giao dịch (dùng khi redirect về trước IPN hoặc IPN lỗi).
 * @see https://developers.momo.vn/v3/docs/payment/api/payment-api/query
 */
async function queryTransaction(orderId, requestId) {
  const { partnerCode, accessKey, secretKey, baseMomo } = getConfig();
  if (!partnerCode || !accessKey || !secretKey) {
    return { success: false, message: 'Thiếu cấu hình Momo' };
  }

  const reqId = requestId || `query_${Date.now()}_${orderId}`;
  const payload = {
    partnerCode,
    orderId: String(orderId),
    requestId: reqId,
    lang: 'vi',
    signature: createQuerySignature(secretKey, {
      accessKey,
      orderId: String(orderId),
      partnerCode,
      requestId: reqId,
    }),
  };

  const url = `${baseMomo}/v2/gateway/api/query`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    clearTimeout(timeout);
    return { success: false, message: err.message || 'Lỗi kết nối Momo (query)' };
  }
}

function isMomoSuccessResultCode(code) {
  const n = Number(code);
  return n === 0 || n === 9000;
}

module.exports = {
  getConfig,
  getPublicApiBaseUrl,
  createPaymentSignature,
  verifyIpnSignature,
  createPayment,
  queryTransaction,
  isMomoSuccessResultCode,
  MOMO_MIN_AMOUNT,
  MOMO_MAX_AMOUNT,
};
