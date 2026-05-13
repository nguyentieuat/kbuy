// routes/order.route.js

const express = require("express");
const router = express.Router();
const { createOrder, getOrder, getMyOrders } = require("../controllers/order.controller");
const authMiddleware = require("../middlewares/auth.middleware");

router.post("/",   createOrder);
router.get("/my", authMiddleware, getMyOrders);

router.get("/:orderCode", getOrder);

module.exports = router;
