/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("orders", (table) => {
    table.increments("id").primary();

    /**
     * =========================================================
     * BASIC INFO
     * =========================================================
     */

    // Mã đơn hàng
    table.string("order_code", 50).unique().notNullable();

    // User đặt hàng
    // nullable để hỗ trợ guest order
    table
      .integer("user_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");

    /**
     * =========================================================
     * MONEY / PRICING
     * =========================================================
     */

    // Tổng tiền hàng gốc
    table.decimal("total_price", 12, 2).notNullable().defaultTo(0);

    // Phí dịch vụ mua hộ
    table.decimal("service_fee", 12, 2).defaultTo(0);
    /**
     * =========================================================
     * WEIGHT
     * =========================================================
     */

    // Cân nặng thực tế
    table.decimal("actual_weight_grams", 10, 3).nullable();

    // Cân nặng tính phí
    table.decimal("chargeable_weight_grams", 10, 3).nullable();

    // Cân chênh lệch = billed - actual
    // Đây là "dư địa" có thể ghép đơn khác
    table.integer("weight_surplus_grams").defaultTo(0);

    // ── PHÍ SHIP CHI TIẾT ────────────────────────────
    table.decimal("shipping_fee", 12, 2).defaultTo(0);
    
    // Phí quốc tế khách trả (tính theo chargeable_weight_grams)
    table.decimal("international_shipping_fee", 12, 2).defaultTo(0);

    // Phí quốc tế thực tế (tính theo actual_weight)
    // Dùng để tính lợi nhuận thực
    table.decimal("actual_international_shipping_fee", 12, 2).defaultTo(0);

    // Chênh lệch phí quốc tế = billed - actual
    // = lợi nhuận từ làm tròn kg / ghép đơn
    table.decimal("shipping_fee_surplus", 12, 2).defaultTo(0);

    // Phí nội địa VN
    table.decimal("local_shipping_fee", 12, 2).defaultTo(0);

    // Phí nội địa thực tế (nếu dùng carrier ngoài)
    table.decimal("actual_local_shipping_fee", 12, 2).nullable();

    table.boolean("has_bulky").defaultTo(false);
    table.decimal("international_bulky_fee", 12, 2).defaultTo(0);
    table.decimal("local_bulky_fee", 12, 2).defaultTo(0);

    // Giảm giá
    table.decimal("discount_amount", 12, 2).defaultTo(0);
    table.decimal("product_discount", 12, 2).defaultTo(0);
    table.decimal("shipping_discount", 12, 2).defaultTo(0);

    // Tổng tiền khách cần thanh toán
    table.decimal("final_price", 12, 2).notNullable().defaultTo(0);

    // Tỉ giá nhập thực tế
    table.decimal("provider_rate_snapshot", 18, 6).nullable();

    // Tỉ giá bán cho khách
    table.decimal("sell_rate_snapshot", 18, 6).nullable();

    // Metadata tỷ giá để audit/log
    table.json("exchange_rate_meta").nullable();

    // Đơn vị tiền tệ
    table.string("currency", 10).defaultTo("VND");

    /**
     * =========================================================
     * COUPON
     * =========================================================
     */

    table
      .bigInteger("coupon_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("coupons")
      .onDelete("SET NULL");

    // Snapshot mã coupon đã dùng
    table.string("coupon_code", 50).nullable();

    /**
     * =========================================================
     * SHIPPING
     * =========================================================
     */

    // Hình thức giao hàng
    // fast | standard
    table.string("shipping_method", 20).nullable();

    // Khu vực giao hàng
    // mien_bac | mien_trung | mien_nam
    table.string("shipping_region", 20).nullable();

    // Mã vận đơn nội địa VN
    table.string("local_tracking_code", 100).nullable();

    // Đơn vị giao hàng VN
    // GHN | GHTK | J&T ...
    table.string("local_carrier", 100).nullable();

    // Shipment quốc tế hiện tại
    // cache để query nhanh
    table
      .integer("current_shipment_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("international_shipments")
      .onDelete("SET NULL");

    /**
     * =========================================================
     * PAYMENT
     * =========================================================
     */

    // cod | vietqr | vnpay
    table.string("payment_method", 50).nullable();

    // unpaid | paid | refunded
    table.string("payment_status", 50).defaultTo("unpaid");

    /**
     * =========================================================
     * ORDER STATUS
     * =========================================================
     */

    // pending
    // confirmed
    // processing
    // shipped
    // delivered
    // cancelled
    table.string("status", 50).defaultTo("pending");

    /**
     * =========================================================
     * PROCUREMENT STATUS
     * =========================================================
     * Trạng thái mua hàng tại Hàn
     */

    // pending
    // ordered
    // partial_ordered
    // received_korea
    // out_of_stock
    // cancelled
    table.string("procurement_status", 50).defaultTo("pending");

    /**
     * =========================================================
     * AFTERSALE STATUS
     * =========================================================
     */

    // none
    // refund_pending
    // refund_partial
    // refund_completed
    // dispute
    table.string("aftersale_status", 50).defaultTo("none");

    /**
     * =========================================================
     * RECEIVER INFO
     * =========================================================
     */

    table.string("receiver_gender", 20).nullable();

    // Người nhận
    table.string("receiver_name", 255).notNullable();

    // Số điện thoại nhận hàng
    table.string("receiver_phone", 20).notNullable();

    // Email nhận hàng
    table.string("receiver_email", 255).nullable();

    // Địa chỉ chi tiết
    table.text("receiver_address").notNullable();

    // Phường / xã
    table.string("receiver_ward", 255).nullable();

    table.string("receiver_ward_code", 50).nullable();

    // Tỉnh / thành phố
    table.string("receiver_province", 255).nullable();

    table.string("receiver_province_code", 50).nullable();

    /**
     * =========================================================
     * ORDER SOURCE
     * =========================================================
     */

    // web | app | facebook | zalo | admin
    table.string("order_source", 50).defaultTo("web");

    /**
     * =========================================================
     * NOTES
     * =========================================================
     */

    // Ghi chú của khách
    table.text("note").nullable();

    // Token OTP verify
    table.string("otp_verify_token", 500).nullable();

    // Lý do huỷ đơn
    table.string("cancel_reason", 255).nullable();

    // Ghi chú huỷ đơn
    table.text("cancel_note").nullable();

    /**
     * =========================================================
     * TIMESTAMPS
     * =========================================================
     */

    // Thời điểm xác nhận đơn
    table.timestamp("confirmed_at").nullable();

    // Thời điểm thanh toán thành công
    table.timestamp("paid_at").nullable();

    // Thời điểm bắt đầu xử lý đơn
    table.timestamp("processing_at").nullable();

    // Thời điểm giao cho đơn vị vận chuyển
    table.timestamp("shipped_at").nullable();

    // Thời điểm giao thành công
    table.timestamp("delivered_at").nullable();

    // Thời điểm huỷ đơn
    table.timestamp("cancelled_at").nullable();

    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.timestamp("updated_at").defaultTo(knex.fn.now());

    /**
     * =========================================================
     * INDEXES
     * =========================================================
     */

    table.index(["user_id"]);

    table.index(["status"]);

    table.index(["payment_status"]);

    table.index(["payment_method"]);

    table.index(["procurement_status"]);

    table.index(["aftersale_status"]);

    table.index(["current_shipment_id"]);

    table.index(["local_tracking_code"]);

    table.index(["order_source"]);

    table.index(["created_at"]);
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("orders");
};
