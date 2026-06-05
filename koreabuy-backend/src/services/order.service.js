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
    product_name_kr: item.productNameKr,
    variant_name: item.variantName ?? null,
    variant_name_kr: item.variantNameKr ?? null,
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

    // ── Validate cơ bản ───────────────────────────────
    if (!items?.length) throw new Error("Giỏ hàng trống");
    if (!customer?.full_name || !customer?.phone || !customer?.address) {
      throw new Error("Thiếu thông tin người nhận");
    }

    // ── TÍNH TIỀN HÀNG ────────────────────────────────
    const variantIds = items.map((x) => x.variantId).filter(Boolean);
    const productIds = items.map((x) => x.productId).filter(Boolean);

    const variantRows = await ProductVariantModel.getVariantSnapshotForOrder(variantIds);
    const productRows = await ProductModel.getProductsSnapshotForOrder(productIds);

    const variantMap = new Map(variantRows.map((v) => [v.id, v]));
    const productMap = new Map(productRows.map((p) => [p.id, p]));

    const resolvedItems = [];

    for (const item of items) {
      if (item.variantId) {
        const variant = variantMap.get(item.variantId);
        if (!variant) throw new Error("Variant không tồn tại");

        const priceKrw = Number(variant.price || 0);
        const originalPriceKrw = Number(variant.original_price || variant.price || 0);

        resolvedItems.push({
          type: "variant",
          productId: variant.product_id,
          variantId: variant.id,
          productName: variant.product_name_vi,
          productNameKr: variant.product_name_kr,
          variantName: variant.name_vi,
          variantNameKr: variant.name_kr,
          image: variant.image ?? variant.variant_image ?? item.image,
          productLink: variant.product_url ?? item.productUrl,
          quantity: item.quantity,
          priceKrw,
          originalPriceKrw,
          price: Math.round(priceKrw * rate),
          originalPrice: Math.round(originalPriceKrw * rate),
          chargeableWeightGrams: variant.chargeable_weight_grams ?? variant.weight_grams ?? 0,
          isBulky: variant.is_bulky ?? false,
        });
        continue;
      }

      // PRODUCT ONLY
      const product = productMap.get(item.productId);
      if (!product) throw new Error("Sản phẩm không tồn tại");

      const salePriceKrw = Number(product.sale_price || 0);
      const originalPriceKrw = Number(product.original_price || product.sale_price || 0);

      resolvedItems.push({
        type: "product",
        productId: product.id,
        variantId: null,
        productName: product.name_vi,
        productNameKr: product.name_kr,
        image: product.image ?? item.image,
        productLink: product.product_url ?? item.productUrl,
        quantity: item.quantity,
        priceKrw: salePriceKrw,
        originalPriceKrw,
        price: Math.round(salePriceKrw * rate),
        originalPrice: Math.round(originalPriceKrw * rate),
        chargeableWeightGrams: product.chargeable_weight_grams ?? product.weight_grams ?? 0,
        isBulky: product.is_bulky ?? false,
      });
    }

    const bulkyCount = resolvedItems.reduce((sum, item) => sum + (item.isBulky ? item.quantity : 0), 0);
    const serverTotalOriginal = resolvedItems.reduce((sum, item) => sum + item.originalPrice * item.quantity, 0);
    const serverTotalFinal = resolvedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const productDiscount = serverTotalOriginal - serverTotalFinal;

    // ── TÍNH WEIGHT ───────────────────────────────────
    const weightGrams = resolvedItems.reduce((sum, item) => sum + (item.chargeableWeightGrams || 0) * item.quantity, 0);

    // ── DETECT REGION ─────────────────────────────────
    const region = customer.provinceCode
      ? detectShippingRegion({ provinceCode: Number(customer.provinceCode), wardCode: customer.wardCode })
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
      actualWeightGrams,
      billedWeightGrams,
      weightSurplusGrams,
      internationalFee,
      localFee,
      total: serverShippingFee,
      isFreeShipping,
      internationalBulkyFee,
      localBulkyFee,
      actualInternationalFee,
      shippingFeeSurplus,
    } = shippingCalc;

    let serverShippingDiscount = isFreeShipping ? localFee : 0;

    // ── SERVICE FEE (Đảo lên trước Coupon) ─────────────
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
        serviceFee,
      });

      resolvedCouponId = couponResult.coupon.id;
      resolvedCouponCode = couponResult.coupon.code;

      if (couponResult.coupon.discountType === "freeship") {
        serverShippingDiscount = localFee;
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

    // ── OTP CHECK (Dời xuống đây để lấy đúng finalPrice thực tế) ──
    if (paymentMethod === "cod") {
      const requireOtp = await OtpService.shouldRequireOtp({
        phone: normalizePhone(customer.phone),
        paymentMethod,
        grandTotal: finalPrice,
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

    // ── TRANSACTION ───────────────────────────────────
    const result = await db.transaction(async (trx) => {
      const orderCode = generateOrderCode();

      const order = await OrderModel.create(
        {
          order_code: orderCode,
          user_id: userId ?? null,
          total_price: serverTotalOriginal,
          product_discount: productDiscount,
          service_fee: serviceFee,
          shipping_fee: serverShippingFee,
          international_shipping_fee: internationalFee,
          local_shipping_fee: localFee,
          shipping_discount: serverShippingDiscount,
          actual_international_shipping_fee: actualInternationalFee,
          shipping_fee_surplus: shippingFeeSurplus,
          has_bulky: bulkyCount > 0,
          international_bulky_fee: internationalBulkyFee,
          local_bulky_fee: localBulkyFee,
          discount_amount: couponDiscount + serverShippingDiscount,
          final_price: finalPrice,
          sell_rate_snapshot: rate,
          exchange_rate_meta: exchangeRate,
          currency: "VND",
          coupon_id: resolvedCouponId,
          coupon_code: resolvedCouponCode,
          shipping_method: shipping,
          shipping_region: region,
          actual_weight_grams: actualWeightGrams,
          chargeable_weight_grams: billedWeightGrams,
          weight_surplus_grams: weightSurplusGrams,
          payment_method: paymentMethod,
          payment_status: "unpaid",
          status: "pending",
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

      const orderItems = formatOrderItems(resolvedItems, order.id);
      await OrderModel.createItems(orderItems, trx);

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
        order,
        orderId: order.id,
        orderCode: order.order_code,
        finalPrice,
      };
    });

    await EmailQueueService.sendAdminOrderAlert(result.order);

    return {
      orderId: result.orderId,
      orderCode: result.orderCode,
      finalPrice: result.finalPrice,
    };
  },

  async getOrderDetail(orderCode) {
    const order = await OrderModel.findWithItemsByOrderCode(orderCode);

    if (!order) {
      throw new Error("Không tìm thấy đơn hàng");
    }

    return mapOrderDetail(order);
  },

  async getOrdersByUser(userId, { page = 1, limit = 10, status = null } = {}) {
    const offset = (page - 1) * limit;

    const [orders, totalRow, statusRows] = await Promise.all([
      OrderModel.findByUserId(userId, { limit, offset, status }),
      OrderModel.countByUserId(userId),
      OrderModel.countByStatusUserId(userId),
    ]);

    const total = Number(totalRow);
    const totalPages = Math.ceil(total / limit);

    const statusCounts = {};
    for (const row of statusRows) {
      statusCounts[row.status] = Number(row.count);
    }

    if (orders.length === 0) {
      return {
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
        statusCounts: statusCounts,
      };
    }

    const orderIds = orders.map((o) => o.id);

    const [items, logs] = await Promise.all([
      OrderItemModel.findByOrderIds(orderIds),
      OrderStatusLogModel.findByOrderIds(orderIds),
    ]);

    const itemsMap = {};
    for (const item of items) {
      if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
      itemsMap[item.order_id].push(item);
    }

    const logsMap = {};
    for (const log of logs) {
      if (!logsMap[log.order_id]) logsMap[log.order_id] = [];
      logsMap[log.order_id].push(log);
    }

    const data = orders.map((order) =>
      mapOrderSummary({
        ...order,
        items: itemsMap[order.id] || [],
        status_logs: logsMap[order.id] || [],
      }),
    );

    return {
      data,
      pagination: { page, limit, total, totalPages },
      statusCounts: statusCounts,
    };
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
