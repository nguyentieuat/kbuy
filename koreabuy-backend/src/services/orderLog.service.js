// services/orderLog.service.js

const OrderStatusLogModel = require("../models/orderStatusLog.model");

async function addOrderLog({
  orderId,
  orderCode,
  status,
  note = null,
  updatedBy = null,
}) {
  return OrderStatusLogModel.create({
    order_id: orderId,
    order_code: orderCode,
    status,
    note,
    updated_by: updatedBy,
  });
}

module.exports = {
  addOrderLog,
};
