// controllers/coupons.controller.js

const CouponService = require("../services/coupons.service");

class CouponsController {
  static async validate(req, res) {
    try {
      const result =
        await CouponService.validateCoupon(req.body);

      return res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message,
      });
    }
  }
}

module.exports = CouponsController;
