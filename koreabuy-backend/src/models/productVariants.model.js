// models/products.models.js

const db = require("../config/db.config");

async function getVariantSnapshotForOrder(variantIds = []) {
  if (!variantIds.length) return [];

  return db("product_variants as pv")
    .leftJoin(
      "product_variant_shipping as pvs_variant",
      "pv.id",
      "pvs_variant.variant_id",
    )

    .join("products as p", "p.id", "pv.product_id")

    .leftJoin("product_variant_shipping as pvs_product", function () {
      this.on("p.id", "=", "pvs_product.product_id").andOnNull(
        "pvs_product.variant_id",
      );
    })
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

      db.raw(`
        COALESCE(
          pvs_variant.chargeable_weight_grams,
          pvs_variant.weight_grams,
          pvs_product.chargeable_weight_grams,
          pvs_product.weight_grams,
          500
        ) as resolved_weight
      `),
      db.raw(
        `COALESCE(pvs_variant.is_bulky, pvs_product.is_bulky, false) as is_bulky`,
      ),
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
