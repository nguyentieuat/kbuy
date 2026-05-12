// services/email.service.js

const nodemailer = require("nodemailer");

// Tạo transporter — dùng Gmail (hoặc SMTP bất kỳ)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App Password, không phải mật khẩu Gmail thường
  },
});

// Verify kết nối khi khởi động
transporter.verify((err) => {
  if (err) {
    console.error("[Email] Kết nối thất bại:", err.message);
  } else {
    console.log("[Email] Sẵn sàng gửi mail");
  }
});

// ── Template OTP ──────────────────────────────────────────────────────────

function buildOtpTemplate(otp, purpose = "xác thực") {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; background:#f8f9fa; font-family: Arial, sans-serif;">
      <div style="max-width:480px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 16px rgba(0,0,0,0.08);">

        <!-- Header -->
        <div style="background:#007bff; padding:24px; text-align:center;">
          <h2 style="color:#fff; margin:0; font-size:20px;">KoreaBuy</h2>
        </div>

        <!-- Body -->
        <div style="padding:32px 28px;">
          <h3 style="margin:0 0 8px; font-size:18px; color:#333;">
            Xác thực email của bạn
          </h3>
          <p style="color:#888; font-size:14px; margin:0 0 24px;">
            Sử dụng mã OTP bên dưới để ${purpose}. Mã có hiệu lực trong <strong>5 phút</strong>.
          </p>

          <!-- OTP Box -->
          <div style="background:#f0f6ff; border:2px dashed #007bff; border-radius:10px; padding:20px; text-align:center; margin-bottom:24px;">
            <p style="margin:0 0 4px; font-size:12px; color:#888; text-transform:uppercase; letter-spacing:1px;">
              Mã xác thực
            </p>
            <p style="margin:0; font-size:36px; font-weight:700; color:#007bff; letter-spacing:8px;">
              ${otp}
            </p>
          </div>

          <p style="color:#aaa; font-size:12px; margin:0; line-height:1.6;">
            ⚠️ Không chia sẻ mã này với bất kỳ ai.<br/>
            Nếu bạn không yêu cầu mã này, hãy bỏ qua email này.
          </p>
        </div>

        <!-- Footer -->
        <div style="background:#f8f9fa; padding:16px 28px; border-top:1px solid #eee;">
          <p style="color:#bbb; font-size:11px; margin:0; text-align:center;">
            © ${new Date().getFullYear()} KoreaBuy. Tất cả quyền được bảo lưu.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// ── Gửi OTP email ─────────────────────────────────────────────────────────

async function sendOtpEmail(email, otp, purpose = "xác thực email") {
  await transporter.sendMail({
    from:    `"KoreaBuy" <${process.env.EMAIL_USER}>`,
    to:      email,
    subject: `[KoreaBuy] Mã xác thực: ${otp}`,
    html:    buildOtpTemplate(otp, purpose),
  });
}

module.exports = { sendOtpEmail };
