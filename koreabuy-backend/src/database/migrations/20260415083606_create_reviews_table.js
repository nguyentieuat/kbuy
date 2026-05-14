exports.up = async function (knex) {
  await knex.schema.createTable("reviews", (table) => {
    table.increments("id").primary();

    table
      .integer("product_id")
      .references("id")
      .inTable("products")
      .onDelete("CASCADE");

    table
      .integer("user_id")
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");

    table.integer("rating"); // 1-5
    table.text("comment");

    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  // INDEX (tăng tốc query)
  await knex.schema.alterTable("reviews", (table) => {
    table.index("product_id");
    table.index("user_id");
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("reviews");
};
