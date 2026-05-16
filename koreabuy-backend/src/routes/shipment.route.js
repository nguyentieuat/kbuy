// routes/shipment.route.js

const express = require("express");
const router = express.Router();

const shipmentController = require("../controllers/shipment.controller");

const authMiddleware = require("../middlewares/auth.middleware");
const adminMiddleware = require("../middlewares/admin.middleware");

// apply cho toàn bộ route admin
router.use(authMiddleware);
router.use(adminMiddleware);

router.post(
  "/international",
  authMiddleware,
  shipmentController.createInternationalShipments,
);

router.put(
  "/international/:shipmentId/status",
  authMiddleware,
  shipmentController.updateInternationalShipmentStatus,
);

module.exports = router;
