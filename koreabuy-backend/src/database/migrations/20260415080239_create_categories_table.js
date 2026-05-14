/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("categories", (table) => {
    table.increments("id").primary();

    table.string("name", 100).notNullable();
    table.string("slug", 150).unique();

    table
      .integer("parent_id")
      .references("id")
      .inTable("categories")
      .onDelete("SET NULL");

    table.integer("level").defaultTo(0);
    table.integer("sort_order").defaultTo(0);

    table.boolean("is_active").defaultTo(true);

    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });

  // INDEX (tăng tốc query)
  await knex.schema.alterTable("categories", (table) => {
    table.index("parent_id");
    table.index("slug");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("categories");
};
