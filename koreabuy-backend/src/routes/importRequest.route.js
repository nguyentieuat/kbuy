// routes/importRequest.route.js

const express = require("express");
const router = express.Router();
const { createImportRequest } = require("../controllers/importRequest.controller");

router.post("/", createImportRequest);

module.exports = router;
