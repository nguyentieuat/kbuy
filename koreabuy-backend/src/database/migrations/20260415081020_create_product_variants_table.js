/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("product_variants", (table) => {
    table.bigIncrements("id").primary();

    table
      .bigInteger("product_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("products")
      .onDelete("CASCADE");

    table.string("sku", 100).notNullable().unique();

    table.text("name_kr");
    table.text("name_vi");

    table.decimal("price", 12, 2);
    table.decimal("original_price", 12, 2);

    table.integer("discount_percent");

    table.boolean("is_soldout").defaultTo(false);

    table.text("image_url");

    table.jsonb("attributes");

    table.boolean("is_active").defaultTo(true);

    table.timestamps(true, true);
  });

  await knex.schema.alterTable("product_variants", (table) => {
    table.index("product_id");
    table.index("sku");

    table.index("estimated_weight_grams");
    table.index("chargeable_weight_grams");
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("product_variants");
};
