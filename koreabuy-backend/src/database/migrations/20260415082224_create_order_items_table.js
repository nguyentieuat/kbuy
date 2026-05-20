/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("order_items", (table) => {
    table.increments("id").primary();

    table
      .integer("order_id")
      .references("id")
      .inTable("orders")
      .onDelete("CASCADE");

    table
      .integer("product_id")
      .nullable()
      .references("id")
      .inTable("products")
      .onDelete("SET NULL");

    table
      .integer("variant_id")
      .nullable()
      .references("id")
      .inTable("product_variants")
      .onDelete("SET NULL");

    // ── Snapshot tại thời điểm mua ───────────────────
    // Quan trọng: lưu lại thông tin sản phẩm lúc mua
    // vì sau này product/variant có thể bị sửa hoặc xóa
    table.string("product_name", 255);
    table.string("product_name_kr", 255);
    table.string("variant_name", 255).nullable(); // thêm — tên variant lúc mua
    table.string("variant_name_kr", 255).nullable(); // thêm — tên variant lúc mua
    table.string("sku", 100).nullable(); // thêm
    table.text("product_link").nullable();
    table.text("image").nullable();

    // ── Giá ─────────────────────────────────────────
    table.decimal("original_price", 12, 2).nullable(); // thêm — giá gốc
    table.decimal("price", 12, 2); // Giá bán
    table.integer("quantity");
    table.decimal("total_price", 12, 2);

    // ── Timestamps ───────────────────────────────────
    table.timestamp("created_at").defaultTo(knex.fn.now()); // thêm
  });

  await knex.schema.alterTable("order_items", (table) => {
    table.index("order_id");
    table.index("product_id");
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("order_items");
};
