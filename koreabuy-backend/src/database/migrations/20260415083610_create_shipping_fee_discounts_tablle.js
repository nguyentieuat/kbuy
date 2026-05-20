exports.up = async function (knex) {

  // ── Bảng quản lý discount theo ngưỡng ──
  await knex.schema.createTable("shipping_fee_discounts", (table) => {
    table.increments("id").primary();

    // Liên kết với config nào
    // null = áp dụng cho tất cả config cùng region
    table
      .integer("config_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("shipping_fee_configs")
      .onDelete("CASCADE");

    // Tên rule
    table.string("name", 255).notNullable();

    // Áp dụng cho loại ship nào
    // international | local | all
    table.string("shipping_type", 50).defaultTo("all");

    // Áp dụng cho region nào (null = tất cả)
    table.string("region", 50).nullable();

    /**
     * ── NGƯỠNG ──
     * Điều kiện để discount được áp dụng
     */

    // Ngưỡng giá trị đơn hàng tối thiểu
    table.decimal("min_order_amount", 12, 2).defaultTo(0);

    // Ngưỡng số lượng sản phẩm tối thiểu
    table.integer("min_item_count").defaultTo(0);

    // Ngưỡng cân nặng tối thiểu (gram)
    table.integer("min_weight_grams").defaultTo(0);

    /**
     * ── LOẠI DISCOUNT ──
     * percent: giảm % phí ship
     * fixed: giảm cố định
     * freeship: miễn phí hoàn toàn
     * bulky
     */
    table.string("discount_type", 50).notNullable();
    // percent | fixed | freeship

    // Giá trị discount
    // percent: 0-100
    // fixed: số tiền VND
    // freeship: bỏ qua
    table.decimal("discount_value", 12, 2).defaultTo(0);

    // Giảm tối đa (áp dụng cho percent)
    // VD: giảm 20% nhưng tối đa 30k
    table.decimal("max_discount_amount", 12, 2).nullable();

    /**
     * ── ƯU TIÊN ──
     * Nếu nhiều rule thỏa mãn, lấy rule có priority cao nhất
     * Số càng cao = ưu tiên càng cao
     */
    table.integer("priority").defaultTo(0);

    // Có stack với các discount khác không
    // false = chỉ lấy rule tốt nhất
    table.boolean("is_stackable").defaultTo(false);

    table.boolean("is_active").defaultTo(true);

    table.timestamp("start_at").nullable();
    table.timestamp("end_at").nullable();
    table.timestamps(true, true);

    table.index(["config_id"]);
    table.index(["shipping_type"]);
    table.index(["region"]);
    table.index(["discount_type"]);
    table.index(["min_order_amount"]);
    table.index(["is_active"]);
    table.index(["priority"]);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("shipping_fee_discounts");
};