// services/currency.service.js
const { getRate } = require("../models/exchangeRate.model");

let cachedRate = null;

async function getKrwToVndRate() {
  if (!cachedRate) {
    cachedRate = await getRate("KRW", "VND");
  }
  return Number(cachedRate?.sell_rate) ?? 19;
}

function convertPrice(amount, rate = 19) {
  return Math.round(Number(amount) * Number(rate));
}

module.exports = {
  getKrwToVndRate,
  convertPrice,
};
