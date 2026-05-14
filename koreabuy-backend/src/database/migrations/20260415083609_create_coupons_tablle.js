/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("coupons", (table) => {
    table.bigIncrements("id").primary();

    table.string("code", 50).notNullable().unique();

    table.string("name", 255).notNullable();

    table.text("description").nullable();

    table.enu("discount_type", ["percent", "fixed", "freeship"]).notNullable();

    table.decimal("discount_value", 12, 2).notNullable().defaultTo(0);

    table.decimal("min_order_value", 12, 2).defaultTo(0);

    table.decimal("max_discount_value", 12, 2);

    table.integer("usage_limit").nullable();

    table.integer("used_count").notNullable().defaultTo(0);

    table.boolean("is_active").notNullable().defaultTo(true);

    table.integer("usage_limit_per_user").nullable();

    table.integer("usage_limit_per_email").nullable();

    table.integer("usage_limit_per_phone").nullable();

    table.boolean("first_order_only").notNullable().defaultTo(false);

    table.timestamp("starts_at").nullable();

    table.timestamp("expires_at").nullable();

    table.timestamps(true, true);
  });

  await knex.schema.raw(`
    CREATE INDEX idx_coupons_code
    ON coupons(code);
  `);

  await knex.schema.raw(`
    CREATE INDEX idx_coupons_active
    ON coupons(is_active);
  `);
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("coupons");
};
