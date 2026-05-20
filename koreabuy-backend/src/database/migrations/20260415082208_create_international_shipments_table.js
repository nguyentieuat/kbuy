/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("international_shipments", (table) => {
    table.increments("id").primary();

    // Mã lô hàng
    table.string("shipment_code", 50).unique().notNullable();

    // Carrier thực tế gửi
    table.string("carrier", 50).notNullable(); // CJ, EMS, K-Packet...

    // ── WEIGHT THỰC TẾ CỦA LÔ ──
    // Tổng cân thực của tất cả đơn trong lô
    table.integer("total_actual_weight_grams").defaultTo(0);

    // Cân lô thực tế carrier tính phí (có thể khác do đóng gói)
    table.integer("total_billed_weight_grams").defaultTo(0);

    // ── CHI PHÍ THỰC TẾ ──
    // Tiền thực tế trả carrier (KRW)
    table.decimal("actual_cost_krw", 12, 2).nullable();

    // Tiền thực tế quy đổi VND
    table.decimal("actual_cost_vnd", 12, 2).nullable();

    // Tỉ giá lúc thanh toán carrier
    table.decimal("exchange_rate_used", 18, 6).nullable();

    // ── DOANH THU TỪ KHÁCH ──
    // Tổng phí ship quốc tế khách đã trả trong lô này
    table.decimal("total_collected_fee", 12, 2).defaultTo(0);

    // ── LỢI NHUẬN ──
    // = total_collected_fee - actual_cost_vnd
    // Tính sau khi có actual_cost
    table.decimal("shipping_profit", 12, 2).nullable();

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
    table.timestamps(true, true);

    table.index(["shipment_code"]);
    table.index(["status"]);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("international_shipments");
};
