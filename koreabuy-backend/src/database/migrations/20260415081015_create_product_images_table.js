/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("product_images", (table) => {
    table.bigIncrements("id").primary();

    table
      .bigInteger("product_id")
      .unsigned()
      .notNullable()
      .references("id")
      .inTable("products")
      .onDelete("CASCADE");

    table.text("url").notNullable();

    table.string("hash", 64);

    table.boolean("is_primary").defaultTo(false);
    table.integer("sort_order").defaultTo(0);

    table.integer("width");
    table.integer("height");

    table.timestamps(true, true);
  });

  // INDEX (tăng tốc query)
  await knex.schema.alterTable("product_images", (table) => {
    table.index("product_id");
    table.index("hash");
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("product_images");
};