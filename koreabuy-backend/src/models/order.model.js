// models/order.model.js

const db = require("../config/db.config");

const OrderModel = {
  async create(orderData, trx = db) {
    const [order] = await trx("orders").insert(orderData).returning("*");

    return order;
  },

  async createItems(items, trx = db) {
    return trx("order_items").insert(items);
  },

  async findById(id) {
    return db("orders").where({ id }).first();
  },

  async findByOrderCode(orderCode) {
    return db("orders").where("order_code", orderCode).first();
  },

  async findWithItemsByOrderCode(orderCode) {
    const order = await db("orders").where("order_code", orderCode).first();

    if (!order) return null;

    const [items, statusLogs] = await Promise.all([
      db("order_items").where("order_id", order.id),

      db("order_status_logs")
        .where("order_id", order.id)
        .orderBy("created_at", "desc"),
    ]);

    return {
      ...order,
      items,
      status_logs: statusLogs,
    };
  },

  async findWithItems(id) {
    const order = await db("orders").where("orders.id", id).first();
    if (!order) return null;
    const items = await db("order_items").where("order_id", id);
    return { ...order, items };
  },

  async updateStatus(id, status) {
    await db("orders").where({ id }).update({ status, updated_at: new Date() });
  },

  async updatePaymentStatus(id, paymentStatus) {
    await db("orders")
      .where({ id })
      .update({ payment_status: paymentStatus, updated_at: new Date() });
  },

  async findByUserId(userId) {
    return db("orders").where("user_id", userId).orderBy("created_at", "desc");
  },
};

module.exports = OrderModel;
