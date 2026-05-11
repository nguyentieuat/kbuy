// routes/banners.route.js
const express = require("express");
const router = express.Router();
const categoriesController = require("../controllers/categories.controller");

router.get("/tree", categoriesController.getCategoryTree);
router.get("/treecount", categoriesController.getCategoryTreeWithCount);

module.exports = router;
