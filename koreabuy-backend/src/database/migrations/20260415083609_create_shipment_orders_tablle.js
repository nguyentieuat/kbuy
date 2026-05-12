/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("shipment_orders", (table) => {
    table.increments("id").primary();

    table
      .integer("shipment_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("international_shipments")
      .onDelete("CASCADE");

    table
      .integer("order_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("orders")
      .onDelete("CASCADE");

    // snapshot nhanh
    table.string("order_code", 50).notNullable();

    table.timestamp("created_at").defaultTo(knex.fn.now());

    // 1 order chỉ thuộc 1 kiện quốc tế
    table.unique(["order_id"]);

    table.index(["shipment_id"]);
    table.index(["order_id"]);
    table.index(["order_code"]);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("shipment_orders");
};