"use strict";

/**
 * Product Addons
 * - Group level addon (ví dụ: Player Kit LOL / VAL)
 */

exports.up = async function (knex) {
  await knex.schema.createTable("product_addons", (t) => {
    t.increments("id").primary();

    t.integer("product_id")
      .unsigned()
      .notNullable()
      .index();

    t.string("addon_id").notNullable().index(); // crawl addonId

    t.string("name").notNullable();

    t.integer("price").defaultTo(0);

    t.integer("position").defaultTo(0);

    t.timestamps(true, true);

    // FK (nếu bạn có products table)
    t.foreign("product_id")
      .references("id")
      .inTable("products")
      .onDelete("CASCADE");
  });

  /**
   * Addon options
   * - từng lựa chọn trong addon group
   */
  await knex.schema.createTable("product_addon_options", (t) => {
    t.increments("id").primary();

    t.integer("addon_id")
      .unsigned()
      .notNullable()
      .index();

    t.string("label").notNullable();

    t.string("value").notNullable();

    t.integer("price_delta").defaultTo(0); // nếu sau này có thêm option surcharge

    t.integer("sort_order").defaultTo(0);

    t.timestamps(true, true);

    t.foreign("addon_id")
      .references("id")
      .inTable("product_addons")
      .onDelete("CASCADE");
  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("product_addon_options");
  await knex.schema.dropTableIfExists("product_addons");
};