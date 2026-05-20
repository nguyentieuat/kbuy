/**
 * Phone verifications table
 *
 * Dùng để:
 * - xác minh số điện thoại
 * - chống spam/fraud
 * - block COD risk
 * - tracking verify history
 * - rate limit OTP
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("phone_verifications", (table) => {
    /**
     * =========================================================
     * PRIMARY KEY
     * =========================================================
     */

    table.increments("id").primary();

    /**
     * =========================================================
     * PHONE INFO
     * =========================================================
     */

    // Số điện thoại cần verify
    table.string("phone", 20)
      .notNullable()
      .unique();

    /**
     * =========================================================
     * VERIFY STATUS
     * =========================================================
     */

    // Đã verify hay chưa
    table.boolean("verified")
      .notNullable()
      .defaultTo(false);

    // Thời điểm verify thành công
    table.timestamp("verified_at")
      .nullable();

    /**
     * =========================================================
     * VERIFY PROVIDER INFO
     * =========================================================
     */

    // UID/token verify cuối cùng
    // VD Firebase verification UID
    table.string("last_verified_uid", 128)
      .nullable();

    // Phương thức verify
    // firebase | otp | sms
    table.string("verify_method", 20)
      .notNullable()
      .defaultTo("firebase");

    /**
     * =========================================================
     * RATE LIMIT / SECURITY
     * =========================================================
     */

    // Số lần gửi OTP/verify
    table.integer("attempt_count")
      .notNullable()
      .defaultTo(0);

    // Thời điểm gửi OTP gần nhất
    table.timestamp("last_attempt_at")
      .nullable();

    // IP verify gần nhất
    table.string("last_attempt_ip", 100)
      .nullable();

    /**
     * =========================================================
     * FRAUD / RISK CONTROL
     * =========================================================
     */

    // Risk score
    // 0 = bình thường
    // càng cao càng nguy hiểm
    table.integer("risk_level")
      .notNullable()
      .defaultTo(0);

    // Block COD nếu risk cao
    table.boolean("cod_blocked")
      .notNullable()
      .defaultTo(false);

    /**
     * =========================================================
     * TIMESTAMPS
     * =========================================================
     */

    table.timestamp("created_at")
      .notNullable()
      .defaultTo(knex.fn.now());

    table.timestamp("updated_at")
      .notNullable()
      .defaultTo(knex.fn.now());

    /**
     * =========================================================
     * INDEXES
     * =========================================================
     */

    table.index(["phone"]);

    table.index(["verified"]);

    table.index(["risk_level"]);

    table.index(["cod_blocked"]);
  });
};

/**
 * Rollback
 *
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("phone_verifications");
};