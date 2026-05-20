// services/exchangeRate.service.js

const axios = require("axios");

const exchangeRateModel = require("../models/exchangeRate.model");

async function updateKRWRate() {
  try {
    const apiKey = process.env.EXCHANGE_RATE_API_KEY;

    const response = await axios.get(
      "https://api.exchangerate.host/convert",
      {
        params: {
          access_key: apiKey,
          from: "KRW",
          to: "VND",
          amount: 1,
        },
      }
    );

    const providerRate = Number(response.data.result);

    if (!providerRate) {
      throw new Error("Không lấy được provider rate");
    }

    // +8%
    const sellRate = Number(
      (providerRate * 1.08).toFixed(2)
    );

    // check existing
    const existingRate =
      await exchangeRateModel.getRate(
        "KRW",
        "VND"
      );

    if (existingRate) {
      // update existing
      await exchangeRateModel.updateRate(
        "KRW",
        "VND",
        {
          provider_rate: providerRate,
          sell_rate: sellRate,

          source: "exchange_rate_host",
        }
      );
    } else {
      // create first time
      await exchangeRateModel.createRate({
        base_currency: "KRW",
        target_currency: "VND",

        provider_rate: providerRate,
        sell_rate: sellRate,

        source: "exchange_rate_host",
      });
    }

    console.log("Exchange rate updated");

    console.log({
      providerRate,
      sellRate,
    });

    return {
      providerRate,
      sellRate,
    };
  } catch (error) {
    console.error("Update exchange rate failed");

    throw error;
  }
}

module.exports = {
  updateKRWRate,
};