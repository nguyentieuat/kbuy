// models/payment.model.js

const db = require("../config/db.config");

const TABLE = "payments";

const PaymentModel = {
  async create(data) {
    return db(TABLE).insert(data).returning("*");
  },

  async findByTxnRef(txnRef) {
    return db(TABLE).where("txn_ref", txnRef).first();
  },

  async findByOrderId(orderId) {
    return db(TABLE).where("order_id", orderId).first();
  },

  async findByOrderCode(orderCode) {
    return db(TABLE).where("order_code", orderCode).first();
  },

  async updateByTxnRef(txnRef, data) {
    await db(TABLE)
      .where("txn_ref", txnRef)
      .update({
        ...data,
        updated_at: new Date(),
      });
    return db(TABLE).where("txn_ref", txnRef).first();
  },

  async updateStatus(txnRef, status) {
    return PaymentModel.updateByTxnRef(txnRef, { status });
  },

  async markPaid(
    txnRef,
    { paidAmount, transactionCode, payerAccount, webhookData },
  ) {
    return PaymentModel.updateByTxnRef(txnRef, {
      status: "paid",
      paid_amount: paidAmount,
      transaction_code: transactionCode,
      payer_account: payerAccount,
      webhook_data: webhookData ? JSON.stringify(webhookData) : null,
      paid_at: new Date(),
    });
  },

  async expireOldPending() {
    return db(TABLE)
      .where("status", "pending")
      .where("expires_at", "<", db.fn.now())
      .update({ status: "expired", updated_at: new Date() });
  },
};

module.exports = PaymentModel;
