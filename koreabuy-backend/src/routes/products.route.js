// routes/products.route.js

const express    = require("express");
const router     = express.Router();
const controller = require("../controllers/products.controller");


router.get("/", controller.getProducts);

// GET /api/products/recommended
router.get("/recommended", controller.getRecommendedProducts);

// GET /api/products/:slug
router.get("/:slug", controller.getProductBySlug);

module.exports = router;