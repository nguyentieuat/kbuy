// routes/banners.route.js
const express = require("express");
const router = express.Router();
const bannersController = require("../controllers/banners.controller");

router.get("/", bannersController.getBanners);

module.exports = router;
