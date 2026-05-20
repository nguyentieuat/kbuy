const fs = require("fs");
const path = require("path");
const { translate } = require("@vitalets/google-translate-api");

// ===== CONFIG =====
const INPUT_DIR = "./data/output_products_kr";
const OUTPUT_DIR = "./data/output_products_vi_ggT";
const DICT_PATH = path.join(OUTPUT_DIR, "dict.json");

const BASE_DELAY = 800;        // delay cơ bản
const RANDOM_DELAY = 700;      // random thêm
const COOLDOWN_TIME = 60000;   // khi bị block → nghỉ 60s
const MAX_RETRY = 3;

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ===== LOAD DICT =====
let DICT = fs.existsSync(DICT_PATH)
  ? JSON.parse(fs.readFileSync(DICT_PATH, "utf8"))
  : {};

// ===== CLASSIFY =====
function classify(text) {
  if (!text) return "skip";

  if (text.includes(",") && text.length > 80) return "ingredient";
  if (/^\d+(ml|g|kg|%|원)/i.test(text)) return "number";
  if (/^[A-Za-z0-9\s\-\(\)\[\]]+$/.test(text)) return "english";
  if (/^[가-힣\s]{1,20}$/.test(text)) return "term";

  return "normal";
}

// ===== NORMALIZE =====
const COSMETIC_DICT = {
  "토너": "Nước cân bằng",
  "크림": "Kem dưỡng",
  "로션": "Sữa dưỡng",
  "핸드크림": "Kem dưỡng tay",
  "선크림": "Kem chống nắng"
};

const INCI_MAP = {
  "정제수": "Water (Aqua)",
  "글리세린": "Glycerin",
  "나이아신아마이드": "Niacinamide",
  "판테놀": "Panthenol"
};

function normalize(text, type) {
  let result = text;

  if (type === "ingredient") {
    Object.entries(INCI_MAP).forEach(([k, v]) => {
      result = result.replaceAll(k, v);
    });
    return result;
  }

  Object.entries(COSMETIC_DICT).forEach(([k, v]) => {
    result = result.replaceAll(k, v);
  });

  return result;
}

// ===== DELAY RANDOM =====
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function randomDelay() {
  const delay = BASE_DELAY + Math.random() * RANDOM_DELAY;
  await sleep(delay);
}

// ===== TRANSLATE WITH RETRY + COOLDOWN =====
async function translateWithProtection(text) {
  for (let i = 0; i < MAX_RETRY; i++) {
    try {
      console.log("👉 Translating:", text);

      const res = await translate(text, { to: "vi" });
      return res.text;

    } catch (err) {
      const msg = err.message || "";

      // 🔥 bị block
      if (msg.includes("Too Many Requests")) {
        console.log("🚫 Bị block → nghỉ 60s...");
        await sleep(COOLDOWN_TIME);
      }

      console.log(`⚠️ Retry ${i + 1}/${MAX_RETRY}:`, text);
      await sleep(2000);
    }
  }

  // fallback
  console.log("❌ Skip:", text);
  return text;
}

// ===== SMART TRANSLATE =====
async function translateSmart(text) {
  const type = classify(text);

  if (DICT[text]) {
    DICT[text].count++;
    return DICT[text].translated;
  }

  // skip
  if (["ingredient", "number", "english"].includes(type)) {
    const normalized = normalize(text, type);

    DICT[text] = {
      translated: normalized,
      type,
      count: 1
    };

    return normalized;
  }

  let translated = await translateWithProtection(text);

  translated = normalize(translated, type);

  DICT[text] = {
    translated,
    type,
    count: 1
  };

  return translated;
}

// ===== EXTRACT =====
function extractTexts(product) {
  let texts = [];

  if (product.name) texts.push(product.name);

  if (product.specs) {
    Object.entries(product.specs).forEach(([k, v]) => {
      if (k) texts.push(k);
      if (v) texts.push(v);
    });
  }

  return texts;
}

// ===== MAIN =====
async function run() {
  const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith(".jsonl"));

  let allProducts = [];
  let fileMap = {};

  for (const file of files) {
    const filePath = path.join(INPUT_DIR, file);

    const lines = fs.readFileSync(filePath, "utf8")
      .split("\n")
      .filter(Boolean);

    const products = lines.map(l => JSON.parse(l));

    fileMap[file] = products;
    allProducts.push(...products);
  }

  console.log("📦 Total:", allProducts.length);

  // ===== UNIQUE TEXT =====
  let texts = [];
  allProducts.forEach(p => texts.push(...extractTexts(p)));

  const uniqueTexts = [...new Set(texts)];
  console.log("🧠 Unique:", uniqueTexts.length);

  // ===== TRANSLATE =====
  for (let i = 0; i < uniqueTexts.length; i++) {
    const text = uniqueTexts[i];

    try {
      const result = await translateSmart(text);
      console.log(`[${i + 1}/${uniqueTexts.length}]`, result);
    } catch (err) {
      console.log("❌ Fatal:", text);
    }

    await randomDelay(); // 🔥 chống block
  }

  // ===== MAP OUTPUT =====
  for (const file of files) {
    const products = fileMap[file];

    const translated = products.map(p => {
      const newP = JSON.parse(JSON.stringify(p));

      if (newP.name) {
        newP.name = DICT[newP.name]?.translated || newP.name;
      }

      if (newP.specs) {
        const newSpecs = {};

        Object.entries(newP.specs).forEach(([k, v]) => {
          const newKey = DICT[k]?.translated || k;
          const newValue = DICT[v]?.translated || v;

          newSpecs[newKey] = newValue;
        });

        newP.specs = newSpecs;
      }

      return newP;
    });

    const outputPath = path.join(OUTPUT_DIR, file);

    fs.writeFileSync(
      outputPath,
      translated.map(p => JSON.stringify(p)).join("\n"),
      "utf8"
    );

    console.log("✅ Saved:", outputPath);
  }

  // ===== SAVE DICT =====
  fs.writeFileSync(DICT_PATH, JSON.stringify(DICT, null, 2), "utf8");

  console.log("🏁 DONE");
}

run();