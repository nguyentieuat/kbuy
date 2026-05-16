// constants/orderStatus.js

const { PAYMENT_CONFIRMED } = require("./orderLogMessages");

module.exports = {
  PENDING: "pending",
  WAITING_PAYMENT: "waiting_payment",
  CONFIRMED: "confirmed",
  PAID: "paid",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  REFUNDED: "refunded",
};
