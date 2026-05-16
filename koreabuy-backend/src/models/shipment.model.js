// models/shipment.model.js

const db = require("../config/db.config");

const ShipmentModel = {
  async createShipment(data, trx = db) {
    const [shipment] = await trx("international_shipments")
      .insert(data)
      .returning("*");

    return shipment;
  },

  async createShipmentOrder(data, trx = db) {
    return trx("shipment_orders").insert(data);
  },

  async findByOrderId(orderId, trx = db) {
    return trx("shipment_orders")
      .join(
        "international_shipments",
        "shipment_orders.shipment_id",
        "international_shipments.id",
      )
      .where("shipment_orders.order_id", orderId)
      .first("international_shipments.*");
  },

  async findById(id, trx = db) {
    return trx("international_shipments").where("id", id).first();
  },

  async updateStatus(id, status) {
    return db("international_shipments").where({ id }).update({
      status,
      updated_at: new Date(),
    });
  },

  async findOrdersByShipmentId(shipmentId, trx = db) {
    return trx("shipment_orders as so")
      .join("orders as o", "so.order_id", "o.id")
      .where("so.shipment_id", shipmentId)
      .select(
        "o.id as order_id",
        "o.order_code",
        "o.status",
        "o.payment_status",
        "o.receiver_name",
        "o.receiver_phone",
      );
  },
};

module.exports = ShipmentModel;
