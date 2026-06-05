exports.seed = async function (knex) {
  const exists = await knex("categories").first();

  if (exists) return;

  await knex("categories").insert([
    // ==========================================
    // ROOT - MỸ PHẨM (ID: 1)
    // ==========================================
    {
      id: 1,
      name: "Mỹ phẩm",
      slug: "my-pham",
      parent_id: null,
    },

    // Level 2 - Mỹ phẩm
    { id: 11, name: "Chăm sóc da", slug: "cham-soc-da", parent_id: 1 },
    { id: 12, name: "Trang điểm", slug: "trang-diem", parent_id: 1 },
    { id: 13, name: "Chăm sóc tóc", slug: "cham-soc-toc", parent_id: 1 },
    { id: 14, name: "Chăm sóc cơ thể", slug: "cham-soc-co-the", parent_id: 1 },
    { id: 15, name: "Nước hoa", slug: "nuoc-hoa", parent_id: 1 },
    { id: 16, name: "Mỹ phẩm da liễu", slug: "my-pham-da-lieu", parent_id: 1 },
    { id: 17, name: "Thiết bị làm đẹp", slug: "thiet-bi-lam-dep", parent_id: 1 },
    { id: 18, name: "Phụ kiện làm đẹp", slug: "phu-kien-lam-dep", parent_id: 1 },

    // Level 3 - Chăm sóc da
    { id: 111, name: "Làm sạch", slug: "lam-sach", parent_id: 11 },
    { id: 112, name: "Mặt nạ", slug: "mat-na", parent_id: 11 },
    { id: 113, name: "Chống nắng", slug: "chong-nang", parent_id: 11 },
    { id: 114, name: "Toner", slug: "toner", parent_id: 11 },
    { id: 115, name: "Serum / Treatment", slug: "serum-treatment", parent_id: 11 },
    { id: 116, name: "Kem dưỡng", slug: "kem-duong", parent_id: 11 },

    // Level 3 - Trang điểm
    { id: 121, name: "Trang điểm nền", slug: "trang-diem-nen", parent_id: 12 },
    { id: 122, name: "Trang điểm màu", slug: "trang-diem-mau", parent_id: 12 },
    { id: 123, name: "Làm móng", slug: "lam-mong", parent_id: 12 },

    // ==========================================
    // ROOT - SỨC KHỎE (ID: 2)
    // ==========================================
    {
      id: 2,
      name: "Sức khỏe",
      slug: "suc-khoe",
      parent_id: null,
    },
    { id: 21, name: "Thực phẩm chức năng", slug: "thuc-pham-chuc-nang", parent_id: 2 },
    { id: 22, name: "Vitamin", slug: "vitamin", parent_id: 2 },
    { id: 23, name: "Protein / Eat Clean", slug: "protein-eat-clean", parent_id: 2 },
    { id: 24, name: "Chăm sóc răng miệng", slug: "cham-soc-rang-mieng", parent_id: 2 },
    { id: 25, name: "Chăm sóc sức khỏe", slug: "cham-soc-suc-khoe", parent_id: 2 },

    // ==========================================
    // ROOT - THỜI TRANG (ID: 3)
    // ==========================================
    {
      id: 3,
      name: "Thời trang",
      slug: "thoi-trang",
      parent_id: null,
    },
    // Level 2 - Thời trang
    { id: 31, name: "Quần áo", slug: "quan-ao", parent_id: 3 },
    { id: 32, name: "Giày dép", slug: "giay-dep", parent_id: 3 },
    { id: 33, name: "Túi xách", slug: "tui-xach", parent_id: 3 },
    { id: 34, name: "Trang sức", slug: "trang-suc", parent_id: 3 },
    { id: 35, name: "Phụ kiện thời trang", slug: "phu-kien-thoi-trang", parent_id: 3 },

    // 🔥 Level 3 - Quần áo (Bẻ nhỏ từ ID: 31)
    { id: 311, name: "Áo thun", slug: "ao-thun", parent_id: 31 },
    { id: 312, name: "Áo sơ mi", slug: "ao-so-mi", parent_id: 31 },
    { id: 313, name: "Áo khoác", slug: "ao-khoac", parent_id: 31 },
    { id: 314, name: "Quần / Váy", slug: "quan-vay", parent_id: 31 },
    { id: 315, name: "Quần short", slug: "quan-short", parent_id: 31 },
    { id: 316, name: "Áo hoodie", slug: "ao-hoodie", parent_id: 31 },
    { id: 317, name: "Áo nỉ / Sweatshirt", slug: "ao-sweatshirt", parent_id: 31 },
    { id: 318, name: "Áo cardigan", slug: "ao-cardigan", parent_id: 31 },

    // 🔥 Level 3 - Giày dép (Bẻ nhỏ từ ID: 32)
    { id: 321, name: "Giày sneaker & Boots", slug: "giay-sneaker-boots", parent_id: 32 },

    // 🔥 Level 3 - Túi xách & Ví (Bẻ nhỏ từ ID: 33)
    { id: 331, name: "Túi xách / Bags", slug: "tui-xach-bags", parent_id: 33 },
    { id: 332, name: "Ví / Bóp", slug: "vi-bop", parent_id: 33 },

    // 🔥 Level 3 - Trang sức chi tiết (Bẻ nhỏ từ ID: 34)
    { id: 341, name: "Phụ kiện trang sức", slug: "phu-kien-trang-suc", parent_id: 34 },

    // 🔥 Level 3 - Phụ kiện thời trang (Bẻ nhỏ từ ID: 35)
    { id: 351, name: "Mũ / Nón", slug: "mu-non", parent_id: 35 },
    { id: 352, name: "Kính mắt", slug: "kinh-mat", parent_id: 35 },

    // ==========================================
    // ROOT - KPOP / ANIME / GAMING (ID: 4)
    // ==========================================
    {
      id: 4,
      name: "K-pop / Anime / Gaming",
      slug: "kpop-anime-gaming",
      parent_id: null,
    },
    // Level 2 - Kpop / Anime / Gaming
    { id: 41, name: "K-pop / Idol", slug: "kpop-idol", parent_id: 4 },
    { id: 42, name: "Anime", slug: "anime", parent_id: 4 },
    { id: 43, name: "Esports / Gaming", slug: "esports-gaming", parent_id: 4 },
    { id: 44, name: "Album / Photobook", slug: "album-photobook", parent_id: 4 },
    { id: 45, name: "Figure / Goods", slug: "figure-goods", parent_id: 4 },

    // Level 3 - Esports / Gaming
    { id: 431, name: "Jersey / Uniform", slug: "esports-jersey", parent_id: 43 },
    { id: 432, name: "Hoodie / Apparel", slug: "esports-apparel", parent_id: 43 },
    { id: 433, name: "Gaming Accessories", slug: "gaming-accessories", parent_id: 43 },
    { id: 434, name: "Collectibles", slug: "gaming-collectibles", parent_id: 43 },
    { id: 435, name: "Photocard / Slogan", slug: "photocard-slogan", parent_id: 43 },

    // ==========================================
    // ROOT - LIFESTYLE (ID: 5)
    // ==========================================
    {
      id: 5,
      name: "Lifestyle",
      slug: "lifestyle",
      parent_id: null,
    },
    // Level 2 - Lifestyle
    { id: 51, name: "Đồ gia dụng", slug: "do-gia-dung", parent_id: 5 },
    { id: 52, name: "Văn phòng phẩm", slug: "van-phong-pham", parent_id: 5 },
    { id: 53, name: "Đồ bếp", slug: "do-bep", parent_id: 5 },
    { id: 54, name: "Phụ kiện đời sống", slug: "phu-kien-doi-song", parent_id: 5 },
    // 🔥 Mục hứng đồ tổng hợp của Musinsa
    { id: 55, name: "Life Goods", slug: "life-goods", parent_id: 5 },
  ]);
};