// services/emailQueue.service.js

const { emailQueue } = require("../queues");
const { getKrwToVndRate } = require("./currency.service");
const OrderModel = require("../models/order.model");
require("dotenv").config();

const EmailQueueService = {
  async sendOrderConfirmed(order) {
    // Load items kèm ảnh nếu chưa có
    const items = order.items ?? (await OrderModel.findItems(order.id));

    await emailQueue.add(
      "order_confirmed",
      {
        type: "order_confirmed",
        to: order.receiver_email,
        data: {
          orderCode: order.order_code,
          receiverName: order.receiver_name,
          items: items.map((i) => ({
            product_name: i.product_name,
            variant_name: i.variant_name,
            quantity: i.quantity,
            price: i.price,
            image: i.image, // ảnh sản phẩm
          })),
          totalFinal: order.final_price,
          shippingFee: order.shipping_fee,
        },
      },
      { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
    );
  },

  async sendOrderTracking(order, shipment) {
    const items = order.items ?? (await OrderModel.findItems(order.id));

    await emailQueue.add(
      "order_tracking",
      {
        type: "order_tracking",
        to: order.receiver_email,
        data: {
          orderCode: order.order_code,
          receiverName: order.receiver_name,
          trackingCode: shipment.shipment_code,
          carrier: shipment.carrier,
          items: items.map((i) => ({
            product_name: i.product_name,
            variant_name: i.variant_name,
            quantity: i.quantity,
            price: i.price,
            image: i.image,
          })),
        },
      },
      { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
    );
  },

  async sendOrderArrivedVn(order) {
    const items = order.items ?? (await OrderModel.findItems(order.id));

    await emailQueue.add(
      "order_arrived_vn",
      {
        type: "order_arrived_vn",
        to: order.receiver_email,
        data: {
          orderCode: order.order_code,
          receiverName: order.receiver_name,
          items: items.map((i) => ({
            product_name: i.product_name,
            variant_name: i.variant_name,
            quantity: i.quantity,
            price: i.price,
            image: i.image,
          })),
        },
      },
      { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
    );
  },

  async sendOrderDelivered(order) {
    const items = order.items ?? (await OrderModel.findItems(order.id));

    await emailQueue.add(
      "order_delivered",
      {
        type: "order_delivered",
        to: order.receiver_email,
        data: {
          orderCode: order.order_code,
          receiverName: order.receiver_name,
          items: items.map((i) => ({
            product_name: i.product_name,
            variant_name: i.variant_name,
            quantity: i.quantity,
            price: i.price,
            image: i.image,
          })),
        },
      },
      { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
    );
  },

  async sendAdminOrderAlert(order) {
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    await emailQueue.add("admin_order_alert", {
      to: ADMIN_EMAIL,
      data: {
        orderCode: order.order_code,
        receiverName: order.receiver_name,
        totalFinal: order.final_price,
      },
    });
  },
};

module.exports = EmailQueueService;
