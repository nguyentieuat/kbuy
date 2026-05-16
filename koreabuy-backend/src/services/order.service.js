// services/order.service.js

const crypto = require("crypto");
const OrderModel = require("../models/order.model");
const OrderItemModel = require("../models/orderItem.model");
const OrderStatusLogModel = require("../models/orderStatusLog.model");
const ShipmentModel = require("../models/shipment.model");
const DomesticShipmentsModel = require("../models/domesticShipments.model");
const { COD_OTP_THRESHOLD } = require("../config/otp.config");
const OtpService = require("./otp.service");
const db = require("../config/db.config");
const { mapOrderDetail, mapOrderSummary } = require("../mappers/order.mapper");
const { normalizePhone } = require("../utils/phone.util");
const CouponService = require("./coupons.service");

function generateOrderCode() {
  const prefix = "KB";

  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");

  const randomPart = crypto.randomBytes(2).toString("hex").toUpperCase();

  return `${prefix}${yy}${mm}${randomPart}`;
}

function calculateServiceFee({ paymentMethod, totalFinal }) {
  const baseFee = Math.round(totalFinal * 0.08);

  if (paymentMethod === "cod") {
    const codFee = Math.max(5000, Math.round(totalFinal * 0.01));
    return baseFee + codFee;
  }

  return baseFee;
}

// Format items từ cart → order_items
function formatOrderItems(cartItems, orderId) {
  return cartItems.map((item) => ({
    order_id: orderId,
    product_id: item.productId,
    variant_id: item.variantId ?? null,
    product_name: item.productName,
    variant_name: item.variantName ?? null,
    sku: item.sku ?? null,
    product_link: item.productLink ?? null,
    image: item.image ?? null,
    original_price: item.originalPrice ?? null,
    price: item.price,
    quantity: item.quantity,
    total_price: item.price * item.quantity,
  }));
}

const OrderService = {
  async createOrder(payload) {
    const {
      customer,
      items,
      shipping,
      shippingFee,
      paymentMethod,
      couponCode,
      note,
      verifyToken,
      userId,
    } = payload;

    // ── Validate ─────────────────────────────
    if (!items?.length) {
      throw new Error("Giỏ hàng trống");
    }

    if (!customer?.full_name || !customer?.phone || !customer?.address) {
      throw new Error("Thiếu thông tin người nhận");
    }

    // ── OTP CHECK ────────────────────────────
    if (paymentMethod === "cod") {
      const requireOtp = await OtpService.shouldRequireOtp({
        phone: normalizePhone(customer.phone),
        paymentMethod,
        grandTotal: 0, // optional nếu service dùng threshold riêng
      });

      if (requireOtp) {
        if (!verifyToken) {
          throw new Error("Yêu cầu xác minh OTP cho số điện thoại");
        }

        const tokenCheck = OtpService.validateVerifyToken(
          verifyToken,
          normalizePhone(customer.phone),
        );

        if (!tokenCheck.valid) {
          throw new Error(tokenCheck.error);
        }
      }
    }

    // ── SERVER CALCULATION (TRUST SERVER ONLY) ───────────
    const serverTotalOriginal = items.reduce((sum, item) => {
      const original = item.originalPrice ?? item.price;
      return sum + original * item.quantity;
    }, 0);

    const serverTotalFinal = items.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);

    const serviceFee = calculateServiceFee({
      paymentMethod,
      totalFinal: serverTotalFinal,
    });

    // ── COUPON VALIDATION ───────────────────
    let couponDiscount = 0;
    let resolvedCouponId = null;
    let resolvedCouponCode = null;

    if (couponCode) {
      const couponResult = await CouponService.validateCoupon({
        code: couponCode,
        userId,
        email: customer.email,
        phone: customer.phone,
        orderAmount: serverTotalFinal, // ❗ FIX: không dùng payload
        shippingFee,
      });

      couponDiscount = couponResult.discount;
      resolvedCouponId = couponResult.coupon.id;
      resolvedCouponCode = couponResult.coupon.code;
    }

    // ── FINAL PRICE ──────────────────────────
    const finalPrice =
      serverTotalFinal + (shippingFee ?? 0) + serviceFee - couponDiscount;

    // ── TRANSACTION ──────────────────────────
    return db.transaction(async (trx) => {
      const orderCode = generateOrderCode();

      const order = await OrderModel.create(
        {
          order_code: orderCode,
          user_id: userId ?? null,

          // money breakdown
          total_price: serverTotalOriginal,
          service_fee: serviceFee,
          shipping_fee: shippingFee ?? 0,
          discount_amount: couponDiscount,
          final_price: finalPrice,

          // coupon
          coupon_id: resolvedCouponId,
          coupon_code: resolvedCouponCode,

          // shipping
          shipping_method: shipping,
          shipping_region: customer.region ?? null,

          // payment
          payment_method: paymentMethod,
          payment_status: "unpaid",
          status: "pending",

          // receiver
          receiver_gender: customer.gender ?? null,
          receiver_name: customer.full_name,
          receiver_phone: customer.phone,
          receiver_email: customer.email ?? null,
          receiver_address: customer.address,

          receiver_ward: customer.ward ?? null,
          receiver_ward_code: customer.wardCode ?? null,
          receiver_province: customer.province ?? null,
          receiver_province_code: customer.provinceCode ?? null,

          // security
          otp_verify_token: verifyToken ?? null,

          note: note ?? null,
        },
        trx,
      );

      // ── ORDER ITEMS ───────────────────────
      const orderItems = formatOrderItems(items, order.id);
      await OrderModel.createItems(orderItems, trx);

      // ── COUPON USAGE LOG ───────────────────
      if (resolvedCouponId) {
        await CouponService.markCouponUsed({
          couponId: resolvedCouponId,
          userId,
          orderId: order.id,
          email: customer.email,
          phone: customer.phone,
          discountAmount: couponDiscount,
        }, trx);
      }

      return {
        orderId: order.id,
        orderCode: order.order_code,
        finalPrice,
      };
    });
  },

  async getOrderDetail(orderCode) {
    const order = await OrderModel.findWithItemsByOrderCode(orderCode);

    if (!order) {
      throw new Error("Không tìm thấy đơn hàng");
    }

    return mapOrderDetail(order);
  },

  async getOrdersByUser(userId) {
    const orders = await OrderModel.findByUserId(userId);

    if (orders.length === 0) {
      return [];
    }

    const orderIds = orders.map((o) => o.id);

    // parallel query
    const [items, logs] = await Promise.all([
      OrderItemModel.findByOrderIds(orderIds),
      OrderStatusLogModel.findByOrderIds(orderIds),
    ]);

    // items map
    const itemsMap = {};

    for (const item of items) {
      if (!itemsMap[item.order_id]) {
        itemsMap[item.order_id] = [];
      }

      itemsMap[item.order_id].push(item);
    }

    // logs map
    const logsMap = {};

    for (const log of logs) {
      if (!logsMap[log.order_id]) {
        logsMap[log.order_id] = [];
      }

      logsMap[log.order_id].push(log);
    }

    return orders.map((order) =>
      mapOrderSummary({
        ...order,
        items: itemsMap[order.id] || [],
        status_logs: logsMap[order.id] || [],
      }),
    );
  },

  async getOrders({ page = 1, limit = 20, status, search, payment }) {
    const offset = (page - 1) * limit;

    const { data, total } = await OrderModel.getOrders({
      where: { status, search, payment },
      limit,
      offset,
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getOrderById(id) {
    const order = await OrderModel.findById(id);
    if (!order) return null;

    const [items, logs, intShipment, domShipment] = await Promise.all([
      OrderModel.findItems(id),
      OrderModel.findLogs(id),
      ShipmentModel.findByOrderId(id),
      DomesticShipmentsModel.findByOrderId(id),
    ]);

    return {
      ...order,
      items,
      logs,
      intShipment,
      domShipment,
    };
  },

  async updateStatus(orderId, { status, note, location }, user) {
    return db.transaction(async (trx) => {
      const order = await OrderModel.findById(orderId, trx);

      if (!order) throw new Error("Order not found");

      // ignore duplicate
      if (order.status === status) return true;

      // validate flow
      const STATUS_FLOW = {
        pending: ["confirmed", "cancelled"],
        confirmed: ["processing", "cancelled"],
        processing: ["shipped", "cancelled"],
        shipped: ["delivered", "cancelled"],
        delivered: [],
        cancelled: [],
      };

      if (!STATUS_FLOW[order.status]?.includes(status)) {
        throw new Error(
          `Invalid status transition: ${order.status} → ${status}`,
        );
      }

      // update order
      await OrderModel.updateStatus(orderId, status, trx);

      if (status === "delivered") {
        await DomesticShipmentsModel.updateStatusByOrderId(
          orderId,
          {
            status: "delivered",
            delivered_at: trx.fn.now(),
            updated_at: trx.fn.now(),
          },
          trx,
        );
      }

      // insert log
      await OrderStatusLogModel.create(
        {
          order_id: orderId,
          order_code: order.order_code,
          status,
          note: note || null,
          location: location || null,
          handler_name: user?.name || "admin",
          updated_by: user?.id || null,
          created_at: trx.fn.now(),
        },
        trx,
      );
      return true;
    });
  },

  async updatePayment(orderId, payment_status) {
    return OrderModel.updatePayment(orderId, payment_status);
  },
};

module.exports = OrderService;
