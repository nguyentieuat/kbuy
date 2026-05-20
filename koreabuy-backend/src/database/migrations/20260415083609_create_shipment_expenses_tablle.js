/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("shipment_expenses", (table) => {
    table.increments("id").primary();

    table
      .integer("shipment_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("international_shipments")
      .onDelete("CASCADE");

    // loại phí
    // customs_tax
    // domestic_shipping
    // korea_shipping
    // repack_fee
    // insurance_fee
    // storage_fee
    // remote_area_fee
    // other
    table.string("expense_type", 50).notNullable();

    // mô tả
    table.string("title", 255).notNullable();

    table.text("description").nullable();

    // tiền
    table.decimal("amount", 15, 2).notNullable();

    // KRW | VND | USD
    table.string("currency", 10).defaultTo("KRW");

    // ai tạo
    table.integer("created_by").unsigned().nullable();

    // hóa đơn / proof
    table.string("attachment_url", 500).nullable();

    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    table.index(["shipment_id"]);
    table.index(["expense_type"]);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("shipment_expenses");
};