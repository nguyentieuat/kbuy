/**
 * Coupons table
 *
 * Dùng để quản lý:
 * - mã giảm giá
 * - freeship
 * - campaign marketing
 * - giới hạn sử dụng
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("coupons", (table) => {
    /**
     * =========================================================
     * PRIMARY KEY
     * =========================================================
     */

    table.bigIncrements("id").primary();

    /**
     * =========================================================
     * BASIC INFO
     * =========================================================
     */

    // Mã coupon
    // VD: NEWUSER50
    table.string("code", 50).notNullable().unique();

    // Tên campaign/coupon
    table.string("name", 255).notNullable();

    // Mô tả coupon
    table.text("description").nullable();

    /**
     * =========================================================
     * DISCOUNT CONFIG
     * =========================================================
     */

    // percent  => giảm theo %
    // fixed    => giảm số tiền cố định
    // freeship => miễn phí vận chuyển
    table
      .enum("discount_type", ["percent", "fixed", "freeship"])
      .notNullable();

    // Giá trị giảm
    //
    // percent  => 10 (%)
    // fixed    => 50000
    // freeship => 0
    table.decimal("discount_value", 12, 2)
      .notNullable()
      .defaultTo(0);

    // Giá trị đơn hàng tối thiểu để áp dụng
    table.decimal("min_order_value", 12, 2)
      .defaultTo(0);

    // Giảm tối đa
    // dùng cho coupon %
    //
    // VD:
    // giảm 10% tối đa 100k
    table.decimal("max_discount_value", 12, 2)
      .nullable();

    /**
     * =========================================================
     * USAGE LIMIT
     * =========================================================
     */

    // Tổng số lượt sử dụng tối đa
    // null = không giới hạn
    table.integer("usage_limit").nullable();

    // Số lượt đã sử dụng
    table.integer("used_count")
      .notNullable()
      .defaultTo(0);

    // Số lần dùng tối đa mỗi user
    table.integer("usage_limit_per_user")
      .nullable();

    // Số lần dùng tối đa mỗi email
    table.integer("usage_limit_per_email")
      .nullable();

    // Số lần dùng tối đa mỗi phone
    table.integer("usage_limit_per_phone")
      .nullable();

    /**
     * =========================================================
     * CONDITIONS
     * =========================================================
     */

    // Chỉ áp dụng cho đơn đầu tiên
    table.boolean("first_order_only")
      .notNullable()
      .defaultTo(false);

    // Coupon đang active hay không
    table.boolean("is_active")
      .notNullable()
      .defaultTo(true);

    /**
     * =========================================================
     * TIME RANGE
     * =========================================================
     */

    // Thời gian bắt đầu áp dụng
    table.timestamp("starts_at").nullable();

    // Thời gian hết hạn
    table.timestamp("expires_at").nullable();

    /**
     * =========================================================
     * TIMESTAMPS
     * =========================================================
     */

    table.timestamps(true, true);

    /**
     * =========================================================
     * INDEXES
     * =========================================================
     */

    table.index(["code"]);

    table.index(["is_active"]);

    table.index(["discount_type"]);

    table.index(["starts_at"]);

    table.index(["expires_at"]);
  });
};

/**
 * Rollback
 *
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("coupons");
};