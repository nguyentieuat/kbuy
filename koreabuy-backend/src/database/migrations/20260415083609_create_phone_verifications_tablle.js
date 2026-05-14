exports.up = async function (knex) {
  await knex.schema.createTable("phone_verifications", (table) => {
    table.increments("id").primary();

    table.string("phone", 20).notNullable().unique();

    table.boolean("verified").notNullable().defaultTo(false);

    table.timestamp("verified_at").nullable();

    table.string("last_verified_uid", 128).nullable();

    table.string("verify_method", 20).notNullable().defaultTo("firebase");

    table.integer("attempt_count").notNullable().defaultTo(0);

    table.timestamp("last_attempt_at").nullable();

    table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

    table.integer("risk_level").notNullable().defaultTo(0);

    table.boolean("cod_blocked").notNullable().defaultTo(false);

    table.timestamp("updated_at").notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.alterTable("phone_verifications", (table) => {
    table.index(["phone"], "idx_phone_verifications_phone");
    table.index(["verified"], "idx_phone_verifications_verified");
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("phone_verifications");
};
