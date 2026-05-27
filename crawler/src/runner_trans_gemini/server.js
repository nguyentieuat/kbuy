const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const fsExtra = require("fs-extra");
const { buildPrompt } = require("./promptBuilder");
const { jsonrepair } = require("jsonrepair");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use((req, res, next) => {
  console.log("\n➡️", req.method, req.url);
  next();
});

/* ========================= */
/* CONFIG */
const INPUT_DIR = path.resolve(__dirname, "../../data/output_products/t1");
// const INPUT_DIR = path.resolve(__dirname, "../../data/translate/oliveyoung/retry_failed");
const SUCCESS_DIR = path.resolve(__dirname, "../../data/translate/t1/success");
const FAILED_DIR = path.resolve(__dirname, "../../data/translate/t1/failed");
const CHECKPOINT_FILE = path.join(__dirname, "checkpoint.json");

fsExtra.ensureDirSync(SUCCESS_DIR);
fsExtra.ensureDirSync(FAILED_DIR);

/* ========================= */
/* STATE */
let queue = [];
let stats = { total: 0, pending: 0, processing: 0, done: 0, failed: 0 };
const processingMap = new Map();

/* ========================= */
/* UTIL */
function readJsonlFile(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function writeJsonlFile(filePath, rows) {
  fs.writeFileSync(
    filePath,
    rows.map((r) => JSON.stringify(r)).join("\n") + "\n",
  );
}

function upsertJsonl(filePath, productId, newData) {
  const rows = readJsonlFile(filePath);
  const index = rows.findIndex((x) => x.productId === productId);
  if (index >= 0) {
    rows[index] = newData;
  } else {
    rows.push(newData);
  }
  writeJsonlFile(filePath, rows);
}

function compressDetailHtml(html) {
  if (!html) return null;

  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
}

function normalizeText(str) {
  return (str || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractDiff(productName, variantName) {
  if (!productName || !variantName) return variantName || "";

  const product = normalizeText(productName);
  const variant = normalizeText(variantName);

  // case 1: product nằm trong variant (chuẩn nhất)
  if (variant.includes(product)) {
    const regex = new RegExp(escapeRegex(product), "i");

    return variant
      .replace(regex, "")
      .replace(/[-–—:/|]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // case 2: fallback (product không match full)
  const productWords = product.split(" ");

  let diff = variant;

  for (const w of productWords) {
    if (!w) continue;
    diff = diff.replace(new RegExp(`\\b${escapeRegex(w)}\\b`, "gi"), "");
  }

  return diff
    .replace(/[-–—:/|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildAiInput(product) {
  return {
    productId: product.productId,

    name: product.name,

    name_vi: product.name_vi,

    specs: product.specs || {},

    variants: product.variants.map((v) => {
      return {
        id: v.variantId,

        name: isDiffMode(product.source)
          ? extractDiff(product.name, v.name_kr) // DIFF MODE
          : v.name_kr, // NORMAL MODE

        price: v.price,
      };
    }),

    shipping: product.product_shipping || {},

    detail: compressDetailHtml(product.detail_html),

    images: product.images || [],
  };
}

/**
 * Xóa product khỏi file INPUT sau khi xử lý xong
 * (move sang success hoặc failed)
 */
function removeFromInput(filePath, productId) {
  const rows = readJsonlFile(filePath);
  const remaining = rows.filter((r) => r.productId !== productId);
  if (remaining.length === 0) {
    // File rỗng → xóa luôn
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.log(`🗑 Deleted empty input file: ${path.basename(filePath)}`);
  } else {
    writeJsonlFile(filePath, remaining);
  }
}

/* ========================= */
/* CHECK CẦN DỊCH KHÔNG */
function needsTranslation(product) {
  const status = product.translationStatus;
  if (!status || status === "pending") return true;
  if (status === "failed") return true;
  if (status === "done" && product.translatedHash !== product.hash) return true;
  return false;
}

/* ========================= */
/* SAFE PARSE GEMINI */
function deepClean(str) {
  return (
    (str || "")
      // remove invisible unicode
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      // remove control chars
      .replace(/[\u0000-\u001F\u007F]/g, "")
      // normalize quotes
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .trim()
  );
}

function extractJsonCandidates(str) {
  const results = [];

  for (let i = 0; i < str.length; i++) {
    if (str[i] !== "[" && str[i] !== "{") continue;

    const stack = [];
    const start = i;

    const open = str[i];
    const close = open === "[" ? "]" : "}";

    for (let j = i; j < str.length; j++) {
      if (str[j] === open) stack.push(open);
      if (str[j] === close) stack.pop();

      if (stack.length === 0) {
        results.push(str.slice(start, j + 1));
        i = j;
        break;
      }
    }
  }

  return results;
}

function scoreJson(str) {
  let score = 0;

  if (str.startsWith("[")) score += 2;
  if (str.startsWith("{")) score += 2;

  if (str.includes('"productId"')) score += 5;
  if (str.includes('"variants"')) score += 5;
  if (str.includes('"name_vi"')) score += 3;

  if (str.includes("```")) score -= 5;
  if (str.includes("Here")) score -= 3;

  return score;
}

function pickBestJson(candidates) {
  if (!candidates.length) return null;

  candidates.sort((a, b) => scoreJson(b) - scoreJson(a));

  return candidates[0];
}

function safeJsonParse(input) {
  if (typeof input !== "string") return input;

  let raw = input;

  console.log("📥 RAW LENGTH:", raw.length);

  // 1. remove code block markers
  let cleaned = raw
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .replace(/\uFEFF/g, "") // BOM
    .trim();

  // 2. extract JSON region (stronger than your current regex)
  const firstBracket = cleaned.indexOf("{");
  const firstArray = cleaned.indexOf("[");

  let start = -1;

  if (firstBracket === -1) start = firstArray;
  else if (firstArray === -1) start = firstBracket;
  else start = Math.min(firstBracket, firstArray);

  if (start !== -1) {
    cleaned = cleaned.slice(start);
  }

  // 3. try parse direct
  try {
    return JSON.parse(cleaned);
  } catch (err1) {
    console.log("⚠️ JSON.parse failed:", err1.message);
  }

  // 4. sanitize invisible chars
  cleaned = cleaned
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // control chars
    .replace(/\u200B/g, "") // zero width space
    .replace(/\u00A0/g, " ") // non-breaking space
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (err2) {
    console.log("⚠️ CLEAN PARSE FAILED:", err2.message);
  }

  // 5. jsonrepair fallback
  try {
    const repaired = jsonrepair(cleaned);
    return JSON.parse(repaired);
  } catch (err3) {
    console.log("❌ JSONREPAIR FAILED:", err3.message);

    console.log("==== RAW SAMPLE ====");
    console.log(raw.slice(0, 1500));

    console.log("==== CLEAN SAMPLE ====");
    console.log(cleaned.slice(0, 1500));

    return null;
  }
}

/* ========================= */
/* NORMALIZE GEMINI */
function normalizeGeminiOutput(data) {
  if (!data) return null;

  const item = Array.isArray(data) ? data[0] : data;
  if (!item) return null;

  return {
    productId: item.productId || null,
    name_vi: item.name_vi || item.name_vn || null,
    specs_vi: item.specs_vi || item.specs_vn || {},
    product_shipping: item.product_shipping || {},
    variants: item.variants || [],
  };
}

function validateProductIdentity(original, cleaned) {
  if (!cleaned?.productId) return false;

  return String(cleaned.productId).trim() === String(original.productId).trim();
}

/* ========================= */
/* MERGE VARIANTS */
function isDiffMode(source) {
  return source === "t1" || source === "geng";
}
function mergeVariants(base, enriched = [], productNameVi, product) {
  if (!Array.isArray(base)) return [];

  return base.map((v) => {
    const match = enriched.find((x) => x.variantId === v.variantId);

    // fallback
    const translated = match?.name_vi;

    let finalName;

    if (isDiffMode(product.source)) {
      finalName = translated
        ? `${productNameVi} - ${translated}`
        : `${productNameVi} - ${extractDiff(product.name, v.name_kr)}`;
    } else {
      // NORMAL MODE (oliveyoung, etc)
      finalName = translated || v.name_vi || v.name;
    }

    return {
      ...v,
      name_vi: finalName,
      shipping: match?.shipping || v.shipping || null,
    };
  });
}

/* ========================= */
/* VALIDATE KẾT QUẢ DỊCH */
function isValidTranslation(cleaned) {
  if (!cleaned) return false;

  const name = cleaned.name_vi;

  if (!name || typeof name !== "string") return false;

  const hasName = name.trim().length > 0;

  // specs KHÔNG bắt buộc phải có
  const hasSpecs = cleaned.specs_vi && typeof cleaned.specs_vi === "object";

  // variants optional
  const hasVariants = Array.isArray(cleaned.variants);

  return hasName && hasSpecs && hasVariants;
}

/* ========================= */
/* CHECKPOINT */
function loadCheckpoint() {
  if (!fs.existsSync(CHECKPOINT_FILE)) return false;
  const saved = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, "utf-8"));
  queue = saved.queue || [];
  stats = saved.stats || stats;
  console.log("♻️ Restored:", queue.length);
  return true;
}

function saveCheckpoint() {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({ queue, stats }, null, 2));
}

/* ========================= */
/* LOAD QUEUE */
function loadQueue() {
  console.log("🚀 Loading files...");

  const files = fs.readdirSync(INPUT_DIR).filter((f) => f.endsWith(".jsonl"));

  queue = [];
  let skipped = 0;

  for (const file of files) {
    const filePath = path.join(INPUT_DIR, file);
    const lines = readJsonlFile(filePath);

    lines.forEach((product, index) => {
      if (!needsTranslation(product)) {
        skipped++;
        return;
      }

      queue.push({
        id: `${file}__${index}`,
        file,
        filePath,
        index,
        data: product,
        status: "pending",
        startedAt: null,
        retries: 0,
      });
    });
  }

  stats.total = queue.length;
  stats.pending = queue.length;

  saveCheckpoint();
  console.log(`📦 NEED TRANSLATION: ${queue.length} | SKIPPED: ${skipped}`);
}

/* ========================= */
/* GET JOB */
app.get("/job/:workerId", (req, res) => {
  const workerId = req.params.workerId;
  const job = queue.find((q) => q.status === "pending");

  if (!job) return res.json(null);

  job.status = "processing";
  job.workerId = workerId;
  job.startedAt = Date.now();

  processingMap.set(job.id, workerId);

  stats.pending--;
  stats.processing++;

  saveCheckpoint();

  console.log(`📩 ASSIGNED ${job.id} → ${workerId}`);

  return res.json({
    id: job.id,
    prompt: buildPrompt(buildAiInput(job.data)),
  });
});

/* ========================= */
/* DONE */
app.post("/done", (req, res) => {
  console.log("\n================ DONE ================");

  const { id, result } = req.body;
  const job = queue.find((q) => q.id === id);

  if (!job) {
    console.log("❌ job not found:", id);
    return res.json({ ok: false, error: "job_not_found" });
  }

  const parsed = safeJsonParse(result);
  const cleaned = parsed ? normalizeGeminiOutput(parsed) : null;

  /* ========================= */
  /* ❌ PARSE FAIL hoặc kết quả rỗng */
  if (
    !parsed ||
    !isValidTranslation(cleaned) ||
    !validateProductIdentity(job.data, cleaned)
  ) {
    const reason = !parsed ? "parse_failed" : "empty_translation";
    console.log(`⚠️ FAILED [${reason}] → move to failed/`);

    const failedData = {
      ...job.data,
      translationStatus: "failed",
      translationError: reason,
      translatedAt: new Date().toISOString(),
    };

    try {
      // Ghi vào FAILED_DIR
      const failPath = path.join(FAILED_DIR, job.file);
      upsertJsonl(failPath, failedData.productId, failedData);
      console.log("📁 SAVED TO FAILED:", failPath);

      // Xóa khỏi INPUT
      removeFromInput(job.filePath, job.data.productId);
    } catch (err) {
      console.log("❌ WRITE ERROR:", err.message);
    }

    job.status = "failed_parse";
    stats.processing--;
    stats.failed++;

    saveCheckpoint();
    return res.json({ ok: false, error: reason });
  }

  /* ========================= */
  /* PARSE OK + KẾT QUẢ HỢP LỆ */
  const finalData = {
    ...job.data,
    name_vi: cleaned.name_vi,
    specs_vi: cleaned.specs_vi,
    product_shipping: cleaned.product_shipping,
    variants: mergeVariants(
      job.data.variants,
      cleaned.variants,
      cleaned.name_vi,
      job.data,
    ),

    translationStatus: "done",
    translationError: null,
    translatedHash: job.data.hash,
    translatedAt: new Date().toISOString(),
  };

  try {
    // Ghi vào SUCCESS_DIR
    const successPath = path.join(SUCCESS_DIR, job.file);
    upsertJsonl(successPath, finalData.productId, finalData);
    console.log("💾 SAVED TO SUCCESS:", successPath);

    // Xóa khỏi INPUT
    removeFromInput(job.filePath, job.data.productId);

    job.status = "done";
    stats.processing--;
    stats.done++;

    saveCheckpoint();
  } catch (err) {
    console.log("❌ WRITE ERROR:", err.message);
    return res.json({ ok: false, error: "write_failed" });
  }

  console.log("DONE:", id);
  res.json({ ok: true });
});

/* ========================= */
/* REQUEUE STUCK JOBS */
setInterval(() => {
  const now = Date.now();

  for (const job of queue) {
    if (job.status === "processing" && now - job.startedAt > 120000) {
      console.log("♻️ REQUEUE:", job.id);
      job.status = "pending";
      stats.pending++;
      stats.processing--;
      processingMap.delete(job.id);
    }
  }

  saveCheckpoint();
  console.log("📊", stats);
}, 30000);

/* ========================= */
/* STATS ENDPOINT */
app.get("/stats", (req, res) => {
  res.json({
    stats,
    breakdown: {
      pending: queue.filter((q) => q.status === "pending").length,
      processing: queue.filter((q) => q.status === "processing").length,
      done: queue.filter((q) => q.status === "done").length,
      failed: queue.filter((q) => q.status === "failed_parse").length,
    },
  });
});

/* ========================= */
/* INIT */
if (!loadCheckpoint()) {
  loadQueue();
}

app.listen(3100, () => {
  console.log("🚀 SERVER RUNNING :3100");
});
