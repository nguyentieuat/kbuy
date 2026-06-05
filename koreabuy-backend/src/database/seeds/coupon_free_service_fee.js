// seeds/coupon_free_service_fee.js
exports.seed = async function (knex) {
  const exists = await knex("coupons").where("code", "FREESVC2026").first();
  if (exists) return;

  await knex("coupons").insert([
    {
      code: "FREESVC2026",
      name: "Miễn phí dịch vụ",
      description: "Miễn toàn bộ phí dịch vụ cho đơn hàng",
      discount_type: "service_fee",
      discount_value: 100,       // 100% phí dịch vụ
      min_order_value: 0,
      max_discount_value: null,  // không giới hạn
      usage_limit: null,         // không giới hạn lượt
      usage_limit_per_user: 1,   // mỗi user dùng 1 lần
      first_order_only: false,
      is_active: true,
      starts_at: null,
      expires_at: null,
    },
    {
      code: "FREESVC1LACE",      // dùng 1 lần
      name: "Miễn phí dịch vụ (1 lần)",
      description: "Miễn toàn bộ phí dịch vụ, chỉ dùng 1 lần toàn hệ thống",
      discount_type: "service_fee",
      discount_value: 100,
      min_order_value: 0,
      max_discount_value: null,
      usage_limit: 1,            // toàn hệ thống chỉ dùng được 1 lần
      usage_limit_per_user: 1,
      first_order_only: false,
      is_active: true,
      starts_at: null,
      expires_at: null,
    },
  ]);
};