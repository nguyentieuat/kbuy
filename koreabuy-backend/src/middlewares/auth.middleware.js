// middlewares/auth.middleware.js

const { verifyToken } = require("../utils/jwt");

module.exports = function authMiddleware(
  req,
  res,
  next,
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    const token = authHeader.split(" ")[1];

    const payload = verifyToken(token);

    req.userId = payload.userId;

    next();
  } catch (err) {
    return res.status(401).json({
      error: "Invalid token",
    });
  }
};
