// routes/cart.route.js

const express = require("express");

const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");

const controller = require("../controllers/cart.controller");

router.use(authMiddleware);

router.get("/", controller.getCart);

router.post("/items", controller.addItem);

router.put("/items/:id", controller.updateQuantity);

router.delete("/items/:id", controller.removeItem);

module.exports = router;
