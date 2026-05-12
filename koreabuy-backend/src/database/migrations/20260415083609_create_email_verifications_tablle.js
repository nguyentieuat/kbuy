exports.up = async function (knex) {
  await knex.schema.createTable("email_verifications", (table) => {
    table.increments("id").primary();

    table.string("email", 255).notNullable().unique();

    table.boolean("verified").defaultTo(false);

    table.timestamp("verified_at").nullable();

    table.string("verify_token", 255).nullable();

    table.integer("attempt_count").defaultTo(0);

    table.timestamp("last_attempt_at").nullable();

    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.timestamp("updated_at").defaultTo(knex.fn.now());

    table.index(["email"]);
    table.index(["verified"]);
  });
};