exports.up = async function (knex) {
  await knex.schema.createTable("cart_items", (table) => {
    table.increments("id").primary();

    table
      .integer("cart_id")
      .references("id")
      .inTable("carts")
      .onDelete("CASCADE");

    table
      .integer("product_id")
      .references("id")
      .inTable("products")
      .onDelete("CASCADE");

    table
      .integer("variant_id")
      .references("id")
      .inTable("product_variants")
      .onDelete("SET NULL");

    table.integer("quantity").defaultTo(1);

    table.timestamp("created_at").defaultTo(knex.fn.now());
  });

  // INDEX (tăng tốc query)
  await knex.schema.alterTable("cart_items", (table) => {
    table.index("cart_id");
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("cart_items");
};
