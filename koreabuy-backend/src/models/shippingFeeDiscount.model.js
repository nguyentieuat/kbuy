// models/shippingFeeDiscount.model.js

const db = require("../config/db.config");

async function getFeeBulky({ shippingType, discount_type = "bulky" }) {
  const rules = await db("shipping_fee_discounts")
    .where("is_active", true)
    .where(function () {
      this.where("shipping_type", shippingType).orWhere("shipping_type", "all");
    })
    .where("discount_type", discount_type) 
    .first(); 

  return rules;
}

/**
 * Lấy discount rule phù hợp nhất
 */
async function getShippingFeeDiscount({
  shippingType,
  region,
  orderAmount = 0,
  itemCount = 0,
  weightGrams = 0,
}) {
  const now = new Date();

  const rules = await db("shipping_fee_discounts")
    .where("is_active", true)
    .whereNot("discount_type", "bulky") 
    // shipping type
    .where(function () {
      this.where("shipping_type", shippingType).orWhere("shipping_type", "all");
    })

    // region
    .where(function () {
      this.whereNull("region").orWhere("region", region);
    })

    // thresholds
    .where("min_order_amount", "<=", orderAmount)
    .where("min_item_count", "<=", itemCount)
    .where("min_weight_grams", "<=", weightGrams)

    // time range
    .where(function () {
      this.whereNull("start_at").orWhere("start_at", "<=", now);
    })
    .where(function () {
      this.whereNull("end_at").orWhere("end_at", ">=", now);
    })

    // priority cao nhất trước
    .orderBy("priority", "desc");

  if (!rules.length) return null;

  // nếu is_stackable = false → chỉ lấy rule tốt nhất
  const bestRule = rules.find((r) => r.is_stackable === false);

  if (bestRule) return bestRule;

  // nếu stackable → trả tất cả rule
  return rules;
}


module.exports = {
  getFeeBulky,
  getShippingFeeDiscount
};
