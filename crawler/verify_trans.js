const fs = require("fs");
const path = require("path");

const DIR = "D:/Project/My project/KoreanBuy/crawler/data/output_products_vi";

// ===== MAP DỊCH KEY =====
const KEY_MAP = {
  "내용물의 용량 또는 중량": "Dung tích / Khối lượng",
  "제품 주요 사양": "Loại sản phẩm / Đối tượng sử dụng",
  "사용기한(또는 개봉 후 사용기간)": "Hạn sử dụng",
  "사용방법": "Hướng dẫn sử dụng",
  "화장품제조업자,화장품책임판매업자 및 맞춤형화장품판매업자": "Nhà sản xuất / Phân phối",
  "제조국": "Xuất xứ",
  "화장품법에 따라 기재해야 하는 모든 성분": "Thành phần",
  "기능성 화장품 식품의약품안전처 심사필 여부": "Mỹ phẩm chức năng",
  "사용할 때의 주의사항": "Lưu ý khi sử dụng",
  "품질보증기준": "Chính sách bảo hành",
  "소비자상담 전화번호": "CSKH",
};

// ===== NORMALIZE =====
function normalizeKey(key) {
  return key
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-zA-Z0-9가-힣 ]/g, "")
    .trim();
}

// ===== TRANSLATE KEY =====
function translateKey(key) {
  if (KEY_MAP[key]) return KEY_MAP[key];

  const normalized = normalizeKey(key);

  for (let k in KEY_MAP) {
    if (normalizeKey(k) === normalized) {
      return KEY_MAP[k];
    }
  }

  return key; // fallback
}

// ===== PROCESS SPECS =====
function processSpecs(specs) {
  const result = {};

  for (let key in specs) {
    if (!key || !specs[key]) continue;

    const newKey = translateKey(key);
    const value = specs[key];

    // merge duplicate
    if (!result[newKey]) {
      result[newKey] = value;
    } else {
      if (!result[newKey].includes(value)) {
        result[newKey] += " | " + value;
      }
    }
  }

  return result;
}

// ===== MAIN =====
function run() {
  const files = fs.readdirSync(DIR);

  for (const file of files) {
    if (!file.endsWith(".json")) continue;

    const filePath = path.join(DIR, file);

    try {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

      if (data.specs) {
        data.specs = processSpecs(data.specs);
      }

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");

      console.log("✔ Done:", file);
    } catch (err) {
      console.error("✖ Error:", file, err.message);
    }
  }

  console.log("DONE ALL ✅");
}

run();