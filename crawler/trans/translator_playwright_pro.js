const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

// ===== CONFIG =====
const INPUT_DIR = "./data/output_products_kr";
const OUTPUT_DIR = "./data/output_products_vi_pw";

const SPLIT = "|||__SPLIT__|||";

const MIN_DELAY = 1500;
const MAX_DELAY = 3000;
const LONG_BREAK_EVERY = 30;
const LONG_BREAK_TIME = 20000;

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ===== UTILS =====
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function humanDelay() {
  const t = MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
  await sleep(t);
}

// ===== REFINE =====
function refine(text) {
  return text
    .replace("tẩy lông", "triệt lông")
    .replace("Dự án", "Combo")
    .replace("đa dạng", "")
    .replace("Chọn 1", "Tùy chọn")
    .replace(/\s+/g, " ")
    .trim();
}

// ===== BUILD BATCH TEXT =====
function buildBatch(product) {
  const arr = [];

  // name
  arr.push(product.name || "");

  // specs
  if (product.specs) {
    for (const [k, v] of Object.entries(product.specs)) {
      arr.push(k);
      arr.push(v);
    }
  }

  return arr;
}

// ===== APPLY BACK =====
function applyBatch(product, translatedArr) {
  let idx = 0;

  const newP = JSON.parse(JSON.stringify(product));

  // name
  newP.name = refine(translatedArr[idx++] || product.name);

  // specs
  if (product.specs) {
    const newSpecs = {};

    for (const [k, v] of Object.entries(product.specs)) {
      const newKey = refine(translatedArr[idx++] || k);
      const newVal = refine(translatedArr[idx++] || v);

      newSpecs[newKey] = newVal;
    }

    newP.specs = newSpecs;
  }

  return newP;
}

// ===== TRANSLATE BATCH =====
async function translateBatch(page, texts) {
  try {
    const input = texts.join(SPLIT);

    await page.fill('textarea[aria-label="Source text"]', "");
    await page.fill('textarea[aria-label="Source text"]', input);

    await page.waitForTimeout(1800);

    const result = await page
      .locator('span[jsname="W297wb"]')
      .first()
      .innerText();

    return result.split(SPLIT);

  } catch (err) {
    console.log("❌ Batch lỗi");
    return texts; // fallback giữ nguyên
  }
}

// ===== CAPTCHA =====
async function detectCaptcha(page) {
  const html = await page.content();

  if (html.includes("captcha") || html.includes("unusual traffic")) {
    console.log("🚫 CAPTCHA → nghỉ 5 phút...");
    await sleep(300000);
  }
}

// ===== MAIN =====
async function run() {
  const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith(".jsonl"));

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50
  });

  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
  });

  const page = await context.newPage();
  await page.goto("https://translate.google.com/?sl=ko&tl=vi");

  for (const file of files) {
    console.log("\n📂 Processing:", file);

    const inputPath = path.join(INPUT_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, file);

    const lines = fs.readFileSync(inputPath, "utf8")
      .split("\n")
      .filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
      const product = JSON.parse(lines[i]);

      console.log(`🚀 [${i + 1}/${lines.length}]`);

      const batch = buildBatch(product);

      const translatedArr = await translateBatch(page, batch);

      const newProduct = applyBatch(product, translatedArr);

      fs.appendFileSync(outputPath, JSON.stringify(newProduct) + "\n");

      await detectCaptcha(page);
      await humanDelay();

      if (i % LONG_BREAK_EVERY === 0 && i !== 0) {
        console.log("☕ nghỉ 20s...");
        await sleep(LONG_BREAK_TIME);
      }
    }

    console.log("✅ Done file:", file);
  }

  console.log("🏁 ALL DONE");
}

run();