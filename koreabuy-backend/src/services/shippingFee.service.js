// services/shippingFee.service.js

const ShippingFeeConfigModel = require("../models/shippingFeeConfig.model");
const ShippingFeeDiscountModel = require("../models/shippingFeeDiscount.model");
const ExchangeRateModel = require("../models/exchangeRate.model");
const { getKrwToVndRate } = require("./currency.service");

/**
 * Lấy config phù hợp từ DB
 */
async function getConfig({ shippingType, region = null, weightGrams }) {
  // Fix: dùng shippingType param, không hardcode "local"
  // Fix: return config, không return hàm getConfig
  const config = await ShippingFeeConfigModel.getConfig({
    shippingType,
    region,
    weightGrams,
  });

  return config;
}

/**
 * Normalize weight theo method
 * - standard: giữ nguyên (tính theo gram thực)
 * - fast: làm tròn lên kg
 */
function normalizeWeight(weightGrams, method) {
  if (method === "fast") {
    return Math.ceil(weightGrams / 1000) * 1000;
  }
  return weightGrams; // standard: giữ nguyên
}

/**
 * Tính phí theo weight_rate
 */
function calcWeightRate(config, weightGrams) {
  const kg = weightGrams / 1000;
  return Math.ceil(kg * Number(config.rate_per_kg));
}

/**
 * Tính phí theo base_step
 */
function calcBaseStep(config, weightGrams) {
  const baseFee = Number(config.base_fee);
  const stepWeight = config.step_weight_grams;
  const stepFee = Number(config.step_fee);

  const extraGrams = Math.max(0, weightGrams - stepWeight);
  const steps = Math.ceil(extraGrams / stepWeight);

  return baseFee + steps * stepFee;
}

function applyShippingDiscount(baseFee, rule) {
  if (!rule) return { fee: baseFee, discount: 0, isFreeShipping: false };

  if (rule.discount_type === "freeship") {
    return { fee: 0, discount: baseFee, isFreeShipping: true };
  }

  if (rule.discount_type === "percent") {
    let discount = Math.round((baseFee * rule.discount_value) / 100);
    if (rule.max_discount_amount) {
      discount = Math.min(discount, Number(rule.max_discount_amount));
    }
    return { fee: baseFee - discount, discount, isFreeShipping: false };
  }

  if (rule.discount_type === "fixed") {
    const discount = Math.min(Number(rule.discount_value), baseFee);
    return { fee: baseFee - discount, discount, isFreeShipping: false };
  }

  return { fee: baseFee, discount: 0, isFreeShipping: false };
}

/**
 * Tính phí international
 */
async function calcInternationalFee(weightGrams, method, bulkyCount = 0) {
  const actualWeight = weightGrams;

  const billedWeight = normalizeWeight(weightGrams, method);

  const config = await getConfig({
    shippingType: "international",
    weightGrams: billedWeight,
  });

  if (!config) {
    throw new Error("No international shipping config found");
  }

  const weightDiff = billedWeight - actualWeight;
  const shouldApplyFastMultiplier = method === "fast" && weightDiff <= 400;

  const actualFee = calcWeightRate(config, actualWeight);
  let billedFee = calcWeightRate(config, billedWeight);

  if (shouldApplyFastMultiplier) {
    billedFee *= 1.2;
  }
  // ── BULKY SURCHARGE ──
  let internationalBulkyFee = 0;
  let intlBulkyRule = null;

  if (bulkyCount > 0) {
    intlBulkyRule = await ShippingFeeDiscountModel.getFeeBulky({
      shippingType: "international",
    });

    internationalBulkyFee =
      (intlBulkyRule ? Number(intlBulkyRule.discount_value) : 0) * bulkyCount;
  }

  return {
    actualWeight,
    billedWeight,

    actualFee: actualFee + internationalBulkyFee,
    billedFee: billedFee + internationalBulkyFee,

    bulkyFee: internationalBulkyFee,

    fee: billedFee,
    surplusFee: billedFee - actualFee,
  };
}

async function calcLocalFee({
  region,
  weightGrams,
  orderTotal = 0,
  itemCount = 0,
  bulkyCount = 0,
}) {
  const config = await getConfig({
    shippingType: "local",
    region,
    weightGrams,
  });
  if (!config)
    throw new Error(`No local shipping config for region: ${region}`);

  const baseFee = calcBaseStep(config, weightGrams); // phí gốc

  // Tìm discount rule
  const rule = await ShippingFeeDiscountModel.getShippingFeeDiscount({
    shippingType: "local",
    region,
    orderAmount: orderTotal,
    itemCount,
    weightGrams,
  });

  const { fee, discount, isFreeShipping } = applyShippingDiscount(
    baseFee,
    rule,
  );

  // ── BULKY SURCHARGE ──
  let localBulkyFee = 0;
  let localBulkyRule = null;

  if (bulkyCount > 0) {
    localBulkyRule = await ShippingFeeDiscountModel.getFeeBulky({
      shippingType: "local",
    });

    localBulkyFee =
      (localBulkyRule ? Number(localBulkyRule.discount_value) : 0) * bulkyCount;
  }

  return {
    baseFee: baseFee + localBulkyFee, // phí gốc (để hiển thị gạch ngang)
    fee: fee + localBulkyFee, // phí thực tế
    discount, // số tiền được giảm
    isFreeShipping,
    bulkyFee: localBulkyFee,
    discountRule: rule ? { name: rule.name, type: rule.discount_type } : null,
  };
}

async function calculateMinOrderFee({ source, orderTotalKrw, exchangeRate }) {
  const configs = await ShippingFeeDiscountModel.getMinOrderFeeRules();

  for (const config of configs) {
    const extra = config.extra_data || {};

    // Kiểm tra source có trong danh sách không
    if (extra.sources && !extra.sources.includes(source)) continue;

    const thresholdKrw = extra.threshold_krw || 0;

    // Nếu đơn đạt ngưỡng → không tính phụ phí
    if (orderTotalKrw >= thresholdKrw) continue;

    const feeKrw = extra.fee_krw || 0;
    const feeVnd = Math.round(feeKrw * exchangeRate);

    return {
      applied: true,
      name: config.name,
      fee_krw: feeKrw,
      fee_vnd: feeVnd,
      threshold_krw: thresholdKrw,
    };
  }

  return { applied: false, fee_krw: 0, fee_vnd: 0 };
}

/**
 * Main: tính tổng phí ship
 * @param {object} params
 * @param {number} params.weightGrams - cân nặng thực (gram)
 * @param {string} params.region - vùng giao hàng
 * @param {"fast"|"standard"} params.method - phương thức giao hàng
 * @param {number} params.orderTotal - tổng giá trị đơn hàng (để check freeship)
 */
// services/shippingFee.service.js

async function calculateShipping({
  weightGrams,
  region,
  method,
  orderTotal = 0,
  bulkyCount = 0,
  items = [],
}) {
  const actualWeight = weightGrams;

  const billedWeight =
    method === "fast" ? Math.ceil(weightGrams / 1000) * 1000 : weightGrams;

  // ── LOAD CONFIG ONCE ──
  const config = await getConfig({
    shippingType: "international",
    weightGrams: billedWeight,
  });

  if (!config) {
    throw new Error("No international shipping config found");
  }

  // ── BULKY SURCHARGE ──
  let intlBulkyRule = null;
  let localBulkyRule = null;

  let internationalBulkyFee = 0;
  let localBulkyFee = 0;

  if (bulkyCount > 0) {
    [intlBulkyRule, localBulkyRule] = await Promise.all([
      ShippingFeeDiscountModel.getFeeBulky({ shippingType: "international" }),
      ShippingFeeDiscountModel.getFeeBulky({ shippingType: "local" }),
    ]);

    internationalBulkyFee = (intlBulkyRule?.discount_value ?? 0) * bulkyCount;

    localBulkyFee = (localBulkyRule?.discount_value ?? 0) * bulkyCount;
  }

  // ── CALC ONCE ──
  const weightDiff = billedWeight - actualWeight;

  const shouldApplyFastMultiplier = method === "fast" && weightDiff <= 400;

  const actualFee = calcWeightRate(config, actualWeight);
  let billedFee = calcWeightRate(config, billedWeight);

  if (shouldApplyFastMultiplier) {
    billedFee *= 1.2;
  }

  // ── LOCAL ──
  let localResult = { fee: 0, isFreeShipping: false };

  if (region && region !== "unknown") {
    localResult = await calcLocalFee({
      region,
      weightGrams,
      method,
      orderTotal,
      bulkyCount,
    });
  }

  // ── TÍNH PHỤ PHÍ NỘI ĐỊA HÀN QUỐC (Xử lý đơn nhiều Source) ──
  let totalMinOrderFeeVnd = 0;
  const minOrderFeeDetails = [];

  const exchangeRate = await ExchangeRateModel.getRate("KRW", "VND");
  const rate = await getKrwToVndRate();

  if (items.length > 0 && exchangeRate) {
    // 1. Gom nhóm và tính tổng tiền KRW theo từng source
    const sourceTotals = {};
    items.forEach(item => {
      if (!sourceTotals[item.source]) {
        sourceTotals[item.source] = 0;
      }
      sourceTotals[item.source] += (Number(item.priceKrw) || 0) * (item.quantity || 1);
    });

    // 2. Chạy loop qua từng source có trong đơn để check phụ phí của web đó
    for (const [sourceName, sourceTotalKrw] of Object.entries(sourceTotals)) {
      const feeResult = await calculateMinOrderFee({
        source: sourceName,
        orderTotalKrw: sourceTotalKrw,
        exchangeRate: rate
      });

      if (feeResult.applied) {
        totalMinOrderFeeVnd += feeResult.fee_vnd;
        minOrderFeeDetails.push({
          source: sourceName,
          ...feeResult
        });
      }
    }
  }

  return {
    method,

    // weight
    actualWeightGrams: actualWeight,
    billedWeightGrams: billedWeight,
    weightSurplusGrams: billedWeight - actualWeight,

    // international
    internationalFee: billedFee + internationalBulkyFee,
    actualInternationalFee: actualFee + internationalBulkyFee,
    shippingFeeSurplus: billedFee - actualFee,

    bulkyFee: internationalBulkyFee + localBulkyFee,
    internationalBulkyFee,
    localBulkyFee,

    // local
    localFee: localResult.fee + localBulkyFee,
    localBaseFee: localResult.baseFee + localBulkyFee,
    localDiscount: localResult.discount,
    discountRule: localResult.discountRule,
    isFreeShipping: localResult.isFreeShipping,

    // Phụ phí Web Hàn Quốc bóc tách chi tiết
    minOrderFeeDetails,      // Trả về mảng các store bị tính phí để hiển thị ở Front-end
    totalMinOrderFeeVnd,     // Tổng tiền phụ phí Hàn Quốc hệ thống thu thêm

    // total
    total: billedFee + localResult.fee + localBulkyFee + internationalBulkyFee + totalMinOrderFeeVnd,
  };
}

module.exports = { calculateShipping, calcInternationalFee, calcLocalFee };
