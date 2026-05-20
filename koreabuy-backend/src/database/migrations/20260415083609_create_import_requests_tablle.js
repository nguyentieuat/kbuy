/**
 * Import requests table
 *
 * Dùng để:
 * - queue request import sản phẩm
 * - tracking crawl/import
 * - retry lỗi import
 * - chống duplicate URL
 * - tracking user request
 *
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("import_requests", (table) => {
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

    // User tạo request
    // nullable để support guest
    table
      .bigInteger("user_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");

    // Product sau khi import thành công
    table
      .bigInteger("product_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("products")
      .onDelete("SET NULL");

    /**
     * =========================================================
     * USER SNAPSHOT
     * =========================================================
     * Snapshot contact tại thời điểm request
     */

    // Email người request
    table.string("email", 255).nullable();

    // Số điện thoại người request
    table.string("phone", 30).nullable();

    /**
     * =========================================================
     * SOURCE INFO
     * =========================================================
     */

    // Nguồn import
    // oliveyoung | coupang | amazon ...
    table.string("source", 50).notNullable();

    // URL sản phẩm cần import
    table.text("source_url").notNullable();

    // Hash URL để detect duplicate
    // SHA256 / MD5 ...
    table.string("source_url_hash", 64).notNullable();

    /**
     * =========================================================
     * REQUEST STATUS
     * =========================================================
     */

    // pending
    // processing
    // completed
    // failed
    table
      .enum("status", [
        "pending",
        "processing",
        "completed",
        "failed",
      ])
      .notNullable()
      .defaultTo("pending");

    /**
     * =========================================================
     * ERROR HANDLING
     * =========================================================
     */

    // Message lỗi khi import fail
    table.text("error_message").nullable();

    // Số lần retry
    table.integer("retry_count")
      .notNullable()
      .defaultTo(0);

    /**
     * =========================================================
     * REQUEST INFO
     * =========================================================
     */

    // Mã request để tracking
    table.string("request_code", 50)
      .nullable()
      .unique();

    // Ghi chú admin/system
    table.text("note").nullable();

    /**
     * =========================================================
     * PROCESSING INFO
     * =========================================================
     */

    // Worker/server xử lý request
    table.string("processor_name", 100)
      .nullable();

    /**
     * =========================================================
     * TIMESTAMPS
     * =========================================================
     */

    // Thời điểm tạo request
    table.timestamp("requested_at")
      .notNullable()
      .defaultTo(knex.fn.now());

    // Thời điểm bắt đầu xử lý
    table.timestamp("processing_at")
      .nullable();

    // Thời điểm hoàn thành
    table.timestamp("completed_at")
      .nullable();

    table.timestamp("created_at")
      .defaultTo(knex.fn.now());

    table.timestamp("updated_at")
      .defaultTo(knex.fn.now());

    /**
     * =========================================================
     * INDEXES
     * =========================================================
     */

    table.index(["status"]);

    table.index(["source"]);

    table.index(["source_url_hash"]);

    table.index(["product_id"]);

    table.index(["user_id"]);

    table.index(["request_code"]);

    table.index(["requested_at"]);
  });
};

/**
 * Rollback
 *
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("import_requests");
};