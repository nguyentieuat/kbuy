/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("import_requests", (table) => {
    table.bigIncrements("id").primary();

    table
      .bigInteger("user_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");

    table
      .bigInteger("product_id")
      .unsigned()
      .nullable()
      .references("id")
      .inTable("products")
      .onDelete("SET NULL");

    table.string("email", 255).nullable();

    table.string("phone", 30).nullable();

    table.string("source", 50).notNullable();

    table.text("source_url").notNullable();

    table.string("source_url_hash", 64).notNullable();

    table
      .enu("status", ["pending", "processing", "completed", "failed"])
      .notNullable()
      .defaultTo("pending");

    table.text("error_message").nullable();

    table.timestamp("requested_at").notNullable().defaultTo(knex.fn.now());

    table.timestamp("completed_at").nullable();

    table.string("request_code", 50).nullable().unique();
    table.text("note").nullable();
  });

  // indexes
  await knex.schema.raw(`
    CREATE INDEX idx_import_requests_status
    ON import_requests(status);
  `);

  await knex.schema.raw(`
    CREATE INDEX idx_import_requests_source
    ON import_requests(source);
  `);

  await knex.schema.raw(`
    CREATE INDEX idx_import_requests_hash
    ON import_requests(source_url_hash);
  `);

  await knex.schema.raw(`
    CREATE INDEX idx_import_requests_product_id
    ON import_requests(product_id);
  `);
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("import_requests");
};
