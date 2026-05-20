/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("user_addresses", (table) => {
    table.increments("id").primary();

    table
      .integer("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");

    table.string("receiver_gender", 20).nullable();
    table.string("receiver_name", 255).notNullable();
    table.string("receiver_phone", 20).notNullable();
    table.string("province", 255).notNullable();
    table.string("province_code", 50).nullable();

    table.string("ward", 255).notNullable();
    table.string("ward_code", 50).nullable();
    table.text("detail").nullable(); // Số nhà, tên đường
    table.text("full_address").notNullable(); // Địa chỉ đầy đủ concat

    table.boolean("is_default").defaultTo(false);

    table.timestamps(true, true);

    table.index(["user_id"]);
    table.index(["user_id", "is_default"]);
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("user_addresses");
};
