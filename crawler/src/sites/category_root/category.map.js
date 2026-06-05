const categoryIdMap = {
  // =========================
  // ROOT
  // =========================
  "my-pham": 1,
  "suc-khoe": 2,
  "thoi-trang": 3,
  "kpop-anime-gaming": 4,
  lifestyle: 5,

  // =========================
  // MỸ PHẨM (Giữ nguyên)
  // =========================
  "cham-soc-da": 11,
  "trang-diem": 12,
  "cham-soc-toc": 13,
  "cham-soc-co-the": 14,
  "nuoc-hoa": 15,
  "my-pham-da-lieu": 16,
  "thiet-bi-lam-dep": 17,
  "phu-kien-lam-dep": 18,

  "lam-sach": 111,
  "mat-na": 112,
  "chong-nang": 113,
  toner: 114,
  "serum-treatment": 115,
  "kem-duong": 116,

  "trang-diem-nen": 121,
  "trang-diem-mau": 122,
  "lam-mong": 123,

  // =========================
  // SỨC KHỎE (Giữ nguyên)
  // =========================
  "thuc-pham-chuc-nang": 21,
  vitamin: 22,
  "protein-eat-clean": 23,
  "cham-soc-rang-mieng": 24,
  "cham-soc-suc-khoe": 25,

  // =========================
  // THỜI TRANG (Cập nhật Map Musinsa)
  // =========================
  "quan-ao": 31,
  "giay-dep": 32,
  "tui-xach": 33,
  "trang-suc": 34,
  "phu-kien-thoi-trang": 35,

  // Quần áo chi tiết (Bẻ nhỏ từ 31)
  "ao-thun": 311,       // T-SHIRTS
  "ao-so-mi": 312,      // SHIRTS
  "ao-khoac": 313,      // OUTER
  "quan-vay": 314,      // PANTS & SKIRTS
  "quan-short": 315,    // SHORTS
  "ao-hoodie": 316,     // HOODIE
  "ao-sweatshirt": 317, // SWEATSHIRTS
  "ao-cardigan": 318,   // CARDIGAN

  // Giày dép chi tiết (Bẻ nhỏ từ 32)
  "giay-sneaker-boots": 321, // SHOES

  // Túi xách & Ví (Bẻ nhỏ từ 33)
  "tui-xach-bags": 331, // BAGS
  "vi-bop": 332,        // WALLETS

  // Trang sức chi tiết (Bẻ nhỏ từ 34)
  "phu-kien-trang-suc": 341, // JEWELRY

  // Phụ kiện thời trang (Bẻ nhỏ từ 35)
  "mu-non": 351,        // CAP
  "kinh-mat": 352,      // EYEWEAR

  // =========================
  // KPOP / ANIME / GAMING (Giữ nguyên)
  // =========================
  "kpop-idol": 41,
  anime: 42,
  "esports-gaming": 43,
  "album-photobook": 44,
  "figure-goods": 45,
  "esports-jersey": 431,
  "esports-apparel": 432,
  "gaming-accessories": 433,
  "gaming-collectibles": 434,
  "photocard-slogan": 435,

  // =========================
  // LIFESTYLE (Cập nhật Map Musinsa)
  // =========================
  "do-gia-dung": 51,
  "van-phong-pham": 52,
  "do-bep": 53,
  "phu-kien-doi-song": 54,
  "life-goods": 55,     // LIFE (Mục tổng hợp đồ đời sống của Musinsa)
};

module.exports = {
  categoryIdMap,
};