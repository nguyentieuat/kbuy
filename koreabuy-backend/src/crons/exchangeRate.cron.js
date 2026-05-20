// crons/exchangeRate.cron.js

const cron = require("node-cron");

const {
  updateKRWRate,
} = require("../services/exchangeRate.service");

cron.schedule("0 8 * * *", async () => {
  console.log("⏰ Running exchange rate cron");

  await updateKRWRate();
});
