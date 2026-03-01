const nodemailer = require('nodemailer');

/**
 * Tạo transporter cho Nodemailer.
 * Hỗ trợ cả SMTP thật (Gmail, v.v.) và Ethereal (test).
 *
 * .env cần có:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 * Nếu thiếu sẽ tự dùng Ethereal test account.
 */
let _transporter = null;

async function getTransporter() {
  if (_transporter) return _transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Dùng Ethereal cho dev/test
    const testAccount = await nodemailer.createTestAccount();
    _transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('📧 Using Ethereal test email account:', testAccount.user);
  }

  return _transporter;
}

/**
 * Gửi email đặt lại mật khẩu với mã OTP 6 chữ số.
 */
async function sendResetPasswordEmail(toEmail, code) {
  const transporter = await getTransporter();
  const from = process.env.SMTP_FROM || '"X-Tech Education" <no-reply@xtech.vn>';

  const info = await transporter.sendMail({
    from,
    to: toEmail,
    subject: 'Mã xác nhận đặt lại mật khẩu - X-Tech',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #059669;">X-Tech Education</h2>
        <p>Bạn đã yêu cầu đặt lại mật khẩu. Sử dụng mã xác nhận bên dưới:</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; font-size: 32px; font-weight: bold; letter-spacing: 8px; background: #f0fdf4; padding: 16px 32px; border-radius: 12px; color: #059669;">
            ${code}
          </span>
        </div>
        <p style="color: #6b7280; font-size: 14px;">Mã có hiệu lực trong <strong>15 phút</strong>. Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="color: #9ca3af; font-size: 12px;">© X-Tech Education Platform</p>
      </div>
    `,
    text: `Mã xác nhận đặt lại mật khẩu X-Tech của bạn là: ${code}\nMã có hiệu lực trong 15 phút.`,
  });

  // Log preview URL cho Ethereal (dev)
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log('📧 Preview URL:', previewUrl);
  }

  return info;
}

module.exports = { sendResetPasswordEmail };
