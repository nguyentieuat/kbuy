/**
 * PRODUCT VARIANTS TABLE
 * -----------------------------------------
 * Stores SKU-level product data.
 *
 * Each variant represents a sellable unit with:
 * - specific price
 * - attributes (size, color, etc.)
 * - stock status
 *
 * Relationship:
 * - product (1) → variants (N)
 *
 * Used for:
 * - pricing calculation
 * - inventory display
 * - SKU-level tracking from crawled sources
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("product_variants", (table) => {
    table.bigIncrements("id").primary();

    // =========================
    // RELATION
    // =========================
    table
      .bigInteger("product_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("products")
      .onDelete("CASCADE");
    // If product is deleted → all variants are removed

    // =========================
    // IDENTIFICATION
    // =========================
    table.string("sku", 100).notNullable().unique();
    // Unique SKU across entire system (important for dedup + sync)

    // =========================
    // MULTI-LANGUAGE DATA
    // =========================
    table.text("name_kr");
    table.text("name_vi");
    // Optional override name for variant-specific labeling

    // =========================
    // PRICING
    // =========================
    table.decimal("price", 12, 2);
    table.decimal("original_price", 12, 2);
    table.integer("discount_percent");
    // NOTE:
    // - price is variant-level final price
    // - product.price_min/max is aggregated from variants

    table.string("currency", 10).defaultTo("KRW");
    // Needed for multi-source crawling (KRW, CNY, USD...)

    // =========================
    // STOCK STATUS
    // =========================
    table.boolean("is_soldout").defaultTo(false);

    // =========================
    // MEDIA OVERRIDE
    // =========================
    table.text("image_url");
    // Variant-specific image (override product gallery if needed)
    table.text("image_detail_url");
    // =========================
    // ATTRIBUTES (CRAWL CORE)
    // =========================
    table.jsonb("attributes");
    // Example:
    // {
    //   "size": "M",
    //   "color": "Black"
    // }
    // Used for:
    // - SKU generation
    // - variant grouping
    // - filter/search UI

    // =========================
    // STATUS FLAGS
    // =========================
    table.boolean("is_active").defaultTo(true);

    table.timestamps(true, true);
  });

  // =========================
  // INDEXES (PERFORMANCE)
  // =========================
  await knex.schema.alterTable("product_variants", (table) => {
    table.index("product_id");
    // Fast fetch all variants of a product

    table.index("sku");
    // Fast SKU lookup for sync / upsert / cart / order mapping

    table.string("hash", 64);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("product_variants");
};