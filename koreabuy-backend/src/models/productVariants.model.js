// models/products.models.js

const db = require("../config/db.config");

async function getShippingByVariants(variantIds = []) {
  if (!variantIds.length) return [];

  return db("product_variants as pv")
    .leftJoin(
      "product_variant_shipping as pvs",
      "pv.id",
      "ps.variant_id",
    )
    .select(
      // variant
      "pv.id",
      "pv.product_id",
      "pv.sku",

      "pv.name_kr",
      "pv.name_vi",

      "pv.price",
      "pv.original_price",

      "pv.currency",

      "pv.is_soldout",
      "pv.is_active",

      // shipping
      "pvs.is_bulky",
      "pvs.weight_grams",
      "pvs.chargeable_weight_grams",
    )
    .whereIn("pv.id", variantIds);
}

module.exports = {
 getShippingByVariants
};
