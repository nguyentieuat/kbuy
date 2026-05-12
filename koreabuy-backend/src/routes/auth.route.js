// routes/auth.route.js

const express = require("express");
const router = express.Router();
const auth = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const upload = require("../config/multer.config");

// src/routes/auth.route.js
router.post("/register", auth.register);
router.post("/login", auth.login);
router.get("/me", authMiddleware, auth.getMe);

router.put(
  "/profile",
  authMiddleware,
  upload.single("avatar"),
  auth.updateProfile,
);

router.put(
  "/change-password",
  authMiddleware,
  auth.changePassword,
);

// router.put("/change-password",        authMiddleware, changePassword);
// router.post("/verify-phone",          authMiddleware, verifyPhone);
router.post("/verify-email/send",     authMiddleware, auth.sendEmailOtp);
router.post("/verify-email/confirm",  authMiddleware, auth.confirmEmailOtp);

module.exports = router;
