// test/scripts/test-rate.js

require("dotenv").config();

const {
  updateKRWRate,
} = require("../../services/exchangeRate.service");

updateKRWRate();