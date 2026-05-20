const fs = require("fs");
const path = require("path");
const pLimit = require("p-limit").default;
require("dotenv").config();

// ================= CONFIG =================
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";

const INPUT_DIR = "./data/output_products_kr";
const OUTPUT_DIR = "./data/output_products_vi";
const LOG_DIR = path.join(OUTPUT_DIR, "logs");

const DICT_PATH = "./data/dict_vi.json";

const CONCURRENCY = 2;
const BATCH_SIZE = 10;
const DELAY = 1200;

const limit = pLimit(CONCURRENCY);

// ================= INIT =================
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

let DICT = {};
if (fs.existsSync(DICT_PATH)) {
  DICT = JSON.parse(fs.readFileSync(DICT_PATH, "utf8"));
}

// ================= UTILS =================
function normalize(text) {
  return text?.toLowerCase().trim().replace(/\s+/g, " ");
}

function shouldSaveToDict(text) {
  return text && text.length < 100 && !text.includes("\n");
}

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("Invalid JSON");
    return JSON.parse(match[0]);
  }
}

// ================= INDEX =================
function buildOutputMap(outputPath) {
  const map = new Map();
  if (!fs.existsSync(outputPath)) return map;

  const lines = fs.readFileSync(outputPath, "utf8").split("\n");

  for (const line of lines) {
    if (!line) continue;
    try {
      const obj = JSON.parse(line);
      map.set(obj.productId, obj);
    } catch {}
  }

  return map;
}

// ================= EXTRACT =================
function extract(product) {
  const items = [];

  if (product.name) {
    items.push({ id: "name", text: product.name });
  }

  for (const [k, v] of Object.entries(product.specs || {})) {
    items.push({ id: `key_${k}`, text: k });
    if (typeof v === "string") {
      items.push({ id: `val_${k}`, text: v });
    }
  }

  if (product.variants) {
    product.variants.forEach((v) => {
      if (v.name_kr) {
        items.push({
          id: `variant_${v.variantId}`,
          text: v.name_kr,
        });
      }
    });
  }

  return items;
}

// ================= GEMINI =================
async function translateBatch(items) {
  if (!items.length) return [];

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  const payload = {
    contents: [
      {
        parts: [
          {
            text: `
                Bạn là hệ thống dịch chuyên ngành mỹ phẩm Hàn Quốc.

                TASK:
                Dịch danh sách JSON sau sang tiếng Việt.

                RULE:
                - Giữ nguyên id
                - Chỉ dịch field text
                - Không thêm giải thích
                - Trả về JSON ARRAY đúng format
                - Hãy giữ nguyên tên các hợp chất hóa học bằng tiếng Anh (ví dụ: Glycerin, Niacinamide) và chỉ dịch tên các chiết xuất tự nhiên sang tiếng Việt."
                - Đối với các trường có nội dung dài như 'Lưu ý khi sử dụng' và 'Hướng dẫn sử dụng':
                    Phân tích cấu trúc: Hãy tự động nhận diện các thành phần có tính liệt kê (bất kể chúng bắt đầu bằng 1, 2, 3; hoặc a, b, c; hoặc các dấu gạch đầu dòng -, •).
                    Định dạng Markdown: Trình bày lại dưới dạng danh sách Markdown có phân cấp rõ ràng:
                    Các mục lớn nhất luôn bắt đầu bằng 1., 2., 3.
                    Các mục con bổ trợ cho mục lớn phải được thụt lề và bắt đầu bằng dấu gạch ngang -.
                    Tính nhất quán: Ngay cả khi văn bản gốc dùng 'a, b, c' làm mục lớn, hãy chuyển đổi chúng về hệ thống 1, 2, 3 để toàn bộ sản phẩm có định dạng đồng nhất.
                    Ví dụ mục tiêu:
                        1. Lưu ý chung
                            - Tránh ánh nắng
                            - Để xa tầm tay
                        2. Hạn chế sử dụng trên vết thương.
                DATA:
                ${JSON.stringify(items)}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  return safeParse(text);
}

// ================= PROCESS =================
async function processProduct(product) {
  const items = extract(product);

  const map = new Map();
  const needTranslate = [];

  for (const item of items) {
    const key = normalize(item.text);

    if (DICT[key]) {
      map.set(item.id, DICT[key]);
    } else {
      needTranslate.push(item);
    }
  }

  if (needTranslate.length) {
    const result = await translateBatch(needTranslate);

    result.forEach((r, i) => {
      const original = needTranslate[i];
      const norm = normalize(original.text);

      map.set(original.id, r.text);

      if (shouldSaveToDict(original.text)) {
        DICT[norm] = r.text;
      }
    });

    fs.writeFileSync(DICT_PATH, JSON.stringify(DICT, null, 2));
  }

  // APPLY NAME
  if (map.has("name")) {
    product.name = map.get("name");
  }

  // APPLY SPECS (KEY + VALUE)
  const newSpecs = {};

  for (const [k, v] of Object.entries(product.specs || {})) {
    const newKey = map.get(`key_${k}`) || k;
    const newVal = map.get(`val_${k}`) || v;

    newSpecs[newKey] = newVal;
  }

  product.specs = newSpecs;

  // APPLY VARIANTS
  if (product.variants) {
    product.variants = product.variants.map((v) => {
      const translated = map.get(`variant_${v.variantId}`);

      return {
        ...v,
        name: translated || v.name_kr,
      };
    });
  }

  return product;
}

// ================= BATCH =================
async function processBatch(lines, fileName) {
  const outputPath = path.join(
    OUTPUT_DIR,
    fileName.replace(".jsonl", "_vi.jsonl"),
  );

  const outputMap = buildOutputMap(outputPath);

  const pending = [];

  for (const line of lines) {
    const item = JSON.parse(line);

    if (!item.productId) continue;

    // 🔥 SKIP nếu đã tồn tại
    if (outputMap.has(item.productId)) continue;

    pending.push(item);
  }

  console.log("PENDING:", pending.length);

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const chunk = pending.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      chunk.map((item) =>
        limit(async () => {
          try {
            const result = await processProduct(item);
            return result;
          } catch (e) {
            console.log("❌", item.productId, e.message);
            return null;
          }
        }),
      ),
    );

    // 🔥 GHI FILE KHÔNG TRÙNG
    for (const r of results) {
      if (!r) continue;

      if (!outputMap.has(r.productId)) {
        fs.appendFileSync(outputPath, JSON.stringify(r) + "\n");
        outputMap.set(r.productId, true);
        console.log("✔", r.productId);
      }
    }

    await new Promise((r) => setTimeout(r, DELAY));
  }
}

// ================= RUN =================
async function run() {
  const files = fs.readdirSync(INPUT_DIR).filter((f) => f.endsWith(".jsonl"));

  for (const file of files) {
    const lines = fs
      .readFileSync(path.join(INPUT_DIR, file), "utf8")
      .split("\n")
      .filter(Boolean);

    await processBatch(lines, file);
  }

  console.log("DONE");
}

run();
