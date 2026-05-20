// jobs/exchangeRate.job.js

const cron = require("node-cron");

const { updateKRWRate } = require("../services/exchangeRate.service");

cron.schedule(
  "0 12 * * *",
  async () => {
    console.log("Updating KRW rate...");

    try {
      await updateKRWRate();

      console.log("KRW updated");
    } catch (err) {
      console.error(err);
    }
  },
  {
    timezone: "Asia/Seoul",
  },
);
