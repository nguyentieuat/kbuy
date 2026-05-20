/**
 * CATEGORIES TABLE
 * -----------------------------------------
 * Stores hierarchical product categories.
 *
 * Supports:
 * - tree structure (parent-child)
 * - multi-level categories
 * - sorting & ordering
 * - product classification for crawled data
 *
 * Common use cases:
 * - navigation menu
 * - product filtering
 * - SEO category pages
 * - mapping external categories → internal taxonomy
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("categories", (table) => {
    table.increments("id").primary();

    // =========================
    // BASIC INFO
    // =========================
    table.string("name", 100).notNullable();
    table.string("slug", 150).unique();
    // SEO-friendly URL identifier

    // =========================
    // HIERARCHY (TREE STRUCTURE)
    // =========================
    table
      .integer("parent_id")
      .references("id")
      .inTable("categories")
      .onDelete("SET NULL");
    // Self-reference for tree structure

    table.integer("level").defaultTo(0);
    // Depth level (0 = root, 1 = subcategory, ...)

    table.integer("sort_order").defaultTo(0);
    // Display ordering within same parent

    // =========================
    // STATUS
    // =========================
    table.boolean("is_active").defaultTo(true);

    // =========================
    // TIMESTAMPS
    // =========================
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });

  // =========================
  // INDEXES
  // =========================
  await knex.schema.alterTable("categories", (table) => {
    table.index("parent_id");
    // Fast tree traversal (get children)

    table.index("slug");
    // Fast SEO lookup
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("categories");
};