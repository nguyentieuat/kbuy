// routes/order.route.js

const express = require("express");
const router = express.Router();
const { createOrder, getOrder } = require("../controllers/order.controller");

router.post("/",   createOrder);
router.get("/:id", getOrder);

module.exports = router;
