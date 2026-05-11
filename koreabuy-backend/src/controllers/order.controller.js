// controllers/order.controller.js

const OrderService = require("../services/order.service");
const PaymentService = require("../services/payment.service");
const { addOrderLog } = require("../services/orderLog.service");
const {
  ORDER_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
} = require("../constants");

const LOG_MESSAGES = require("../constants/orderLogMessages");

// POST /api/orders
async function createOrder(req, res) {
  try {
    const result = await OrderService.createOrder({
      ...req.body,
      userId: req.userId ?? null, // từ auth middleware nếu có
    });

    await addOrderLog({
      orderId: result.orderId,
      orderCode: result.orderCode,
      status: ORDER_STATUS.PENDING,
      note: LOG_MESSAGES.ORDER_CREATED,
    });

    // Nếu thanh toán VietQR → tạo payment ngay
    if (req.body.paymentMethod === PAYMENT_METHOD.QRPAY) {
      const payment = await PaymentService.createVietQrPayment(
        result.orderId,
        result.orderCode,
        result.finalPrice,
      );

      await addOrderLog({
        orderId: result.orderId,
        orderCode: result.orderCode,
        status: ORDER_STATUS.WAITING_PAYMENT,
        note: LOG_MESSAGES.WAITING_PAYMENT,
      });

      return res.status(201).json({
        success: true,
        ...result,
        payment,
      });
    }

    res.status(201).json({ success: true, ...result });
  } catch (err) {
    console.error("[createOrder]", err.message);
    const status = err.message.includes("OTP") ? 403 : 400;
    res.status(status).json({ error: err.message });
  }
}

// GET /api/orders/:id
async function getOrder(req, res) {
  try {
    const order = await OrderService.getOrderDetail(Number(req.params.id));
    res.json({ success: true, data: order });
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
}

module.exports = { createOrder, getOrder };
