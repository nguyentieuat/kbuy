// services/email.service.js

const { Resend } = require("resend");
const templates = require("./email/templates");

const resend = new Resend(process.env.RESEND_API_KEY);

// ── Gửi OTP email ─────────────────────────────────────────────────────────

async function sendOtpEmail(email, otp, purpose = "xác thực email") {
  try {
    const result = await resend.emails.send({
      from: `KoreaBuy <${process.env.MAIL_FROM}>`,
      to: email,
      subject: `[KoreaBuy] Mã xác thực: ${otp}`,
      html: templates.buildOtpTemplate(otp, purpose),
    });

    console.log("[Email] Sent:", result);

    return result;
  } catch (err) {
    console.error("[Email] Send failed:", err);

    throw err;
  }
}

module.exports = { sendOtpEmail };