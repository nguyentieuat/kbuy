// models/order.model.js

const db = require("../config/db.config");

const OrderModel = {
  // =========================
  // CREATE
  // =========================

  async create(orderData, trx = db) {
    const [order] = await trx("orders").insert(orderData).returning("*");

    return order;
  },

  async createItems(items, trx = db) {
    return trx("order_items").insert(items);
  },

  // =========================
  // FIND SINGLE
  // =========================

  async findById(id, trx = db) {
    return trx("orders").where({ id }).first();
  },

  async findByOrderCode(orderCode, trx = db) {
    return trx("orders").where("order_code", orderCode).first();
  },

  async findOrderById(orderId, trx = db) {
    return trx("orders").where("id", orderId).first();
  },

  async findOrderByIds(orderIds, trx = db) {
    return trx("orders")
      .whereIn("id", orderIds)
      .select("id", "order_code", "status");
  },

  // =========================
  // FIND RELATIONS
  // =========================

  async findItems(orderId, trx = db) {
    return trx("order_items").where("order_id", orderId);
  },

  async findLogs(orderId, trx = db) {
    return trx("order_status_logs")
      .where("order_id", orderId)
      .orderBy("created_at", "asc");
  },

  async findWithItems(orderId, trx = db) {
    const order = await trx("orders").where("id", orderId).first();

    if (!order) return null;

    const items = await this.findItems(orderId, trx);

    return {
      ...order,
      items,
    };
  },

  async findWithItemsByOrderCode(orderCode, trx = db) {
    const order = await this.findByOrderCode(orderCode, trx);

    if (!order) return null;

    const [items, statusLogs] = await Promise.all([
      this.findItems(order.id, trx),

      trx("order_status_logs")
        .where("order_id", order.id)
        .orderBy("created_at", "desc"),
    ]);

    return {
      ...order,
      items,
      status_logs: statusLogs,
    };
  },

  // =========================
  // USER ORDERS
  // =========================

  async findByUserId(
    userId,
    { limit = 10, offset = 0, status = null } = {},
    trx = db,
  ) {
    const query = trx("orders").where("user_id", userId);

    if (status) {
      query.where("status", status);
    }

    return query.orderBy("created_at", "desc").limit(limit).offset(offset);
  },

  async countByUserId(userId, trx = db) {
    const row = await trx("orders")
      .where("user_id", userId)
      .count("id as total")
      .first();
    return Number(row?.total ?? 0);
  },

  async countByStatusUserId(userId, trx = db) {
    return (row = await trx("orders")
      .where("user_id", userId)
      .select("status")
      .count("* as count")
      .groupBy("status"));
  },

  // =========================
  // ADMIN ORDERS
  // =========================

  async getOrders({ where = {}, limit = 20, offset = 0 }, trx = db) {
    let query = trx("orders");

    if (where.shipping_method) {
      query.where("shipping_method", where.shipping_method);
    }

    if (where.status) {
      query.where("status", where.status);
    }

    if (where.payment) {
      query.where("payment_status", where.payment);
    }

    if (where.search) {
      query.where(function () {
        this.where("order_code", "like", `%${where.search}%`)
          .orWhere("receiver_name", "like", `%${where.search}%`)
          .orWhere("receiver_phone", "like", `%${where.search}%`);
      });
    }

    const totalResult = await query.clone().count("* as total").first();

    const data = await query
      .clone()
      .orderBy("created_at", "desc")
      .limit(limit)
      .offset(offset);

    return {
      total: Number(totalResult.total),
      data,
    };
  },

  // =========================
  // UPDATE
  // =========================

  async updateStatus(orderId, status, trx = db) {
    return trx("orders")
      .where("id", orderId)
      .update({
        status,
        updated_at: trx.fn.now(),

        ...(status === "confirmed" && {
          confirmed_at: trx.fn.now(),
        }),
      });
  },

  async updateOrderStatus(orderId, data, trx = db) {
    return trx("orders")
      .where("id", orderId)
      .update({
        ...data,
        updated_at: trx.fn.now(),
      });
  },

  async updateOrderStatusList(orderIds, data, trx = db) {
    return trx("orders")
      .whereIn("id", orderIds)
      .update({
        ...data,
        updated_at: trx.fn.now(),
      });
  },

  async updatePayment(orderId, payment_status, trx = db) {
    return trx("orders").where("id", orderId).update({
      payment_status,
      updated_at: trx.fn.now(),
    });
  },
};

module.exports = OrderModel;
