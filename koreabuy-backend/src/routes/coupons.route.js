// routes/coupons.route.js

const router = require("express").Router();

const CouponsController = require(
  "../controllers/coupons.controller"
);

router.post(
  "/validate",
  CouponsController.validate,
);

module.exports = router;
