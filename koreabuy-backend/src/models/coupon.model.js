// models/coupon.model.js

const db = require("../config/db.config");

class CouponModel {
  static async findByCode(code) {
    return db("coupons")
      .whereRaw("LOWER(code) = LOWER(?)", [code])
      .first();
  }

  static async incrementUsedCount(id) {
    return db("coupons")
      .where({ id })
      .increment("used_count", 1);
  }
}

module.exports = CouponModel;
