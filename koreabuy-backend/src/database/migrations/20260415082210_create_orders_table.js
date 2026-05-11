/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("orders", (table) => {
    table.increments("id").primary();
    table.string("order_code", 50).unique().notNullable();
    table
      .integer("user_id")
      .nullable() // nullable — cho phép guest order (chưa đăng nhập)
      .references("id")
      .inTable("users")
      .onDelete("SET NULL"); // SET NULL thay vì CASCADE — order vẫn tồn tại khi xóa user

    // ── Tiền ─────────────────────────────────────────
    table.decimal("total_price", 12, 2); // Tổng giá gốc
    table.decimal("service_fee", 12, 2).defaultTo(0);
    table.decimal("shipping_fee", 12, 2).defaultTo(0);
    table.decimal("discount_amount", 12, 2).defaultTo(0);
    table.decimal("final_price", 12, 2); // Thực trả

    // ── Coupon ───────────────────────────────────────
    table.string("coupon_code", 50).nullable(); // thêm — lưu mã đã dùng

    // ── Vận chuyển ───────────────────────────────────
    table.string("shipping_method", 20).nullable(); // "fast" | "standard"
    table.string("shipping_region", 20).nullable(); // "mien_bac" | "mien_trung" | "mien_nam"

    // ── Thanh toán ───────────────────────────────────
    table.string("payment_method", 50).nullable(); // "cod" | "vietqr" | "vnpay"

    // ── Trạng thái ───────────────────────────────────
    table.string("status", 50).defaultTo("pending");
    // pending → confirmed → processing → shipped → delivered → cancelled
    table.string("payment_status", 50).defaultTo("unpaid");
    // unpaid → paid → refunded

    // ── Thông tin nhận hàng ──────────────────────────
    table.string("receiver_name", 255);
    table.string("receiver_phone", 20);
    table.string("receiver_email", 255).nullable(); // thêm
    table.text("receiver_address");
    table.string("receiver_ward", 255).nullable(); // thêm — phường/xã
    table.string("receiver_province", 255).nullable(); // thêm — tỉnh/thành

    // ── Misc ─────────────────────────────────────────
    table.text("note").nullable();
    table.string("otp_verify_token", 500).nullable(); // thêm — lưu token OTP đã verify

    // ── Timestamps ───────────────────────────────────
    table.timestamp("confirmed_at").nullable(); // thêm — lúc xác nhận đơn
    table.timestamp("created_at").defaultTo(knex.fn.now());
    table.timestamp("updated_at").defaultTo(knex.fn.now());
  });

  await knex.schema.alterTable("orders", (table) => {
    table.index("user_id");
    table.index("status");
    table.index("payment_status"); // thêm index
    table.index("payment_method"); // thêm index
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("orders");
};
