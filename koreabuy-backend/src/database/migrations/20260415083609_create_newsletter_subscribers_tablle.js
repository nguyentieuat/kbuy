/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("newsletter_subscribers", (table) => {
    table.bigIncrements("id").primary();

    table.string("email", 255).notNullable().unique();

    table
      .enu("status", ["active", "unsubscribed"])
      .notNullable()
      .defaultTo("active");

    table.string("source", 100).nullable();

    table.timestamp("subscribed_at").notNullable().defaultTo(knex.fn.now());

    table.timestamp("unsubscribed_at").nullable();

    table.timestamps(true, true);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("newsletter_subscribers");
};
