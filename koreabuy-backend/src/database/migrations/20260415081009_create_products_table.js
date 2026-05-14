/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("products", (table) => {
    table.bigIncrements("id").primary();

    table.string("external_id", 100).notNullable().unique();
    table.string("source", 50).notNullable();

    table.string("slug", 255);

    table.text("name_kr");
    table.text("name_vi");

    table.text("description_kr");
    table.text("description_vi");

    table.decimal("price_min", 12, 2);
    table.decimal("price_max", 12, 2);
    table.decimal("original_price", 12, 2);

    table.string("currency", 10).defaultTo("KRW");

    table.integer("discount_percent");

    table.text("product_url");

    table.string("shop_name", 255);
    table.text("shop_url");

    table.integer("category_id").unsigned().nullable();

    table.text("meta_title");
    table.text("meta_description");

    table.boolean("is_active").defaultTo(true);
    table.boolean("is_deleted").defaultTo(false);

    table.jsonb("extra_data");

    table.boolean("is_featured").notNullable().defaultTo(false);
    table.smallint("featured_order").notNullable().defaultTo(0);

    table
      .timestamp("new_arrival_until", { useTz: true })
      .nullable()
      .defaultTo(null);

    table.decimal("source_rating_avg", 12, 2).defaultTo(null);
    table.integer("source_rating_count").defaultTo(0);

    table.timestamps(true, true);
  });

  await knex.schema.alterTable("products", (table) => {
    table.index("source");
    table.index("slug");
    table.index("category_id");

    // Shipping lookup
    table.index("estimated_weight_grams");
    table.index("chargeable_weight_grams");
  });

  await knex.raw(`
    CREATE INDEX idx_products_featured_active
      ON products (featured_order)
      WHERE is_featured = true;

    CREATE INDEX idx_products_new_arrival_active
      ON products (new_arrival_until)
      WHERE new_arrival_until IS NOT NULL;
  `);
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("products");
};
