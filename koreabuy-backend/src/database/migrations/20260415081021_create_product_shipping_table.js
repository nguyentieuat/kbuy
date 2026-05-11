/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("product_shipping", (table) => {
    table.bigIncrements("id").primary();

    table.bigInteger("product_id").unsigned().notNullable();

    // ===== RAW (crawl) =====
    table.integer("raw_weight_grams").nullable();
    table.integer("raw_length_mm").nullable();
    table.integer("raw_width_mm").nullable();
    table.integer("raw_height_mm").nullable();
    table.text("raw_specs_text").nullable();

    // ===== NORMALIZED =====
    table.integer("weight_grams").nullable();
    table.integer("length_mm").nullable();
    table.integer("width_mm").nullable();
    table.integer("height_mm").nullable();
    table.boolean("is_bulky").defaultTo(false);

    // ===== COMPUTED =====
    table.integer("volumetric_weight_grams").nullable();
    table.integer("chargeable_weight_grams").nullable();

    // ===== META =====
    table.string("weight_source", 50).nullable(); 
    // ai | regex | manual | supplier

    table.decimal("weight_confidence", 3, 2).nullable(); 
    // 0.00 → 1.00

    table.boolean("is_weight_estimated").defaultTo(true);

    table.timestamps(true, true);

    // INDEX
    table.index("product_id");

    // 1 product = 1 shipping record
    table.unique("product_id");
  });

  await knex.schema.alterTable("product_shipping", (table) => {
    table
      .foreign("product_id")
      .references("id")
      .inTable("products")
      .onDelete("CASCADE");
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("product_shipping");
};