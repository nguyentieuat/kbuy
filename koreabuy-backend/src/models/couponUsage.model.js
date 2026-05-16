// models/couponUsage.model.js

const db = require("../config/db.config");

class CouponUsageModel {
  static async countByUser(couponId, userId) {
    const result = await db("coupon_usages")
      .where({
        coupon_id: couponId,
        user_id: userId,
      })
      .count("* as total")
      .first();

    return Number(result.total);
  }

  static async countByEmail(couponId, email) {
    const result = await db("coupon_usages")
      .where({
        coupon_id: couponId,
        email,
      })
      .count("* as total")
      .first();

    return Number(result.total);
  }

  static async countByPhone(couponId, phone) {
    const result = await db("coupon_usages")
      .where({
        coupon_id: couponId,
        phone,
      })
      .count("* as total")
      .first();

    return Number(result.total);
  }

  static async create(data, trx = db) {
    return trx("coupon_usages")
      .insert(data)
      .returning("*");
  }
}

module.exports = CouponUsageModel;
