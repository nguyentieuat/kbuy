/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();

    table.string('username', 100).unique().notNullable();
    table.string('email', 150).unique().notNullable();
    table.text('password').notNullable();

    table.string('first_name', 100);
    table.string('last_name', 100);

    table.string('phone', 20);
    table.text('address');
    table.text('avatar_url');

    table.string('role', 20).defaultTo('user');

    table.boolean('is_active').defaultTo(true);
    table.boolean('email_verified').defaultTo(false);

    table.string('provider', 50).defaultTo('local');

    table.timestamp('last_login_at');

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // INDEX (tăng tốc query)
  await knex.schema.alterTable('users', (table) => {
    table.index('email');
    table.index('username');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('users');
};
