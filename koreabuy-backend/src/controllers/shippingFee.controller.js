// controllers/shippingFee.controller.js

const CalculateShippingService = require("../services/shippingFee.service");
const { detectShippingRegion } = require("../utils/detectShippingRegion");
const ProductVariantModel = require("../models/productVariants.model");
const ProductModel = require("../models/products.model");


async function calculateShipping(req, res) {
  try {
    const { items, provinceCode, wardCode, method = "standard", orderTotal = 0 } = req.body;

    if (!items?.length) {
      return res.status(400).json({ error: "items là bắt buộc" });
    }

    // ── Load shipping info từ DB ──
    const variantIds = items.map((x) => x.variantId).filter(Boolean);
    const productIds = items.map((x) => x.productId).filter(Boolean);

    const [variantRows, productRows] = await Promise.all([
      ProductVariantModel.getVariantSnapshotForOrder(variantIds),
      ProductModel.getProductsSnapshotForOrder(productIds),
    ]);

    const variantMap = new Map(variantRows.map((v) => [v.id, v]));
    const productMap = new Map(productRows.map((p) => [p.id, p]));

    // ── Tính weight & bulky từ DB ──
    let weightGrams = 0;
    let bulkyCount = 0;

    for (const item of items) {
      let chargeableWeight = 0;
      let isBulky = false;

      if (item.variantId) {
        const variant = variantMap.get(item.variantId);
        if (variant) {
          chargeableWeight = variant.chargeable_weight_grams ?? variant.weight_grams ?? 0;
          isBulky = variant.is_bulky ?? false;
        }
      } else {
        const product = productMap.get(item.productId);
        if (product) {
          chargeableWeight = product.chargeable_weight_grams ?? product.weight_grams ?? 0;
          isBulky = product.is_bulky ?? false;
        }
      }

      weightGrams += chargeableWeight * item.quantity;
      if (isBulky) bulkyCount += item.quantity;
    }

    if (weightGrams <= 0) {
      return res.status(400).json({ error: "Không tính được khối lượng" });
    }

    // ── Detect region ──
    const region = provinceCode
      ? detectShippingRegion({ provinceCode, wardCode })
      : null;

    // ── Tính phí ──
    const shippingCalc = await CalculateShippingService.calculateShipping({
      weightGrams,
      region,
      method,
      orderTotal,
      bulkyCount,
    });

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
