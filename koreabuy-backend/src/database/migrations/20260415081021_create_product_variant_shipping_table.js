/**
 * PRODUCT SHIPPING TABLE
 * -----------------------------------------
 * Stores product / variant shipping data used for:
 * - shipping fee calculation
 * - volumetric weight computation
 * - logistics classification
 * - AI extraction + normalization pipeline
 *
 * Supports:
 * - product-level shipping data
 * - variant-level shipping overrides
 *
 * Strategy:
 * -----------------------------------------
 * variant_id = null
 *   → default shipping info for product
 *
 * variant_id != null
 *   → shipping override for specific variant
 *
 * Examples:
 * -----------------------------------------
 * Product:
 *   Cushion Foundation
 *
 * Shipping rows:
 *   product_id=1, variant_id=null → 250g
 *   product_id=1, variant_id=10   → 80g refill
 *   product_id=1, variant_id=11   → 500g set bundle
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("product_variant_shipping", (table) => {
    table.bigIncrements("id").primary();

    // =====================================================
    // RELATIONS
    // =====================================================

    table
      .bigInteger("product_id")
      .unsigned()
      .notNullable();

    table
      .bigInteger("variant_id")
      .unsigned()
      .nullable();

    // =====================================================
    // RAW DATA (CRAWL INPUT)
    // =====================================================

    table.integer("raw_weight_grams").nullable();

    table.integer("raw_length_mm").nullable();
    table.integer("raw_width_mm").nullable();
    table.integer("raw_height_mm").nullable();

    table.text("raw_specs_text").nullable();
    // Original supplier specs text
    // Example:
    // "Weight: 250g / Size: 12 x 8 x 5 cm"

    // =====================================================
    // NORMALIZED DATA
    // =====================================================

    table.integer("weight_grams").nullable();
    // Actual physical weight

    table.integer("length_mm").nullable();
    table.integer("width_mm").nullable();
    table.integer("height_mm").nullable();

    // =====================================================
    // SHIPPING ENGINE
    // =====================================================

    table.integer("volumetric_weight_grams").nullable();
    // Formula:
    // (L × W × H) / divisor

    table.integer("chargeable_weight_grams").nullable();
    // Final shipping weight:
    // max(actual, volumetric)

    table.boolean("is_bulky").notNullable().defaultTo(false);

    table.boolean("is_fragile").notNullable().defaultTo(false);

    table
      .boolean("requires_special_packaging")
      .notNullable()
      .defaultTo(false);

    // =====================================================
    // AI / PARSING META
    // =====================================================

    table.string("weight_source", 50).nullable();
    // ai | regex | supplier | manual

    table.decimal("weight_confidence", 3, 2).nullable();
    // 0.00 → 1.00

    table.boolean("is_weight_estimated")
      .notNullable()
      .defaultTo(true);

    // =====================================================
    // STATUS
    // =====================================================

    table.boolean("is_active")
      .notNullable()
      .defaultTo(true);

    // =====================================================
    // TIMESTAMPS
    // =====================================================

    table.timestamps(true, true);

    // =====================================================
    // INDEXES
    // =====================================================

    table.index("product_id");

    table.index("variant_id");

    table.index([
      "product_id",
      "variant_id",
    ]);

    table.index("chargeable_weight_grams");

    // =====================================================
    // UNIQUE CONSTRAINT
    // =====================================================

    table.unique([
      "product_id",
      "variant_id",
    ]);
  });

  // =======================================================
  // FOREIGN KEYS
  // =======================================================

  await knex.schema.alterTable(
    "product_variant_shipping",
    (table) => {
      table
        .foreign("product_id")
        .references("id")
        .inTable("products")
        .onDelete("CASCADE");

      table
        .foreign("variant_id")
        .references("id")
        .inTable("product_variants")
        .onDelete("CASCADE");
    }
  );

  // =======================================================
  // PARTIAL INDEXES
  // =======================================================

  await knex.raw(`
    CREATE INDEX idx_product_shipping_variant_only
    ON product_variant_shipping (variant_id)
    WHERE variant_id IS NOT NULL;

    CREATE INDEX idx_product_shipping_product_default
    ON product_variant_shipping (product_id)
    WHERE variant_id IS NULL;

    CREATE INDEX idx_product_shipping_bulky
    ON product_variant_shipping (is_bulky)
    WHERE is_bulky = true;
  `);
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists(
    "product_variant_shipping"
  );
};