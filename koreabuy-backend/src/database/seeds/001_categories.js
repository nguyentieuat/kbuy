exports.seed = async function (knex) {
  await knex("shipping_fee_configs").del();

  await knex("categories").insert([
    // ROOT
    { id: 1, name: "Mỹ phẩm", code: "1", parent_id: null },

    // Level 2 - Mỹ phẩm
    { id: 11, name: "Chăm sóc da", code: "11", parent_id: 1 },
    { id: 12, name: "Trang điểm", code: "12", parent_id: 1 },
    { id: 13, name: "Chăm sóc tóc", code: "13", parent_id: 1 },
    { id: 14, name: "Chăm sóc cơ thể", code: "14", parent_id: 1 },
    { id: 15, name: "Nước hoa", code: "15", parent_id: 1 },
    { id: 16, name: "Mỹ phẩm da liễu", code: "16", parent_id: 1 },
    { id: 17, name: "Thiết bị làm đẹp", code: "17", parent_id: 1 },
    { id: 18, name: "Phụ kiện làm đẹp", code: "18", parent_id: 1 },

    // Level 3 - Chăm sóc da
    { id: 111, name: "Làm sạch", code: "111", parent_id: 11 },
    { id: 112, name: "Mặt nạ", code: "112", parent_id: 11 },
    { id: 113, name: "Chống nắng", code: "113", parent_id: 11 },
    { id: 114, name: "Toner", code: "114", parent_id: 11 },
    { id: 115, name: "Serum / Treatment", code: "115", parent_id: 11 },
    { id: 116, name: "Kem dưỡng", code: "116", parent_id: 11 },

    // Level 3 - Trang điểm
    { id: 121, name: "Trang điểm nền", code: "121", parent_id: 12 },
    { id: 122, name: "Trang điểm màu", code: "122", parent_id: 12 },
    { id: 123, name: "Làm móng", code: "123", parent_id: 12 },

    // Sức khỏe
    { id: 2, name: "Sức khỏe", code: "2", parent_id: null },

    { id: 21, name: "Thực phẩm chức năng", code: "21", parent_id: 2 },
    { id: 22, name: "Vitamin", code: "22", parent_id: 2 },
    { id: 23, name: "Protein / Eat Clean", code: "23", parent_id: 2 },
    { id: 24, name: "Chăm sóc răng miệng", code: "24", parent_id: 2 },
    { id: 25, name: "Chăm sóc sức khỏe", code: "25", parent_id: 2 },

    // Thời trang
    { id: 3, name: "Thời trang", code: "3", parent_id: null },

    { id: 31, name: "Quần áo", code: "31", parent_id: 3 },
    { id: 32, name: "Giày dép", code: "32", parent_id: 3 },
    { id: 33, name: "Túi xách", code: "33", parent_id: 3 },
    { id: 34, name: "Trang sức", code: "34", parent_id: 3 },
    { id: 35, name: "Phụ kiện thời trang", code: "35", parent_id: 3 },

    // K-pop / Anime / Gaming
    { id: 4, name: "K-pop / Anime / Gaming", code: "4", parent_id: null },

    { id: 41, name: "K-pop / Idol", code: "41", parent_id: 4 },
    { id: 42, name: "Anime", code: "42", parent_id: 4 },
    { id: 43, name: "Esports / Gaming", code: "43", parent_id: 4 },
    { id: 44, name: "Album / Photobook", code: "44", parent_id: 4 },
    { id: 45, name: "Figure / Goods", code: "45", parent_id: 4 },

    // Lifestyle
    { id: 5, name: "Lifestyle", code: "5", parent_id: null },

    { id: 51, name: "Đồ gia dụng", code: "51", parent_id: 5 },
    { id: 52, name: "Văn phòng phẩm", code: "52", parent_id: 5 },
    { id: 53, name: "Đồ bếp", code: "53", parent_id: 5 },
    { id: 54, name: "Phụ kiện đời sống", code: "54", parent_id: 5 },
  ]);
}