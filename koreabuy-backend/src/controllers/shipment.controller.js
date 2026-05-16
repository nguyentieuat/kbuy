// controllers/shipment.controller.js

const ShipmentService = require("../services/shipment.service");

const ShipmentController = {
  async createInternationalShipment(req, res) {
    try {
      const orderId = req.params.orderId;
      const data = req.body;
      const user = req.user || null;

      const result = await ShipmentService.createInternationalShipment(
        orderId,
        data,
        user,
      );

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error(error);

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  },

  async createInternationalShipments(req, res) {
    try {
      const data = await ShipmentService.createInternationalShipments(req.body);

      res.json({
        success: true,
        data,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: err.message,
      });
    }
  },

  async updateInternationalShipmentStatus(req, res) {
    try {
      const shipmentId = req.params.shipmentId;
      const { status } = req.body;

      const updated = await ShipmentService.updateInternationalShipmentStatus(
        shipmentId,
        status,
      );

      return res.json({
        success: true,
        data: updated,
      });
    } catch (err) {
      console.error(err);

      if (err.code === "NOT_FOUND") {
        return res.status(404).json({ message: err.message });
      }

      if (err.code === "INVALID_STATUS") {
        return res.status(400).json({ message: err.message });
      }

      return res.status(500).json({ message: "Server error" });
    }
  },

  async createDomesticShipment(req, res) {
  try {
    const orderId = req.params.orderId;
    
    const result = await ShipmentService.createDomesticShipment({
      orderId,
      ...req.body,
      user: req.user,
    });

    return res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error(err);
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
},

};

module.exports = ShipmentController;
