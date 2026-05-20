// models/products.models.js

const db = require("../config/db.config");

async function getVariantSnapshotForOrder(variantIds = []) {
  if (!variantIds.length) return [];

  return db("product_variants as pv")
    .leftJoin("product_variant_shipping as pvs", "pv.id", "pvs.variant_id")
    .join("products as p", "p.id", "pv.product_id")
    .select(
      "pv.id",
      "pv.product_id",
      "pv.sku",

      "pv.image_url as variant_image",

      "p.name_vi as product_name_vi",
      "p.name_kr as product_name_kr",
      "p.product_url",
      "p.slug",

      "pv.name_kr",
      "pv.name_vi",

      "pv.price",
      "pv.original_price",

      "pv.currency",

      "pv.is_soldout",
      "pv.is_active",

      "pvs.is_bulky",
      "pvs.weight_grams",
      "pvs.chargeable_weight_grams",

      db.raw(`
        COALESCE(
  (
    SELECT url
    FROM product_variant_images i
    WHERE i.product_id = p.id
      AND i.variant_id IS NULL
      AND i.is_primary = true
    LIMIT 1
  ),
  pv.image_url
) as image
      `),
    )
    .whereIn("pv.id", variantIds);
}

module.exports = {
  getVariantSnapshotForOrder,
};
