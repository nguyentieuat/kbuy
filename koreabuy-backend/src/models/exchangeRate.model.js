// models/exchangeRate.model.js

const knex = require("../config/db.config");

const TABLE_NAME = "exchange_rates";

/**
 * Lấy rate hiện tại
 */
async function getRate(baseCurrency, targetCurrency) {
  return knex(TABLE_NAME)
    .where({
      base_currency: baseCurrency,
      target_currency: targetCurrency,
    })
    .first();
}

/**
 * Update rate hiện tại
 */
async function updateRate(
  baseCurrency,
  targetCurrency,
  data
) {
  return knex(TABLE_NAME)
    .where({
      base_currency: baseCurrency,
      target_currency: targetCurrency,
    })
    .update({
      provider_rate: data.provider_rate,
      sell_rate: data.sell_rate,

      source: data.source,

      updated_at: knex.fn.now(),
    });
}

/**
 * Create rate nếu chưa tồn tại
 */
async function createRate(data) {
  return knex(TABLE_NAME).insert({
    base_currency: data.base_currency,
    target_currency: data.target_currency,

    provider_rate: data.provider_rate,
    sell_rate: data.sell_rate,

    source: data.source,

    created_at: knex.fn.now(),
    updated_at: knex.fn.now(),
  });
}

module.exports = {
  getRate,
  updateRate,
  createRate,
};
