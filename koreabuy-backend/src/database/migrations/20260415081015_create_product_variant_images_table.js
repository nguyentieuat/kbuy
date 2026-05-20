/**
 * PRODUCT IMAGES TABLE
 * -----------------------------------------
 * Stores:
 * - product gallery images
 * - variant-specific images
 * - detail/description images
 * - thumbnails
 * - swatches
 *
 * Strategy:
 * -----------------------------------------
 * variant_id = null
 *   → product-level image
 *
 * variant_id != null
 *   → variant-specific image
 *
 * image_type:
 *   gallery
 *   detail
 *   thumbnail
 *   swatch
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("product_variant_images", (table) => {
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
    // IMAGE DATA
    // =====================================================

    table.text("url").notNullable();
    // Original supplier image URL

    table.text("local_path").nullable();
    // Local downloaded path / CDN path

    table.string("hash", 64).nullable();
    // SHA256 / pHash

    table.string("mime_type", 50).nullable();

    table.integer("file_size").nullable();
    // bytes

    // =====================================================
    // IMAGE TYPE
    // =====================================================

    table
      .enu("image_type", [
        "gallery",
        "detail",
        "thumbnail",
        "swatch",
      ])
      .notNullable()
      .defaultTo("gallery");

    // =====================================================
    // GALLERY CONTROL
    // =====================================================

    table.boolean("is_primary")
      .notNullable()
      .defaultTo(false);

    table.integer("sort_order")
      .notNullable()
      .defaultTo(0);

    // =====================================================
    // DIMENSIONS
    // =====================================================

    table.integer("width").nullable();

    table.integer("height").nullable();

    // =====================================================
    // META
    // =====================================================

    table.boolean("is_active")
      .notNullable()
      .defaultTo(true);

    table.jsonb("extra_data").nullable();
    // optional:
    // ai tags
    // OCR
    // dominant color
    // etc.

    table.timestamps(true, true);

    // =====================================================
    // INDEXES
    // =====================================================

    table.index("product_id");

    table.index("variant_id");

    table.index("hash");

    table.index("image_type");

    table.index([
      "product_id",
      "variant_id",
    ]);
  });

  // =======================================================
  // FOREIGN KEYS
  // =======================================================

  await knex.schema.alterTable(
    "product_variant_images",
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
    CREATE INDEX idx_product_images_variant_only
    ON product_variant_images (variant_id)
    WHERE variant_id IS NOT NULL;

    CREATE INDEX idx_product_images_product_default
    ON product_variant_images (product_id)
    WHERE variant_id IS NULL;

    CREATE INDEX idx_product_images_primary
    ON product_variant_images (product_id, is_primary)
    WHERE is_primary = true;
  `);
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists(
    "product_variant_images"
  );
};