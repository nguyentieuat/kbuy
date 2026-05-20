const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const OPENROUTER_API_KEY = "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";

const INPUT_DIR = "./data/output_products_kr";
const OUTPUT_DIR = "./data/output_products_vi_gpt";

const API_URL = "https://openrouter.ai/api/v1/chat/completions";

const MODELS = [
  "openai/gpt-4o-mini",
  "anthropic/claude-3.5-sonnet",
  "deepseek/deepseek-chat"
];

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ==========================
// Helpers
// ==========================
function isText(str) {
  return typeof str === "string" && /[가-힣a-zA-Z]/.test(str);
}

function extractTexts(product) {
  let texts = [];

  if (product.name) texts.push(product.name);
  if (product.description) texts.push(product.description);

  if (Array.isArray(product.specs)) {
    product.specs.forEach((s) => {
      if (s.key) texts.push(s.key);
      if (s.value && isText(s.value)) texts.push(s.value);
    });
  }

  return texts;
}

function chunk(arr, size) {
  const res = [];
  for (let i = 0; i < arr.length; i += size) {
    res.push(arr.slice(i, i + size));
  }
  return res;
}

// ==========================
// MODEL CALL
// ==========================
async function callModel(model, texts) {
  try {
    console.log("👉 CALLING:", model);

    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost",
        "X-Title": "translator"
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: "Translate to Vietnamese. Return ONLY JSON array."
          },
          {
            role: "user",
            content: JSON.stringify(texts)
          }
        ],
        temperature: 0
      })
    });

    console.log("👉 STATUS:", res.status);

    const raw = await res.text(); // 🔥 đọc raw trước
    console.log("👉 RAW TEXT:", raw);

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      throw new Error("❌ Response is not JSON");
    }

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${raw}`);
    }

    if (!data.choices || !data.choices.length) {
      throw new Error(`No choices: ${raw}`);
    }

    let text = data.choices[0].message.content.trim();

    if (text.startsWith("```")) {
      text = text.replace(/^```json\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(text);

    if (!Array.isArray(parsed)) {
      throw new Error("Not array");
    }

    return parsed;

  } catch (err) {
    console.error("💥 ERROR:", err.message);
    throw err;
  }
}

async function callWithRetry(model, texts, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await callModel(model, texts);
    } catch (err) {
      console.warn(`⚠️ Retry ${i + 1}/${retries} - ${model}`);
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function translateBatch(texts) {
  for (const model of MODELS) {
    try {
      console.log(`🚀 ${model}`);
      return await callWithRetry(model, texts);
    } catch (e) {
      console.log(`❌ Fail: ${model}`);
    }
  }
  throw new Error("All models failed");
}

// ==========================
// MAIN
// ==========================
async function run() {
  const files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith(".jsonl"));

  let allProducts = [];
  let fileMap = {};

  // ===== READ FILES =====
  for (const file of files) {
    const filePath = path.join(INPUT_DIR, file);

    const lines = fs.readFileSync(filePath, "utf8")
      .split("\n")
      .filter(Boolean);

    const products = lines.map(l => JSON.parse(l));

    fileMap[file] = products;
    allProducts.push(...products);
  }

  console.log("📦 Total products:", allProducts.length);

  // ===== EXTRACT =====
  let allTexts = [];
  allProducts.forEach(p => {
    allTexts.push(...extractTexts(p));
  });

  // ===== DEDUPE =====
  const uniqueTexts = [...new Set(allTexts)];
  console.log("🧠 Unique texts:", uniqueTexts.length);

  // ===== TRANSLATE =====
  const batches = chunk(uniqueTexts, 50);
  let dictionary = {};

  for (let i = 0; i < batches.length; i++) {
    console.log(`🚀 Batch ${i + 1}/${batches.length}`);

    try {
      const result = await translateBatch(batches[i]);

      batches[i].forEach((t, idx) => {
        dictionary[t] = result[idx];
      });

    } catch (err) {
      console.error("❌ Batch failed:", err.message);
    }

    await new Promise(r => setTimeout(r, 2000));
  }

  // ===== MAP + SAVE =====
  for (const file of files) {
    const products = fileMap[file];

    const translated = products.map(p => {
      const newP = JSON.parse(JSON.stringify(p));

      if (newP.name) newP.name = dictionary[newP.name] || newP.name;
      if (newP.description) newP.description = dictionary[newP.description] || newP.description;

      if (Array.isArray(newP.specs)) {
        newP.specs = newP.specs.map(s => ({
          key: dictionary[s.key] || s.key,
          value: isText(s.value) ? (dictionary[s.value] || s.value) : s.value
        }));
      }

      return newP;
    });

    const outputPath = path.join(
      OUTPUT_DIR,
      file.replace(".jsonl", "_translated.jsonl")
    );

    fs.writeFileSync(
      outputPath,
      translated.map(p => JSON.stringify(p)).join("\n"),
      "utf8"
    );

    console.log(`✅ Saved: ${outputPath}`);
  }

  console.log("🏁 DONE ALL");
}

run();