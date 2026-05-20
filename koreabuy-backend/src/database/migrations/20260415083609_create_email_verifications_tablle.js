/**
 * Email verifications table
 *
 * Dùng để:
 * - xác minh email user/guest
 * - chống spam verify
 * - rate limit resend mail
 * - tracking verify status
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("email_verifications", (table) => {
    /**
     * =========================================================
     * PRIMARY KEY
     * =========================================================
     */

    table.increments("id").primary();

    /**
     * =========================================================
     * EMAIL INFO
     * =========================================================
     */

    // Email cần xác minh
    table.string("email", 255)
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
     * VERIFY TOKEN
     * =========================================================
     */

    // Token xác minh email
    table.string("verify_token", 255)
      .nullable();

    // Thời gian token hết hạn
    table.timestamp("token_expires_at")
      .nullable();

    /**
     * =========================================================
     * RATE LIMIT / SECURITY
     * =========================================================
     */

    // Số lần gửi verify mail
    table.integer("attempt_count")
      .notNullable()
      .defaultTo(0);

    // Lần gửi gần nhất
    table.timestamp("last_attempt_at")
      .nullable();

    // IP gửi verify gần nhất
    table.string("last_attempt_ip", 100)
      .nullable();

    /**
     * =========================================================
     * TIMESTAMPS
     * =========================================================
     */

    table.timestamp("created_at")
      .defaultTo(knex.fn.now());

    table.timestamp("updated_at")
      .defaultTo(knex.fn.now());

    /**
     * =========================================================
     * INDEXES
     * =========================================================
     */

    table.index(["email"]);

    table.index(["verified"]);

    table.index(["verify_token"]);

    table.index(["token_expires_at"]);
  });
};

/**
 * Rollback
 *
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("email_verifications");
};