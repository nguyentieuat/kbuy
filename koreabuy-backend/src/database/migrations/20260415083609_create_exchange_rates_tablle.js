/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  // ================================
  // exchange_rates
  // Lưu lịch sử tỉ giá theo thời gian
  // ================================
  await knex.schema.createTable("exchange_rates", (table) => {
    table.bigIncrements("id").primary();

    // Đồng tiền gốc
    // Ví dụ: KRW
    table.string("base_currency", 10).notNullable();

    // Đồng tiền đích
    // Ví dụ: VND
    table.string("target_currency", 10).notNullable();

    // Tỉ giá thực tế lấy từ provider/API
    // Ví dụ:
    // 1 KRW = 18.25 VND
    table.decimal("provider_rate", 18, 6).notNullable();

    // Tỉ giá áp dụng cho khách
    // Có thể cộng margin/phí
    // Ví dụ:
    // 1 KRW = 20 VND
    table.decimal("sell_rate", 18, 6).notNullable();

    // Nguồn lấy tỉ giá
    // exchangerate.host / bank / manual
    table.string("source", 50).nullable();

    // Thời điểm tỉ giá bắt đầu có hiệu lực
    table.timestamp("effective_at").notNullable().defaultTo(knex.fn.now());

    // Đánh dấu active
    // Chỉ nên có 1 rate active cho mỗi cặp tiền tệ
    table.boolean("is_active").notNullable().defaultTo(true);

    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());

    // Index để query nhanh
    table.index(["base_currency", "target_currency"]);
    table.index(["is_active"]);
    table.index(["effective_at"]);
  });
}

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  // rollback exchange_rates
  await knex.schema.dropTableIfExists("exchange_rates");
};