// src/routes/payment.route.ts

const express = require("express");
const router = express.Router();

const {
  createPayment,
  checkPayment,
  paymentWebhook,
} = require("../controllers/payment.controller");

router.post("/create", createPayment);
router.get("/check/:txnRef", checkPayment);
router.post("/webhook", paymentWebhook);

module.exports = router;
