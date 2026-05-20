/**
 * Coupon usages table
 *
 * Dùng để tracking:
 * - ai đã dùng coupon
 * - đơn nào đã áp dụng coupon
 * - chống abuse coupon
 * - validate usage limit
 * - audit marketing campaign
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("coupon_usages", (table) => {
    /**
     * =========================================================
     * PRIMARY KEY
     * =========================================================
     */

    table.bigIncrements("id").primary();

    /**
     * =========================================================
     * RELATIONS
     * =========================================================
     */

    // Coupon đã sử dụng
    table
      .bigInteger("coupon_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("coupons")
      .onDelete("CASCADE");

    // User sử dụng coupon
    // nullable để support guest order
    table
      .bigInteger("user_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");

    // Order áp dụng coupon
    table
      .bigInteger("order_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("orders")
      .onDelete("SET NULL");

    /**
     * =========================================================
     * SNAPSHOT INFO
     * =========================================================
     * Snapshot để tracking kể cả khi user đổi info
     */

    // Email tại thời điểm dùng coupon
    table.string("email", 255).nullable();

    // Số điện thoại tại thời điểm dùng coupon
    table.string("phone", 30).nullable();

    /**
     * =========================================================
     * DISCOUNT INFO
     * =========================================================
     */

    // Số tiền thực tế đã được giảm
    table.decimal("discount_amount", 12, 2)
      .notNullable()
      .defaultTo(0);

    /**
     * =========================================================
     * TIMESTAMP
     * =========================================================
     */

    // Thời điểm sử dụng coupon
    table.timestamp("used_at")
      .notNullable()
      .defaultTo(knex.fn.now());

    table.timestamps(true, true);

    /**
     * =========================================================
     * INDEXES
     * =========================================================
     */

    table.index(["coupon_id"]);

    table.index(["user_id"]);

    table.index(["order_id"]);

    table.index(["phone"]);

    table.index(["email"]);

    table.index(["used_at"]);
  });
};

/**
 * Rollback
 *
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("coupon_usages");
};