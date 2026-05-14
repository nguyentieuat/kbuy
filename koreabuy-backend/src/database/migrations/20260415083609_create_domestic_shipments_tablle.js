/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("domestic_shipments", (table) => {
    table.increments("id").primary();

    table
      .integer("order_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("orders")
      .onDelete("CASCADE");

    // tracking nội địa
    table.string("tracking_code", 100).notNullable().unique();

    // GHN / GHTK / ViettelPost...
    table.string("carrier", 100).nullable();

    // pending_pickup | picked_up | shipping | delivered | failed
    table.string("status", 50).defaultTo("pending_pickup");

    // phí ship thực tế
    table.decimal("shipping_fee", 12, 2).defaultTo(0);

    // link tracking nếu có
    table.text("tracking_url").nullable();

    table.timestamp("shipped_at").nullable();
    table.timestamp("delivered_at").nullable();

    table.text("note").nullable();

    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    // 1 order = 1 shipment nội địa
    table.unique(["order_id"]);

    table.index(["tracking_code"]);
    table.index(["status"]);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("domestic_shipments");
};
