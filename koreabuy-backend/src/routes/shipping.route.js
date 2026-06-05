// routes/shipping.routes.js

const express = require("express");
const router = express.Router();

const shippingFeeController = require("../controllers/shippingFee.controller");

// POST /api/shipping/calculate
router.post("/calculate",shippingFeeController.calculateShipping);

router.get("/rates", shippingFeeController.getShippingRates);

module.exports = router;