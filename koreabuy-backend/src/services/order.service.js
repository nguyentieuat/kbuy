// services/order.service.js

const crypto = require("crypto");
const OrderModel = require("../models/order.model");
const OrderItemModel = require("../models/orderItem.model");
const OrderStatusLogModel = require("../models/orderStatusLog.model");
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
      couponId,
      couponCode,
      couponDiscount,
      totalFinal,
      grandTotal,
      serviceFee,
      note,
      verifyToken,
      userId,
    } = payload;

    // ── Validate ────────────────────────────────────────

    if (!items?.length) {
      throw new Error("Giỏ hàng trống");
    }

    if (!customer?.full_name || !customer?.phone || !customer?.address) {
      throw new Error("Thiếu thông tin người nhận");
    }

    // Validate OTP token nếu COD > 2 triệu
    if (paymentMethod === "cod" && grandTotal >= COD_OTP_THRESHOLD) {
      const requireOtp = await OtpService.shouldRequireOtp({
        phone: normalizePhone(customer.phone),
        paymentMethod,
        grandTotal,
      });

      // Chỉ verify token nếu thật sự cần OTP
      if (requireOtp) {
        if (!verifyToken) {
          throw new Error(`Yêu cầu xác minh OTP cho số điện thoại`);
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

    // ── Tính toán lại giá phía server ───────────────────
    // Không tin tuyệt đối vào client
    const serverTotalOriginal = items.reduce((sum, item) => {
      const original = item.originalPrice ?? item.price;
      return sum + original * item.quantity;
    }, 0);

    const serverTotalFinal = items.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);

    // ── Tạo order ───────────────────────────────────────

    // validate coupon lại
    if (payload.couponCode) {
      const couponResult = await CouponService.validateCoupon({
        code: payload.couponCode,
        userId: payload.userId,
        email: payload.customer.email,
        phone: payload.customer.phone,
        orderAmount: payload.totalFinal,
        shippingFee: payload.shippingFee,
      });
      couponDiscount = couponResult.discount;
      couponId = couponResult.coupon.id;
    }

    return db.transaction(async (trx) => {
      const orderCode = generateOrderCode();
      const order = await OrderModel.create(
        {
          order_code: orderCode,
          user_id: userId ?? null,

          // Tiền
          total_price: serverTotalOriginal,
          service_fee: serviceFee ?? 0,
          shipping_fee: shippingFee ?? 0,
          discount_amount: couponDiscount ?? 0,
          final_price:
            serverTotalFinal +
            (shippingFee ?? 0) +
            (serviceFee ?? 0) -
            (couponDiscount ?? 0),

          // Coupon
          coupon_code: couponCode ?? null,

          // Vận chuyển
          shipping_method: shipping,
          shipping_region: customer.region ?? null,

          // Thanh toán
          payment_method: paymentMethod,
          payment_status: "unpaid",
          status: "pending",

          // ─────────────────────────────
          // Thông tin người nhận
          receiver_gender: customer.gender ?? null,
          receiver_name: customer.full_name,
          receiver_phone: customer.phone,
          receiver_email: customer.email ?? null,
          receiver_address: customer.address,

          receiver_ward: customer.ward ?? null,
          receiver_ward_code: customer.wardCode ?? null,
          receiver_province: customer.province ?? null,
          receiver_province_code: customer.provinceCode ?? null,
          // OTP
          otp_verify_token: verifyToken ?? null,

          note: note ?? null,
        },
        trx,
      );

      // ── Tạo order items ─────────────────────────────────
      const orderItems = formatOrderItems(items, order.id);
      await OrderModel.createItems(orderItems, trx);

      await CouponService.markCouponUsed({
        couponId: payload.couponId,
        userId: payload.userId,
        orderId: order.id,
        email: payload.customer.email,
        phone: payload.customer.phone,
        discountAmount: payload.couponDiscount,
      });

      return {
        orderId: order.id,
        orderCode: order.order_code,
        finalPrice: order.final_price,
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
};

module.exports = OrderService;
