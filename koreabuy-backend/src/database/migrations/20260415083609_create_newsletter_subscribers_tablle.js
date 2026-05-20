/**
 * Newsletter subscribers table
 *
 * Dùng để:
 * - lưu email đăng ký nhận tin
 * - email marketing
 * - campaign automation
 * - tracking unsubscribe
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("newsletter_subscribers", (table) => {
    /**
     * =========================================================
     * PRIMARY KEY
     * =========================================================
     */

    table.bigIncrements("id").primary();

    /**
     * =========================================================
     * SUBSCRIBER INFO
     * =========================================================
     */

    // Email subscriber
    table.string("email", 255)
      .notNullable()
      .unique();

    /**
     * =========================================================
     * SUBSCRIPTION STATUS
     * =========================================================
     */

    // active
    // unsubscribed
    table
      .enum("status", ["active", "unsubscribed"])
      .notNullable()
      .defaultTo("active");

    /**
     * =========================================================
     * SOURCE
     * =========================================================
     */

    // Nguồn đăng ký
    // homepage
    // popup
    // checkout
    // campaign_xxx
    table.string("source", 100)
      .nullable();

    /**
     * =========================================================
     * TRACKING INFO
     * =========================================================
     */

    // IP đăng ký
    table.string("subscribed_ip", 100)
      .nullable();

    // User agent trình duyệt
    table.text("user_agent")
      .nullable();

    /**
     * =========================================================
     * TIMESTAMPS
     * =========================================================
     */

    // Thời điểm đăng ký
    table.timestamp("subscribed_at")
      .notNullable()
      .defaultTo(knex.fn.now());

    // Thời điểm unsubscribe
    table.timestamp("unsubscribed_at")
      .nullable();

    table.timestamps(true, true);

    /**
     * =========================================================
     * INDEXES
     * =========================================================
     */

    table.index(["email"]);

    table.index(["status"]);

    table.index(["source"]);

    table.index(["subscribed_at"]);
  });
};

/**
 * Rollback
 *
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("newsletter_subscribers");
};