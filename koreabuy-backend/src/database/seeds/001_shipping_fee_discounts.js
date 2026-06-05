exports.seed = async function (knex) {
  const exists = await knex("shipping_fee_discounts").first();

  if (exists) return;

  await knex("shipping_fee_discounts").insert([
    // ── LOCAL: Giảm theo ngưỡng đơn hàng ──
    {
      name: "Giảm 50% tối đa 25k ship nội địa cho đơn ≥ 3tr",
      shipping_type: "local",
      min_order_amount: 3000000,
      discount_type: "percent",
      discount_value: 50,
      max_discount_amount: 25000, // giảm tối đa 25k
      priority: 1,
    },
    {
      name: "Miễn phí ship nội địa cho đơn ≥ 5tr",
      shipping_type: "local",
      min_order_amount: 5000000,
      discount_type: "freeship",
      discount_value: 0,
      priority: 2, // ưu tiên cao hơn rule 20%
    },
    {
      name: "Giảm 10k ship nội địa cho đơn ≥ 1tr",
      shipping_type: "local",
      min_order_amount: 1000000,
      discount_type: "fixed",
      discount_value: 10000,
      priority: 0,
    },

    // ── INTERNATIONAL: Giảm theo cân ──
    {
      name: "Giảm 10% tối đa 50k ship quốc tế cho đơn ≥ 5tr",
      shipping_type: "international",
      min_order_amount: 5000000,
      discount_type: "percent",
      discount_value: 10,
      max_discount_amount: 50000,
      priority: 1,
    },

    {
      name: "Phụ phí hàng cồng kềnh quốc tế",
      shipping_type: "international",
      discount_type: "bulky",
      discount_value: 300000,
      is_active: true,
    },
    {
      name: "Phụ phí hàng cồng kềnh nội địa",
      shipping_type: "local",
      discount_type: "bulky",
      discount_value: 55000,
      is_active: true,
    },
    // Thêm vào seed shipping_fee_discounts
    {
      name: "Phụ phí đơn hàng dưới mức tối thiểu (T1/GenG)",
      shipping_type: "international",
      discount_type: "min_order_fee",
      discount_value:3000, // 70,000 KRW quy đổi sang VND khi tính
      min_order_amount: 70000, // áp dụng khi đơn < threshold
      max_order_amount: null, // set trong code
      priority: 10,
      is_active: true,
      extra_data: JSON.stringify({
        sources: ["t1", "geng"],         // chỉ áp dụng cho t1, geng
        threshold_krw: 70000,            // ngưỡng tối thiểu tính bằng KRW
        fee_krw: 3000,                  // phí nếu không đạt ngưỡng (tính bằng KRW)
      }),
    },
  ]);
};
