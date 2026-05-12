/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("order_status_logs", (table) => {
    table.increments("id").primary();

    table
      .integer("order_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("orders")
      .onDelete("CASCADE");

    table.string("order_code", 50).notNullable().index();

    table.string("status", 50).notNullable();
    table.text("note");

    table
      .integer("updated_by")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");

    table.string("location", 255).nullable();
    table.string("handler_name", 255).nullable();

    table.timestamp("created_at").defaultTo(knex.fn.now());

    // index ngay trong createTable (clean hơn)
    table.index(["order_id"]);
    table.index(["order_code"]);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("order_status_logs");
};
