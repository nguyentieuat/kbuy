// models/international_shipments.model.js

const db = require("../config/db.config");

const InternationalShipmentsModel = {
  async create(data, trx = db) {
    const [shipment] = await trx("international_shipments")
      .insert(data)
      .returning("*");

    return shipment;
  },

  async findById(id) {
    return db("international_shipments").where("id", id).first();
  },
};

module.exports = InternationalShipmentsModel;