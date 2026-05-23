// services/currency.service.js
const { getRate } = require("../models/exchangeRate.model");

let cachedRate = null;

async function getKrwToVndRate() {
  if (!cachedRate) {
    cachedRate = await getRate("KRW", "VND");
  }

  const rate = Number(cachedRate?.sell_rate);

  return Number.isFinite(rate) ? rate : 19;
}

function convertPrice(amount, rate = 19) {
  return Math.round(Number(amount) * Number(rate));
}

module.exports = {
  getKrwToVndRate,
  convertPrice,
};
