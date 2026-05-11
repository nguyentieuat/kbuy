// controllers/payment.controller.js

const PaymentService = require("../services/payment.service");
const crypto = require("crypto");

function generateOrderCode() {
  const prefix = "KB";

  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");

  const randomPart = crypto
    .randomBytes(2)
    .toString("hex")
    .toUpperCase();

  return `${prefix}${yy}${mm}${randomPart}`;
}

async function createPayment(req, res) {
  try {
    const { grandTotal } = req.body;

    const orderCode = generateOrderCode();

    if (!orderCode || !grandTotal) {
      return res.status(400).json({ error: "Thiếu orderId hoặc grandTotal" });
    }

    if (isNaN(Number(grandTotal)) || Number(grandTotal) <= 0) {
      return res.status(400).json({ error: "Số tiền không hợp lệ" });
    }

    const result = await PaymentService.createVietQrPayment(orderCode, grandTotal);

    res.json({ success: true, ...result });
  } catch (err) {
    console.error("[createPayment]", err);
    res.status(500).json({ error: "Lỗi tạo thanh toán" });
  }
}

async function checkPayment(req, res) {
  try {
    const { txnRef } = req.params;

    if (!txnRef) {
      return res.status(400).json({ error: "Thiếu txnRef" });
    }

    const result = await PaymentService.checkPaymentStatus(txnRef);

    if (result.status === "not_found") {
      return res.status(404).json({ error: "Không tìm thấy giao dịch" });
    }

    res.json(result);
  } catch (err) {
    console.error("[checkPayment]", err);
    res.status(500).json({ error: "Lỗi kiểm tra thanh toán" });
  }
}

async function paymentWebhook(req, res) {
  try {
    const signature =
      req.headers["x-api-key"] ||
      req.headers["x-signature"] ||
      "";

    const result = await PaymentService.handleWebhook(req.body, signature);

    if (!result.success) {
      return res.json({ success: false, reason: result.reason });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("[paymentWebhook]", err);
    res.json({ success: false, reason: err.message });
  }
}

module.exports = {
  createPayment,
  checkPayment,
  paymentWebhook,
};
