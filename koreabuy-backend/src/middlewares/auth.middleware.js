// middlewares/auth.middleware.js

const { verifyToken } = require("../utils/jwt");
const db = require("../config/db.config");

const AuthService = require("../services/auth.service");

module.exports = async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const token = authHeader.split(" ")[1];

    const payload = verifyToken(token);

    // lấy user từ DB
    const user = await AuthService.getMe(payload.userId);

    if (!user) {
      return res.status(401).json({
        error: "User not found",
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        error: "User is inactive",
      });
    }

    // gắn toàn bộ user vào req
    req.user = user;

    next();
  } catch (err) {
    return res.status(401).json({
      error: "Invalid token",
    });
  }
};