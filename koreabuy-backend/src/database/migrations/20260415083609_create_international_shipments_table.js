/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("international_shipments", (table) => {
    table.increments("id").primary();

    // Mã kiện quốc tế / tracking quốc tế
    table.string("tracking_code", 100).notNullable().unique();

    // Đơn vị vận chuyển quốc tế
    table.string("carrier", 100).nullable();

    // Trạng thái kiện quốc tế
    // preparing | shipped | arrived_korea | customs | arrived_vn | completed
    table.string("status", 50).defaultTo("preparing");

    // Kho gửi / kho nhận
    table.string("from_warehouse", 255).nullable();
    table.string("to_warehouse", 255).nullable();

    // Thông tin thêm
    table.text("note").nullable();

    table.timestamp("shipped_at").nullable();
    table.timestamp("arrived_at").nullable();

    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    table.index(["tracking_code"]);
    table.index(["status"]);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("international_shipments");
};
