exports.seed = async function (knex) {
  const exists = await knex("banners").first();

  if (exists) return;

  await knex("banners").insert([
    {
      title: "Mua hộ hàng Hàn Quốc",
      subtitle: "Nhanh chóng - Minh bạch - Tiết kiệm",
      description:
        "Đặt mua hàng từ Hàn Quốc và vận chuyển về Việt Nam với chi phí tối ưu.",
      image_url:
        "https://pub-f1547ef97ea64cedb90029453e9cb74c.r2.dev/images/banners/kbuy_banner_original.jpg",
      link: "/",
      type: "slide",
      position: "homepage",
      sort_order: 1,
      is_active: true,
    },
    {
      title: "Olive Young Korea",
      subtitle: "Mỹ phẩm chính hãng từ Hàn Quốc",
      description:
        "Đặt mua mỹ phẩm, thực phẩm chức năng và sản phẩm chăm sóc sức khỏe từ Olive Young.",
      image_url:
        "https://pub-f1547ef97ea64cedb90029453e9cb74c.r2.dev/images/banners/kbuy_banner_oliveyoung_original.jpg",
      link: "/shops/oliveyoung",
      type: "slide",
      position: "homepage",
      sort_order: 2,
      is_active: true,
    },
  ]);
};