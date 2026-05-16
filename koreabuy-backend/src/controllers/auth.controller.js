// controllers/auth.controller.js

const AuthService = require("../services/auth.service");
const EmailOtpService = require("../services/emailOtp.service");
const FileService = require("../services/fileUpload.service");

async function register(req, res) {
  try {
    const result = await AuthService.register(req.body);

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message,
    });
  }
}

async function login(req, res) {
  try {
    const { credential, password } = req.body;

    const result = await AuthService.login(credential, password);

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    res.status(401).json({
      success: false,
      error: err.message,
    });
  }
}

async function getMe(req, res) {
  try {
    const user = req.user;

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      data: user,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

async function updateProfile(req, res) {
  const userId = req.user.id;
  const { full_name } = req.body;

  if (!req.file && !full_name) {
    return res.status(400).json({
      success: false,
      message: "No data to update",
    });
  }

  let updatePayload = {};

  // avatar
  if (req.file) {
    const avatar_url = await FileService.uploadAvatar(req.file);
    updatePayload.avatar_url = avatar_url;
  }

  // name
  if (full_name) {
    const parts = full_name.trim().split(" ");
    updatePayload.full_name = full_name;
    updatePayload.first_name = parts.slice(0, -1).join(" ");
    updatePayload.last_name = parts.slice(-1)[0];
  }

  const user = await AuthService.updateProfile(userId, updatePayload);

  return res.json({
    success: true,
    data: user,
  });
}

// POST /api/auth/verify-email/send
async function sendEmailOtp(req, res) {
  try {
    const user = req.user;
    const { email, email_verified } = user;

    if (!email) {
      return res.status(400).json({ error: "Tài khoản chưa có email" });
    }

    if (email_verified) {
      return res.status(400).json({ error: "Email đã được xác thực" });
    }

    await EmailOtpService.sendOtp(email);

    res.json({ success: true, message: "Mã OTP đã gửi vào email" });
  } catch (err) {
    console.error("[sendEmailOtp]", err.message);
    // 429 nếu còn trong cooldown
    const status = err.message.includes("chờ") ? 429 : 500;
    res.status(status).json({ error: err.message });
  }
}

// POST /api/auth/verify-email/confirm
async function confirmEmailOtp(req, res) {
  try {
    const { otp } = req.body;
    const user = req.user;
    const { email, email_verified } = user;

    if (!otp || otp.length !== 6) {
      return res.status(400).json({ error: "Mã OTP không hợp lệ" });
    }

    const result = await EmailOtpService.verifyOtp(email, otp);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, message: "Email đã được xác thực thành công" });
  } catch (err) {
    console.error("[confirmEmailOtp]", err.message);
    res.status(500).json({ error: "Lỗi server" });
  }
}

async function changePassword(req, res) {
  try {
    const userId = req.user.id;

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: "Thiếu thông tin mật khẩu",
      });
    }

    await AuthService.changePassword(userId, currentPassword, newPassword);

    return res.json({
      success: true,
      message: "Đổi mật khẩu thành công",
    });
  } catch (err) {
    console.error("changePassword error:", err);

    return res.status(400).json({
      error: err.message || "Lỗi server",
    });
  }
}

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  sendEmailOtp,
  confirmEmailOtp,
  changePassword,
};
