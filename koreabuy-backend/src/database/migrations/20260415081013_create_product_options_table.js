/**
 * PRODUCT OPTIONS TABLE
 * -----------------------------------------
 * Stores selectable options for a product.
 *
 * Examples:
 *
 * Gen.G Jersey
 * - Size: ["90", "95", "100"]
 *
 * T1 Uniform
 * - Color: ["Black", "White"]
 * - Size: ["M", "L"]
 *
 * Olive Young Set
 * - Option: ["Single", "1+1 Set"]
 *
 * Purpose:
 * - Build option selectors on frontend
 * - Separate UI options from product variants
 * - Normalize data from different crawlers
 *
 * Relationship:
 * - product (1) → options (N)
 *
 * Notes:
 * - values is stored as JSON array
 * - variants still store the final selected combination
 *   in product_variants.attributes
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("product_options", (table) => {
    // =========================
    // PRIMARY KEY
    // =========================
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
    // If product is deleted → all options are removed

    // =========================
    // OPTION INFO
    // =========================
    table.string("name", 100).notNullable();
    // Examples:
    // Size
    // Color
    // Capacity
    // Package Type

    table.jsonb("values").notNullable();

    table.string("type", 30).defaultTo("variant");
    
    // Example:
    // ["Black", "White"]
    //
    // ["90", "95", "100"]
    //
    // ["Single", "1+1 Set"]

    table.integer("position").defaultTo(0);
    // Used for frontend display ordering

    // =========================
    // TIMESTAMPS
    // =========================
    table.timestamps(true, true);
  });

  // =========================
  // INDEXES
  // =========================
  await knex.schema.alterTable("product_options", (table) => {
    table.index("product_id");
    // Fast lookup of all options for a product
  });
};

/**
 * Rollback
 *
 * Drops product_options table.
 *
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("product_options");
};