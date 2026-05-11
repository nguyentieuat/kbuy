/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("payments", (table) => {
    table.increments("id").primary();

    table
      .integer("order_id")
      .unique()
      .references("id")
      .inTable("orders")
      .onDelete("CASCADE");

    table.string("order_code", 50).notNullable().index();

    table.decimal("amount", 12, 2).notNullable();
    table.string("method", 50).notNullable(); // "vietqr" | "cod" | "vnpay"
    table.string("status", 50).defaultTo("pending"); // "pending" | "paid" | "expired" | "failed"

    // ── VietQR specific ──────────────────────────────
    table.string("txn_ref", 100).unique().nullable(); // Mã tham chiếu tự tạo (KB123ABC)
    table.string("bank_id", 20).nullable(); // "970422" (MB Bank)
    table.string("bank_account_no", 50).nullable(); // Số tài khoản nhận
    table.string("transfer_content", 255).nullable(); // Nội dung chuyển khoản

    // ── Webhook / xác nhận ───────────────────────────
    table.string("transaction_code", 255).nullable(); // Mã GD từ ngân hàng (Casso/SePay trả về)
    table.decimal("paid_amount", 12, 2).nullable(); // Số tiền thực nhận (để verify)
    table.string("payer_account", 100).nullable(); // Tài khoản người chuyển
    table.text("webhook_data").nullable(); // Raw webhook payload (để debug)

    // ── Thời gian ────────────────────────────────────
    table.timestamp("expires_at").nullable(); // QR hết hạn lúc nào
    table.timestamp("paid_at").nullable(); // Thanh toán lúc nào
    table.timestamps(true, true); // created_at + updated_at

    // ── Indexes ──────────────────────────────────────
    table.index(["txn_ref"]);
    table.index(["status"]);
    table.index(["order_id"]);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("payments");
};
