// models/shipment.model.js

const db = require("../config/db.config");

const DomesticShipmentsModel = {
  async findByOrderId(orderId, trx = db) {
    return trx("domestic_shipments").where({ order_id: orderId }).first();
  },

  async createDomesticShipments(data, trx = db) {
    return trx("domestic_shipments").insert(data).returning("id");
  },

  async updateStatusByOrderId(orderId, data, trx = db) {
  return trx("domestic_shipments")
    .where({ order_id: orderId })
    .update(data);
}

};

module.exports = DomesticShipmentsModel;
