// routes/adminOrder.route.js

const express = require("express");
const router = express.Router();

const adminOrderController = require("../controllers/adminOrder.controller");
const shipmentController = require("../controllers/shipment.controller");

const authMiddleware = require("../middlewares/auth.middleware");
const adminMiddleware = require("../middlewares/admin.middleware");

// apply cho toàn bộ route admin
router.use(authMiddleware);
router.use(adminMiddleware);

router.get("/", adminOrderController.getOrders);

router.get("/:orderId", adminOrderController.getOrderDetail);

router.put("/:orderId/status", adminOrderController.updateStatus);

router.put("/:orderId/payment", adminOrderController.updatePayment);

router.post(
  "/:orderId/shipment",
  shipmentController.createInternationalShipment,
);

router.post(
  "/:orderId/dom-shipment",
  shipmentController.createDomesticShipment
);

module.exports = router;
