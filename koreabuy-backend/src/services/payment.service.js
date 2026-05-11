// services/payment.service.js

const PaymentModel = require("../models/payment.model");
const OrderModel = require("../models/order.model");
const db = require("../config/db.config");
const crypto = require("crypto");

const BANK_CONFIG = {
  bankId: process.env.BANK_ID,
  accountNo: process.env.BANK_ACCOUNT_NO,
  accountName: process.env.BANK_ACCOUNT_NAME,
};

const QR_EXPIRY_MINUTES = 15;

function buildTransferContent(txnRef) {
  return `Thanh toan don hang ${txnRef}`;
}

function buildVietQrUrl({
  bankId,
  accountNo,
  accountName,
  amount,
  description,
}) {
  const params = new URLSearchParams({
    amount,
    addInfo: description,
    accountName,
  });
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.jpg?${params}`;
}

function verifyWebhookSignature(payload, signature) {
  const expected = crypto
    .createHmac("sha256", process.env.WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest("hex");
  return expected === signature;
}

const PaymentService = {
  async createVietQrPayment(orderId, orderCode, amount) {
    // Expire các payment pending cũ của order này nếu có
    const existing = await PaymentModel.findByOrderId(orderId);
    if (existing && existing.status === "pending") {
      await PaymentModel.updateStatus(existing.txn_ref, "expired");
    }

    const transferContent = buildTransferContent(orderCode);
    const expiresAt = new Date(Date.now() + QR_EXPIRY_MINUTES * 60 * 1000);

    const payment = await PaymentModel.create({
      order_id: orderId,
      amount,
      method: "vietqr",
      status: "pending",
      txn_ref: orderCode,
      bank_id: BANK_CONFIG.bankId,
      bank_account_no: BANK_CONFIG.accountNo,
      transfer_content: transferContent,
      expires_at: expiresAt,
    });

    const qrUrl = buildVietQrUrl({
      bankId: BANK_CONFIG.bankId,
      accountNo: BANK_CONFIG.accountNo,
      accountName: BANK_CONFIG.accountName,
      amount,
      description: transferContent,
    });

    return {
      orderCode,
      qrUrl,
      expiresAt,
      bankInfo: {
        ...BANK_CONFIG,
        amount,
        description: transferContent,
      },
    };
  },

  async checkPaymentStatus(txnRef) {
    const payment = await PaymentModel.findByTxnRef(txnRef);

    if (!payment) {
      return { status: "not_found" };
    }

    // Auto expire nếu đã quá hạn
    if (
      payment.status === "pending" &&
      new Date() > new Date(payment.expires_at)
    ) {
      await PaymentModel.updateStatus(txnRef, "expired");
      return { status: "expired" };
    }

    return { status: payment.status };
  },

  async handleWebhook(body, signature) {
    if (!verifyWebhookSignature(body, signature)) {
      throw new Error("Invalid signature");
    }

    const match = body.description?.match(/KB[A-Z0-9]+/i);
    if (!match) {
      return { success: false, reason: "txnRef not found" };
    }

    const txnRef = match[0].toUpperCase();

    const payment = await PaymentModel.findByTxnRef(txnRef);

    if (!payment) return { success: false, reason: "not found" };
    if (payment.status !== "pending")
      return { success: false, reason: "already processed" };

    if (new Date() > new Date(payment.expires_at)) {
      await PaymentModel.updateStatus(txnRef, "expired");
      return { success: false, reason: "expired" };
    }

    if (Number(body.transferAmount) < Number(payment.amount)) {
      return { success: false, reason: "amount mismatch" };
    }

    // transaction should be here (IMPORTANT)
    await PaymentModel.markPaid(txnRef, {
      paidAmount: body.transferAmount,
      transactionCode: body.referenceCode,
      payerAccount: body.corresponsiveName,
      webhookData: body,
    });

    await OrderModel.markPaid(payment.order_id);

    return { success: true, orderId: payment.order_id };
  },

  // Chạy định kỳ expire các QR cũ
  async cleanupExpiredPayments() {
    const count = await PaymentModel.expireOldPending();
    if (count > 0) {
      console.log(`[Payment Cleanup] Expired ${count} pending payments`);
    }
  },
};

module.exports = PaymentService;
