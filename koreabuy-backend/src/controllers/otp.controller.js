// controllers/otp.controller.js

const { auth } = require("../config/firebaseAdmin.config.js");
const OtpService = require("../services/otp.service");

async function verifyOtpCode(req, res) {
  try {
    const { idToken, phone } = req.body;

    if (!idToken || !phone) {
      return res.status(400).json({ error: "Thiếu thông tin" });
    }

    const decoded = await auth.verifyIdToken(idToken);
    const tokenPhone = decoded.phone_number;
    const normalizedPhone =
      "+84" + phone.replace(/\D/g, "").replace(/^84/, "").replace(/^0/, "");

    if (tokenPhone !== normalizedPhone) {
      return res.status(400).json({ error: "Số điện thoại không khớp" });
    }

    await OtpService.markVerified(normalizedPhone, decoded.uid, "firebase");

    const verifyToken = OtpService.createVerifyToken(phone);
    return res.json({ success: true, verifyToken });
  } catch (err) {
    console.error(err);
    if (err.code === "auth/id-token-expired") {
      return res.status(400).json({ error: "Phiên đăng nhập hết hạn" });
    }
    return res.status(500).json({ error: "Xác minh thất bại" });
  }
}

async function checkOtpRequirement(req, res) {
  try {
    const { phone, paymentMethod, grandTotal } = req.body;
    const requireOtp = await OtpService.shouldRequireOtp({
      phone,
      paymentMethod,
      grandTotal,
    });
    return res.json({ success: true, data: { requireOtp } });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
}

module.exports = { verifyOtpCode, checkOtpRequirement };
