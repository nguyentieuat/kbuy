exports.up = async function (knex) {
  await knex.schema.createTable('carts', (table) => {
    table.increments('id').primary();

    table
      .integer('user_id')
      .unique()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('carts');
};