// services/emailOtp.service.js
const crypto = require("crypto");
const EmailVerificationModel = require("../models/emailVerification.model");
const { sendOtpEmail } = require("./email.service");

const OTP_EXPIRY_MS      = 5 * 60 * 1000;  // 5 phút
const RESEND_COOLDOWN_MS = 60 * 1000;       // 60 giây
const MAX_ATTEMPTS       = 5;

// ── Helpers ───────────────────────────────────────────────────────────────

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

// Hash OTP trước khi lưu DB — không lưu plaintext
function hashOtp(otp) {
  return crypto
    .createHmac("sha256", process.env.OTP_SECRET ?? "default_secret")
    .update(otp)
    .digest("hex");
}

// Encode payload gồm hash + expiry vào 1 string lưu DB
function encodeToken(otpHash, expiresAt) {
  return Buffer.from(JSON.stringify({ hash: otpHash, exp: expiresAt }))
    .toString("base64");
}

function decodeToken(token) {
  try {
    return JSON.parse(Buffer.from(token, "base64").toString());
  } catch {
    return null;
  }
}

// ── Service ───────────────────────────────────────────────────────────────

const EmailOtpService = {

  // Gửi OTP — tạo hoặc upsert record
  async sendOtp(email) {
    // Đảm bảo record tồn tại
    await EmailVerificationModel.upsert(email);

    const record = await EmailVerificationModel.findByEmail(email);

    // Kiểm tra cooldown — dựa vào last_attempt_at
    if (record?.last_attempt_at) {
      const elapsed = Date.now() - new Date(record.last_attempt_at).getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        const remainSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        throw new Error(`Vui lòng chờ ${remainSeconds}s trước khi gửi lại`);
      }
    }

    const otp        = generateOtp();
    const otpHash    = hashOtp(otp);
    const expiresAt  = Date.now() + OTP_EXPIRY_MS;
    const token      = encodeToken(otpHash, expiresAt);

    await EmailVerificationModel.saveOtp(email, token, new Date(expiresAt));

    // Gửi mail
    await sendOtpEmail(email, otp, "xác thực email");

    if (process.env.NODE_ENV === "development") {
      console.log(`[DEV EMAIL OTP] ${email}: ${otp}`);
    }

    return { success: true };
  },

  // Verify OTP
  async verifyOtp(email, inputOtp) {
    const record = await EmailVerificationModel.findByEmail(email);

    if (!record) {
      return { success: false, error: "Chưa gửi mã OTP cho email này" };
    }

    if (record.verified) {
      return { success: false, error: "Email đã được xác thực trước đó" };
    }

    if (!record.verify_token) {
      return { success: false, error: "Chưa có mã OTP, vui lòng gửi lại" };
    }

    // Kiểm tra số lần thử
    if (record.attempt_count >= MAX_ATTEMPTS) {
      await EmailVerificationModel.resetOtp(email);
      return {
        success: false,
        error: "Nhập sai quá nhiều lần. Vui lòng gửi lại mã OTP",
      };
    }

    // Decode token lưu trong DB
    const decoded = decodeToken(record.verify_token);
    if (!decoded) {
      return { success: false, error: "Mã OTP không hợp lệ" };
    }

    // Kiểm tra hết hạn
    if (Date.now() > decoded.exp) {
      await EmailVerificationModel.resetOtp(email);
      return { success: false, error: "Mã OTP đã hết hạn. Vui lòng gửi lại" };
    }

    // So sánh hash
    const inputHash = hashOtp(inputOtp);
    if (inputHash !== decoded.hash) {
      await EmailVerificationModel.incrementAttempt(email);
      const remaining = MAX_ATTEMPTS - (record.attempt_count + 1);
      return {
        success: false,
        error: remaining > 0
          ? `Mã OTP không đúng. Còn ${remaining} lần thử`
          : "Nhập sai quá nhiều lần. Vui lòng gửi lại mã OTP",
      };
    }

    // Đúng — mark verified
    await EmailVerificationModel.markVerified(email);
    return { success: true };
  },

  // Kiểm tra trạng thái
  async getStatus(email) {
    const record = await EmailVerificationModel.findByEmail(email);
    return {
      verified:  record?.verified ?? false,
      hasPending: !!(record?.verify_token),
    };
  },
};

module.exports = EmailOtpService;
