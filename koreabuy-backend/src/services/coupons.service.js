// services/coupons.service.js

const CouponModel = require("../models/coupon.model");
const CouponUsageModel = require("../models/couponUsage.model");
const { toCouponDTO } = require("../mappers/coupon.mapper");

class CouponService {
  static async validateCoupon({
    code,
    userId,
    email,
    phone,
    orderAmount,
    shippingFee,
    serviceFee, // 🔥 Thêm tham số này để tính giảm phí dịch vụ
  }) {
    const coupon = await CouponModel.findByCode(code);

    if (!coupon) throw new Error("Mã giảm giá không tồn tại");
    if (!coupon.is_active) throw new Error("Mã giảm giá đã bị khóa");

    const now = new Date();

    if (coupon.starts_at && new Date(coupon.starts_at) > now) {
      throw new Error("Mã chưa bắt đầu");
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < now) {
      throw new Error("Mã đã hết hạn");
    }

    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      throw new Error("Mã đã hết lượt");
    }

    if (orderAmount < Number(coupon.min_order_value || 0)) {
      throw new Error(`Đơn tối thiểu ${coupon.min_order_value}`);
    }

    if (userId && coupon.usage_limit_per_user) {
      const used = await CouponUsageModel.countByUser(coupon.id, userId);
      if (used >= coupon.usage_limit_per_user) {
        throw new Error("Bạn đã dùng mã này");
      }
    }

    if (email && coupon.usage_limit_per_email) {
      const used = await CouponUsageModel.countByEmail(coupon.id, email);
      if (used >= coupon.usage_limit_per_email) {
        throw new Error("Email đã dùng mã này");
      }
    }

    if (phone && coupon.usage_limit_per_phone) {
      const used = await CouponUsageModel.countByPhone(coupon.id, phone);
      if (used >= coupon.usage_limit_per_phone) {
        throw new Error("Số điện thoại đã dùng mã");
      }
    }

    let discount = 0;

    //Thay return bằng gán giá trị biến để chạy xuống được hàm mapping cuối cùng
    switch (coupon.discount_type) {
      case "percent": {
        discount = Math.round((orderAmount * coupon.discount_value) / 100); // Đã sửa subtotal -> orderAmount
        if (coupon.max_discount_value) {
          discount = Math.min(discount, coupon.max_discount_value);
        }
        break;
      }

      case "fixed":
        discount = coupon.discount_value;
        break;

      case "freeship":
        discount = shippingFee;
        break;

      case "service_fee":
        discount = Math.round((serviceFee * coupon.discount_value) / 100); // Đã có serviceFee truyền vào
        break;

      default:
        discount = 0;
    }

    // Trả ra đầy đủ thông tin dto + số tiền được giảm
    return {
      coupon: toCouponDTO(coupon),
      discount: Math.round(discount),
    };
  }

  static async markCouponUsed({
    couponId,
    userId,
    orderId,
    email,
    phone,
    discountAmount,
  }, trx) {
    await CouponUsageModel.create({
      coupon_id: couponId,
      user_id: userId ?? null,
      order_id: orderId,
      email,
      phone,
      discount_amount: discountAmount,
    }, trx);

    await CouponModel.incrementUsedCount(couponId, trx);
  }
}

module.exports = CouponService;