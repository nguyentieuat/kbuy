// controllers/adminOrder.controller.js

const service = require("../services/order.service");

exports.getOrders = async (req, res) => {
  const result = await service.getOrders(req.query);
  res.json(result);
};

exports.getOrderDetail = async (req, res) => {
  const data = await service.getOrderById(req.params.orderId);
  res.json({ data });
};

exports.updateStatus = async (req, res) => {
  await service.updateStatus(
    req.params.orderId,
    req.body,
    req.user
  );

  res.json({ success: true });
};

exports.updatePayment = async (req, res) => {
  await service.updatePayment(
    req.params.orderId,
    req.body.payment_status
  );

  res.json({ success: true });
};
