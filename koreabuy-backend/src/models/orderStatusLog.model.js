// models/orderStatusLog.model.js

const db = require("../config/db.config");
const { findByOrderCode } = require("./payment.model");

const TABLE = "order_status_logs";

module.exports = {
  async create(data) {
    const [row] = await db(TABLE).insert(data).returning("*");

    return row;
  },

  async findByOrderId(orderId) {
    return db(TABLE).where({ order_id: orderId }).orderBy("created_at", "asc");
  },

  async findByOrderCode(orderCode) {
    return db(TABLE)
      .where({ order_code: orderCode })
      .orderBy("created_at", "asc");
  },

  async findByOrderIds(orderIds) {
    return db("order_status_logs")
      .whereIn("order_id", orderIds)
      .orderBy("created_at", "desc");
  },

  create(data, trx = db) {
    return trx("order_status_logs").insert(data);
  },
};
