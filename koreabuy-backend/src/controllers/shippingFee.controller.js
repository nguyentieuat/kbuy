// controllers/shippingFee.controller.js

const CalculateShippingService = require("../services/shippingFee.service");
const { detectShippingRegion } = require("../utils/detectShippingRegion");
const ProductVariantModel = require("../models/productVariants.model");
const ProductModel = require("../models/products.model");
//  Đã xóa dòng import ExchangeRateModel ở đây

async function calculateShipping(req, res) {
  try {
    const {
      items,
      provinceCode,
      wardCode,
      method = "standard",
      orderTotal = 0,
    } = req.body;

    if (!items?.length) {
      return res.status(400).json({ error: "items là bắt buộc" });
    }

    // ── 1. Load data: Lấy các Variant & Product tương ứng ──
    const variantIds = items.map((x) => x.variantId).filter(Boolean);
    const variantRows = variantIds.length
      ? await ProductVariantModel.getVariantSnapshotForOrder(variantIds)
      : [];
    const variantMap = new Map(variantRows.map((v) => [v.id, v]));

    const directProductIds = items.map((x) => x.productId).filter(Boolean);
    const variantProductIds = variantRows.map((v) => v.product_id).filter(Boolean);
    const uniqueProductIds = [...new Set([...directProductIds, ...variantProductIds])];

    const productRows = uniqueProductIds.length
      ? await ProductModel.getProductsSnapshotForOrder(uniqueProductIds)
      : [];
    const productMap = new Map(productRows.map((p) => [p.id, p]));

    // ── 2. Tính toán trọng lượng, bulky và Đóng gói data cho Service ──
    let weightGrams = 0;
    let bulkyCount = 0;
    const enrichedItems = [];

    for (const item of items) {
      let chargeableWeight = 0;
      let isBulky = false;
      let source = "unknown";
      let priceKrw = 0;

      const variant = variantMap.get(item.variantId);
      const product = productMap.get(variant?.product_id || item.productId);

      if (variant) {
        chargeableWeight = variant.resolved_weight;
        isBulky = variant.is_bulky ?? false;
        priceKrw = variant.price_krw ?? 0;
        source = product?.source || variant.source || "unknown";
      } else if (product) {
        chargeableWeight = product.resolved_weight ?? 500;
        isBulky = product.is_bulky ?? false;
        priceKrw = product.price_krw ?? 0;
        source = product.source || "unknown";
      }

      weightGrams += chargeableWeight * item.quantity;
      if (isBulky) bulkyCount += item.quantity;

      enrichedItems.push({
        source,
        priceKrw,
        quantity: item.quantity,
      });
    }

    if (weightGrams <= 0) {
      return res.status(400).json({ error: "Không tính được khối lượng" });
    }

    // ── Detect region ──
    const region = provinceCode
      ? detectShippingRegion({ provinceCode, wardCode })
      : null;

    // ── 3. Gọi Service tính tổng phí (Không cần truyền tỷ giá nữa) ──
    const shippingCalc = await CalculateShippingService.calculateShipping({
      weightGrams,
      region,
      method,
      orderTotal,
      bulkyCount,
      items: enrichedItems,
      //  Đã gỡ bỏ exchangeRate
    });

    // ── 4. Trả về kết quả cho Client ──
    res.json({
      method,
      weightGrams: shippingCalc.billedWeightGrams,
      region: region ?? "unknown",
      internationalFee: shippingCalc.internationalFee,
      localFee: shippingCalc.localFee,
      localBaseFee: shippingCalc.localBaseFee,
      localDiscount: shippingCalc.localDiscount,
      isFreeShipping: shippingCalc.isFreeShipping,
      discountRule: shippingCalc.discountRule,
      hasBulky: shippingCalc.hasBulky,
      bulkyCount: shippingCalc.bulkyCount,
      bulkyFee: shippingCalc.bulkyFee,
      minOrderFeeDetails: shippingCalc.minOrderFeeDetails || [],
      totalMinOrderFeeVnd: shippingCalc.totalMinOrderFeeVnd || 0,
      total: shippingCalc.total,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  calculateShipping,
};