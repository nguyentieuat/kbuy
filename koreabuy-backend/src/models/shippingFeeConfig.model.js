// models/shippingFeeConfig.model.js

const db = require("../config/db.config");

/**
 * Lấy shipping config phù hợp theo:
 * - shipping type
 * - region
 * - weight
 */
async function getConfig({ shippingType, region = null, weightGrams }) {
  const query = db("shipping_fee_configs")
    .where("is_active", true)

    // international / local
    .where("shipping_type", shippingType)

    // min <= weight
    .where("min_weight_grams", "<=", weightGrams)

    // max >= weight OR unlimited
    .where(function () {
      this.where("max_weight_grams", ">=", weightGrams).orWhereNull(
        "max_weight_grams",
      );
    });

  /**
   * REGION
   *
   * local:
   * - noi_vung
   * - lien_vung
   * - lien_tinh
   *
   * international:
   * usually null
   */

  if (region) {
    query.where("region", region);
  }

  return query.orderBy("min_weight_grams", "desc").first();
}


async function getAllConfigs() {
  return db("shipping_fee_configs")
    .where("is_active", true)
    .orderBy(["shipping_type", "min_weight_grams"]);
}

async function getAllDiscounts() {
  return db("shipping_fee_discounts")
    .where("is_active", true)
    .whereNot("discount_type", "bulky")
    .orderBy(["shipping_type", "priority"]);
}

async function getBulkyFees() {
  return db("shipping_fee_discounts")
    .where({ is_active: true, discount_type: "bulky" })
    .orderBy("shipping_type");
}

module.exports = { getConfig, getAllConfigs, getAllDiscounts, getBulkyFees };

