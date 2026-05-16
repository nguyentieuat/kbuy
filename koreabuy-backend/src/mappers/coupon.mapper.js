// mappers/coupon.mapper.js

function toCouponDTO(coupon) {
  return {
    id: coupon.id,
    code: coupon.code,
    discountType: coupon.discount_type,
    discountValue: Number(coupon.discount_value),

    minOrderValue: Number(coupon.min_order_value || 0),
    maxDiscountValue: coupon.max_discount_value
      ? Number(coupon.max_discount_value)
      : null,

    startsAt: coupon.starts_at,
    expiresAt: coupon.expires_at,
  };
}

module.exports = {
  toCouponDTO,
};
