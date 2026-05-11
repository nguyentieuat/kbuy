// services/otp.service.js

const { COD_OTP_THRESHOLD } = require("../config/otp.config");
const PhoneVerification = require("../models/phoneVerification.model");

const TOKEN_EXPIRY_MS = 10 * 60 * 1000;

function normalizePhone(phone) {
  return (
    "+84" +
    phone
      .replace(/\D/g, "")
      .replace(/^84/, "")
      .replace(/^0/, "")
  );
}
const OtpService = {
  async shouldRequireOtp({ phone, paymentMethod, grandTotal }) {
    if (paymentMethod !== "cod") {
      return false;
    }

    const record = await PhoneVerification.findByPhone(phone);

    const isTrusted = record?.verified === true;
    const isBlocked = record?.cod_blocked === true;
    const riskLevel = record?.risk_level || 0;

    // hard block
    if (isBlocked) return true;

    // risk-based OTP
    if (riskLevel > 70) return true;

    // main rule
    if (grandTotal >= COD_OTP_THRESHOLD && !isTrusted) {
      return true;
    }

    return false;
  },

  async markVerified(phone, uid, method = "firebase") {
    return PhoneVerification.upsertVerified({
      phone,
      uid,
      method,
    });
  },

  async increaseAttempt(phone, method = "firebase") {
    return PhoneVerification.incrementAttempt({
      phone,
      method,
    });
  },

  createVerifyToken(phone) {
    return Buffer.from(
      JSON.stringify({
        phone,
        verifiedAt: Date.now(),
      }),
    ).toString("base64");
  },

  validateVerifyToken(token, phone) {
    try {
      const decoded = JSON.parse(Buffer.from(token, "base64").toString());

      if (Date.now() - decoded.verifiedAt > TOKEN_EXPIRY_MS) {
        return {
          valid: false,
          error: "Phiên xác minh đã hết hạn",
        };
      }

      if (normalizePhone(decoded.phone) !== normalizePhone(phone)) {
        return {
          valid: false,
          error: "Số điện thoại không khớp",
        };
      }

      return { valid: true };
    } catch {
      return {
        valid: false,
        error: "Token không hợp lệ",
      };
    }
  },
};

module.exports = OtpService;
