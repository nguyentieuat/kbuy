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
const CalculateShippingService = require("../services/shippingFee.service");
const { getKrwToVndRate } = require("./currency.service");
const { detectShippingRegion } = require("../utils/detectShippingRegion");
const ProductVariantModel = require("../models/productVariants.model");
const ProductModel = require("../models/products.model");
const ExchangeRateModel = require("../models/exchangeRate.model");
const EmailQueueService = require("./emailQueue.service");

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
      paymentMethod,
      couponCode,
      note,
      verifyToken,
      userId,
    } = payload;

    // ── TỈ GIÁ SNAPSHOT ───────────────────────────────
    const exchangeRate = await ExchangeRateModel.getRate("KRW", "VND");
    const rate = await getKrwToVndRate();

    // ── Validate ──────────────────────────────────────
    if (!items?.length) throw new Error("Giỏ hàng trống");
    if (!customer?.full_name || !customer?.phone || !customer?.address) {
      throw new Error("Thiếu thông tin người nhận");
    }

    // ── OTP CHECK ─────────────────────────────────────
    if (paymentMethod === "cod") {
      const requireOtp = await OtpService.shouldRequireOtp({
        phone: normalizePhone(customer.phone),
        paymentMethod,
        grandTotal: 0,
      });

      if (requireOtp) {
        if (!verifyToken) throw new Error("Yêu cầu xác minh OTP");
        const tokenCheck = OtpService.validateVerifyToken(
          verifyToken,
          normalizePhone(customer.phone),
        );
        if (!tokenCheck.valid) throw new Error(tokenCheck.error);
      }
    }

    // ── TÍNH TIỀN HÀNG ────────────────────────────────

    const variantIds = items.map((x) => x.variantId).filter(Boolean);

    const productIds = items.map((x) => x.productId).filter(Boolean);

    const variantRows =
      await ProductVariantModel.getShippingByVariants(variantIds);

    const productRows =
      await ProductModel.getDefaultShippingByProducts(productIds);

    const variantMap = new Map(variantRows.map((v) => [v.id, v]));

    const productMap = new Map(productRows.map((p) => [p.id, p]));

    const resolvedItems = [];

    for (const item of items) {
      if (item.variantId) {
        const variant = variantMap.get(item.variantId);

        if (!variant) {
          throw new Error("Variant không tồn tại");
        }

        const priceKrw = Number(variant.price || 0);

        const originalPriceKrw = Number(
          variant.original_price || variant.price || 0,
        );

        resolvedItems.push({
          productId: variant.product_id,

          variantId: variant.id,

          quantity: item.quantity,

          // KRW
          priceKrw,
          originalPriceKrw,

          // VND
          price: Math.round(priceKrw * rate),

          originalPrice: Math.round(originalPriceKrw * rate),

          chargeableWeightGrams:
            variant.chargeable_weight_grams ?? variant.weight_grams ?? 0,

          isBulky: variant.is_bulky ?? false,
        });

        continue;
      }

      // PRODUCT ONLY
      const product = productMap.get(item.productId);

      if (!product) {
        throw new Error("Sản phẩm không tồn tại");
      }

      const salePriceKrw = Number(product.sale_price || 0);

      const originalPriceKrw = Number(
        product.original_price || product.sale_price || 0,
      );

      resolvedItems.push({
        productId: product.id,

        variantId: null,

        quantity: item.quantity,

        // KRW
        priceKrw: salePriceKrw,
        originalPriceKrw,

        // VND
        price: Math.round(salePriceKrw * rate),

        originalPrice: Math.round(originalPriceKrw * rate),

        chargeableWeightGrams:
          product.chargeable_weight_grams ?? product.weight_grams ?? 0,
        isBulky: product.is_bulky ?? false,
      });
    }

    // chỉ cần 1 sản phẩm isBulky là cả đơn tính bulky
    const bulkyCount = resolvedItems.reduce((sum, item) => {
      const isBulky = item.isBulky;
      return sum + (isBulky ? item.quantity : 0);
    }, 0);

    const serverTotalOriginal = resolvedItems.reduce((sum, item) => {
      return sum + item.originalPrice * item.quantity;
    }, 0);

    const serverTotalFinal = resolvedItems.reduce((sum, item) => {
      return sum + item.price * item.quantity;
    }, 0);

    const productDiscount = serverTotalOriginal - serverTotalFinal;

    // ── TÍNH WEIGHT ───────────────────────────────────
    // Lấy từ items, FE truyền lên
    const weightGrams = resolvedItems.reduce((sum, item) => {
      return sum + (item.chargeableWeightGrams || 0) * item.quantity;
    }, 0);

    // ── DETECT REGION ─────────────────────────────────
    const region = customer.provinceCode
      ? detectShippingRegion({
          provinceCode: Number(customer.provinceCode),
          wardCode: customer.wardCode,
        })
      : "unknown";

    // ── TÍNH PHÍ SHIP SERVER-SIDE ─────────────────────
    const shippingCalc = await CalculateShippingService.calculateShipping({
      weightGrams,
      region,
      method: shipping,
      orderTotal: serverTotalFinal,
      bulkyCount,
    });

    const {
      // weight
      actualWeightGrams,
      billedWeightGrams,
      weightSurplusGrams,

      // phí khách trả
      internationalFee,
      localFee,
      total: serverShippingFee,
      isFreeShipping,

      bulkyFee,
      internationalBulkyFee,
      localBulkyFee,

      actualInternationalFee,
      shippingFeeSurplus,
    } = shippingCalc;

    // Giảm giá ship (freeship)
    let serverShippingDiscount = isFreeShipping ? localFee : 0;

    // ── SERVICE FEE ───────────────────────────────────
    const serviceFee = calculateServiceFee({
      paymentMethod,
      totalFinal: serverTotalFinal,
    });

    // ── COUPON ────────────────────────────────────────
    let couponDiscount = 0;
    let resolvedCouponId = null;
    let resolvedCouponCode = null;

    if (couponCode) {
      const couponResult = await CouponService.validateCoupon({
        code: couponCode,
        userId,
        email: customer.email,
        phone: customer.phone,
        orderAmount: serverTotalFinal,
        shippingFee: serverShippingFee,
      });

      resolvedCouponId = couponResult.coupon.id;
      resolvedCouponCode = couponResult.coupon.code;

      if (couponResult.coupon.discountType === "freeship") {
        serverShippingDiscount = localFee; // freeship = miễn phí nội địa
        couponDiscount = 0;
      } else {
        couponDiscount = couponResult.discount;
      }
    }

    // ── FINAL PRICE ───────────────────────────────────
    const finalPrice =
      serverTotalFinal +
      serverShippingFee +
      serviceFee -
      couponDiscount -
      serverShippingDiscount;

    // ── TRANSACTION ───────────────────────────────────
    return db.transaction(async (trx) => {
      const orderCode = generateOrderCode();

      const order = await OrderModel.create(
        {
          order_code: orderCode,
          user_id: userId ?? null,

          // ── Tiền hàng ──
          total_price: serverTotalOriginal,
          product_discount: productDiscount,

          // ── Phí dịch vụ ──
          service_fee: serviceFee,

          // ── Phí ship (khách trả) ──
          shipping_fee: serverShippingFee,
          international_shipping_fee: internationalFee,
          local_shipping_fee: localFee,
          shipping_discount: serverShippingDiscount,

          // ── Phí ship internal (lợi nhuận) ──
          actual_international_shipping_fee: actualInternationalFee,
          shipping_fee_surplus: shippingFeeSurplus,

          // Lưu bulky fee riêng để audit
          has_bulky: bulkyCount > 0,
          international_bulky_fee: internationalBulkyFee,
          local_bulky_fee: localBulkyFee,

          // ── Giảm giá ──
          discount_amount: couponDiscount + serverShippingDiscount,

          // ── Tổng ──
          final_price: finalPrice,

          // ── Tỉ giá snapshot ──
          sell_rate_snapshot: rate,
          exchange_rate_meta: exchangeRate,

          currency: "VND",

          // ── Coupon ──
          coupon_id: resolvedCouponId,
          coupon_code: resolvedCouponCode,

          // ── Ship info ──
          shipping_method: shipping,
          shipping_region: region,

          // ── Cân nặng ──
          actual_weight_grams: actualWeightGrams,
          chargeable_weight_grams: billedWeightGrams,
          weight_surplus_grams: weightSurplusGrams,

          // ── Thanh toán ──
          payment_method: paymentMethod,
          payment_status: "unpaid",
          status: "pending",

          // ── Người nhận ──
          receiver_gender: customer.gender ?? null,
          receiver_name: customer.full_name,
          receiver_phone: customer.phone,
          receiver_email: customer.email ?? null,
          receiver_address: customer.address,
          receiver_ward: customer.ward ?? null,
          receiver_ward_code: customer.wardCode ?? null,
          receiver_province: customer.province ?? null,
          receiver_province_code: customer.provinceCode ?? null,

          otp_verify_token: verifyToken ?? null,
          note: note ?? null,
        },
        trx,
      );

      // ── ORDER ITEMS ───────────────────────────────
      const orderItems = formatOrderItems(items, order.id);
      await OrderModel.createItems(orderItems, trx);

      // ── COUPON USAGE LOG ──────────────────────────
      if (resolvedCouponId) {
        await CouponService.markCouponUsed(
          {
            couponId: resolvedCouponId,
            userId,
            orderId: order.id,
            email: customer.email,
            phone: customer.phone,
            discountAmount: couponDiscount,
          },
          trx,
        );
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

  async getOrders({
    page = 1,
    limit = 20,
    status,
    search,
    payment,
    shipping_method,
  }) {
    const offset = (page - 1) * limit;

    const { data, total } = await OrderModel.getOrders({
      where: { status, search, payment, shipping_method },
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

      if (status === "delivered") {
        await EmailQueueService.sendOrderDelivered(order);
      }
      return true;
    });
  },

  async updatePayment(orderId, payment_status) {
    return OrderModel.updatePayment(orderId, payment_status);
  },
};

module.exports = OrderService;
