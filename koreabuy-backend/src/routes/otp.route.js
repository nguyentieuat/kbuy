// routes/otp.route.js

const express = require("express");
const controller = require("../controllers/otp.controller");
const router = express.Router();

// Firebase OTP verify
router.post("/verify", controller.verifyOtpCode);

router.post("/check", controller.checkOtpRequirement);

module.exports = router;
