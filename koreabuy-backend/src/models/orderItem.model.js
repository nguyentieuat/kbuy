// models/order-item.model.js

const db = require("../config/db.config");

async function findByOrderIds(orderIds) {
  return db("order_items")
    .whereIn("order_id", orderIds)
    .select(
      "id",
      "order_id",
      "product_name",
      "image",
      "quantity"
    );
}

module.exports = {
  findByOrderIds,
};
