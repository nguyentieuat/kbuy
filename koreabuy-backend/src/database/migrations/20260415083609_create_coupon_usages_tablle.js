/**
 * @param {import('knex').Knex} knex
 */
await knex.schema.createTable("coupon_usages", (table) => {
  table.bigIncrements("id").primary();

  table
    .bigInteger("coupon_id")
    .unsigned()
    .notNullable()
    .references("id")
    .inTable("coupons")
    .onDelete("CASCADE");

  table
    .bigInteger("user_id")
    .unsigned()
    .nullable()
    .references("id")
    .inTable("users")
    .onDelete("SET NULL");

  table
    .bigInteger("order_id")
    .unsigned()
    .nullable()
    .references("id")
    .inTable("orders")
    .onDelete("SET NULL");

  table.string("email", 255).nullable();
  table.string("phone", 30).nullable();

  table.decimal("discount_amount", 12, 2).notNullable().defaultTo(0);

  table.timestamp("used_at").notNullable().defaultTo(knex.fn.now());
});

// indexes
await knex.schema.raw(`
    CREATE INDEX idx_coupon_usages_coupon_id
    ON coupon_usages(coupon_id);
  `);

await knex.schema.raw(`
  CREATE INDEX idx_coupon_usages_phone
  ON coupon_usages(phone);
`);

await knex.schema.raw(`
    CREATE INDEX idx_coupon_usages_user_id
    ON coupon_usages(user_id);
  `);

await knex.schema.raw(`
    CREATE INDEX idx_coupon_usages_order_id
    ON coupon_usages(order_id);
  `);

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("coupon_usages");
};
