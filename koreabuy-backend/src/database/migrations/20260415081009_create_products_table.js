/**
 * PRODUCTS TABLE
 * -------------------------
 * Core catalog entity for crawled products.
 * Each product is identified by (source + external_id).
 * This table stores aggregated / canonical product information.
 *
 * Variants, images, and shipping are stored in separate tables.
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("products", (table) => {
    table.bigIncrements("id").primary();

    // =========================
    // CRAWL IDENTIFICATION
    // =========================
    table.string("external_id", 100).notNullable().unique();
    table.string("source", 50).notNullable(); // e.g. coupang, oliveyoung

    table.string("slug", 255);

    // =========================
    // PRODUCT INFO (MULTI-LANG)
    // =========================
    table.text("name_kr");
    table.text("name_vi");

    table.text("description_kr");
    table.text("description_vi");

    // =========================
    // PRICE AGGREGATION
    // (derived from variants or crawl fallback)
    // =========================
    table.decimal("price_min", 12, 2);
    table.decimal("price_max", 12, 2);
    table.decimal("original_price", 12, 2);
    table.decimal("sale_price", 12, 2);

    table.string("currency", 10).defaultTo("KRW");

    table.integer("discount_percent");

    // =========================
    // SOURCE LINKS
    // =========================
    table.text("product_url");
    table.string("shop_name", 255);
    table.text("shop_url");

    // =========================
    // CATEGORY MAPPING
    // =========================
    table.integer("category_id").unsigned().nullable();
    table.string("category_slug", 150).nullable();

    // =========================
    // SEO
    // =========================
    table.text("meta_title");
    table.text("meta_description");

    // =========================
    // STATUS FLAGS
    // =========================
    table.boolean("is_active").defaultTo(true);
    table.boolean("is_deleted").defaultTo(false);

    // =========================
    // FLEXIBLE CRAWL STORAGE
    // =========================
    table.jsonb("extra_data");

    // =========================
    // MARKETING FLAGS
    // =========================
    table.boolean("is_featured").notNullable().defaultTo(false);
    table.smallint("featured_order").notNullable().defaultTo(0);

    table.timestamp("new_arrival_until", { useTz: true }).nullable();

    // =========================
    // RATING FROM SOURCE SITE
    // =========================
    table.decimal("source_rating_avg", 12, 2).defaultTo(null);
    table.integer("source_rating_count").defaultTo(0);

    table.string("hash", 64).nullable();
    table.string("image_hash", 64).nullable();

    table.timestamps(true, true);
  });

  // =========================
  // INDEXES (QUERY OPTIMIZATION)
  // =========================
  await knex.schema.alterTable("products", (table) => {
    table.index("source");
    table.index("slug");
    table.index("category_id");
    table.index("category_slug");

    // IMPORTANT: crawl lookup index
    table.index(["source", "external_id"]);
  });

  // =========================
  // PARTIAL INDEXES (PERFORMANCE)
  // =========================
  await knex.raw(`
    CREATE INDEX idx_products_featured_active
      ON products (featured_order)
      WHERE is_featured = true;

    CREATE INDEX idx_products_new_arrival_active
      ON products (new_arrival_until)
      WHERE new_arrival_until IS NOT NULL;
  `);
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("products");
};
