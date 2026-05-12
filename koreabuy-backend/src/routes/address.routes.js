// routes/address.routes.js

const express = require("express");
const router = express.Router();

const auth = require("../middlewares/auth.middleware");
const controller = require("../controllers/address.controller");

router.use(auth);

router.get("/", controller.getAddresses);
router.post("/", controller.createAddress);
router.put("/:id", controller.updateAddress);
router.delete("/:id", controller.deleteAddress);

router.put("/:id/default", controller.setDefault);

module.exports = router;
