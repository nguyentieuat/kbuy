/**
 * @param {import('knex').Knex} knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable('banners', (table) => {
    table.increments('id').primary();

    table.string('title', 255);
    table.string('subtitle', 255);
    table.text('description');  
    table.text('image_url').notNullable();

    table.text('link');

    table.string('type', 50);
    table.string('position', 50);

    table.integer('sort_order').defaultTo(0);

    table.boolean('is_active').defaultTo(true);

    table.timestamp('start_date');
    table.timestamp('end_date');

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // INDEX (tăng tốc query)
  await knex.schema.alterTable('banners', (table) => {
    table.index('type');
    table.index('position');
    table.index('is_active');
  });
};

/**
 * @param {import('knex').Knex} knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('banners');
};