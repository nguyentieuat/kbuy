// seeds/001_categories.js

exports.seed = async function (knex) {
  // Xóa dữ liệu cũ
  await knex("categories").del();

  // Reset auto increment (Postgres)
  await knex.raw(`
    ALTER SEQUENCE categories_id_seq RESTART WITH 1
  `);

  await knex("categories").insert([
    // =====================================================
    // LEVEL 0
    // =====================================================

    {
      id: 1,
      name: "Mỹ phẩm",
      slug: "my-pham",
      parent_id: null,
      level: 0,
      sort_order: 1,
      is_active: true,
    },

    {
      id: 2,
      name: "Thực phẩm chức năng",
      slug: "thuc-pham-chuc-nang",
      parent_id: null,
      level: 0,
      sort_order: 2,
      is_active: true,
    },

    {
      id: 3,
      name: "Thời trang & Phụ kiện",
      slug: "thoi-trang-phu-kien",
      parent_id: null,
      level: 0,
      sort_order: 3,
      is_active: false,
    },

    {
      id: 4,
      name: "Đồ lưu niệm",
      slug: "do-luu-niem",
      parent_id: null,
      level: 0,
      sort_order: 4,
      is_active: true,
    },

    // =====================================================
    // LEVEL 1 - MỸ PHẨM
    // =====================================================

    {
      id: 10,
      name: "Chăm sóc da",
      slug: "cham-soc-da",
      parent_id: 1,
      level: 1,
      sort_order: 1,
      is_active: true,
    },

    {
      id: 11,
      name: "Trang điểm / Làm móng",
      slug: "trang-diem-lam-mong",
      parent_id: 1,
      level: 1,
      sort_order: 2,
      is_active: true,
    },

    {
      id: 12,
      name: "Phụ kiện làm đẹp",
      slug: "phu-kien-lam-dep",
      parent_id: 1,
      level: 1,
      sort_order: 3,
      is_active: true,
    },

    {
      id: 13,
      name: "Mỹ phẩm da liễu",
      slug: "my-pham-da-lieu",
      parent_id: 1,
      level: 1,
      sort_order: 4,
      is_active: true,
    },

    {
      id: 14,
      name: "Nước hoa / Tinh dầu",
      slug: "nuoc-hoa-tinh-dau",
      parent_id: 1,
      level: 1,
      sort_order: 5,
      is_active: true,
    },

    {
      id: 15,
      name: "Chăm sóc tóc",
      slug: "cham-soc-toc",
      parent_id: 1,
      level: 1,
      sort_order: 6,
      is_active: true,
    },

    {
      id: 16,
      name: "Chăm sóc cơ thể",
      slug: "cham-soc-co-the",
      parent_id: 1,
      level: 1,
      sort_order: 7,
      is_active: true,
    },

    {
      id: 17,
      name: "Dành cho nam giới",
      slug: "cham-soc-nam",
      parent_id: 1,
      level: 1,
      sort_order: 8,
      is_active: true,
    },

    // =====================================================
    // LEVEL 1 - TPCN
    // =====================================================

    {
      id: 20,
      name: "Thực phẩm chức năng",
      slug: "tpcn",
      parent_id: 2,
      level: 1,
      sort_order: 1,
      is_active: true,
    },

    {
      id: 21,
      name: "Chăm sóc răng miệng / sức khỏe",
      slug: "rang-mieng-suc-khoe",
      parent_id: 2,
      level: 1,
      sort_order: 2,
      is_active: true,
    },

    // =====================================================
    // LEVEL 1 - THỜI TRANG
    // =====================================================

    {
      id: 30,
      name: "Quần áo",
      slug: "quan-ao",
      parent_id: 3,
      level: 1,
      sort_order: 1,
      is_active: true,
    },

    {
      id: 31,
      name: "Phụ kiện",
      slug: "phu-kien",
      parent_id: 3,
      level: 1,
      sort_order: 2,
      is_active: true,
    },

    // =====================================================
    // LEVEL 1 - ĐỒ LƯU NIỆM
    // =====================================================

    {
      id: 40,
      name: "K-pop / Idol",
      slug: "kpop-idol",
      parent_id: 4,
      level: 1,
      sort_order: 1,
      is_active: true,
    },

    {
      id: 41,
      name: "Esports",
      slug: "esports",
      parent_id: 4,
      level: 1,
      sort_order: 2,
      is_active: true,
    },

    {
      id: 42,
      name: "Anime",
      slug: "anime",
      parent_id: 4,
      level: 1,
      sort_order: 3,
      is_active: true,
    },

    // =====================================================
    // LEVEL 2 - CHĂM SÓC DA
    // =====================================================

    {
      id: 100,
      name: "Mặt nạ",
      slug: "mat-na",
      parent_id: 10,
      level: 2,
      sort_order: 1,
      is_active: true,
    },

    {
      id: 101,
      name: "Làm sạch",
      slug: "lam-sach",
      parent_id: 10,
      level: 2,
      sort_order: 2,
      is_active: true,
    },

    {
      id: 102,
      name: "Chống nắng",
      slug: "chong-nang",
      parent_id: 10,
      level: 2,
      sort_order: 3,
      is_active: true,
    },
  ]);
};