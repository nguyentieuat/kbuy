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
const INPUT_DIR = path.resolve(__dirname, "../../data/split/oliveyoung/priority");
const SUCCESS_DIR = path.resolve(__dirname, "../../data/translate/success");
const FAILED_DIR = path.resolve(__dirname, "../../data/translate/failed");
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
      try { return JSON.parse(line); } catch { return null; }
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
function safeJsonParse(str) {
  if (typeof str !== "string") return str;

  let cleaned = str
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .replace(/^JSON\s*:?/i, "")
    .replace(/^Result\s*:?/i, "")
    .trim();

  const match = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (match) cleaned = match[0];

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.log("⚠️ NORMAL JSON PARSE FAILED:", err.message);
  }

  try {
    const repaired = jsonrepair(cleaned);
    return JSON.parse(repaired);
  } catch (err) {
    console.log("\n❌ FINAL JSON PARSE FAILED");
    console.log("MESSAGE:", err.message);
    console.log("\nRAW START:\n", cleaned.slice(0, 2000));
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
    name_vi: item.name_vi || item.name_vn || null,
    specs_vi: item.specs_vi || item.specs_vn || {},
    product_shipping: item.product_shipping || {},
    variants: item.variants || [],
  };
}

/* ========================= */
/* MERGE VARIANTS */
function mergeVariants(base, enriched = []) {
  if (!Array.isArray(base)) return [];
  return base.map((variant) => {
    const match = enriched.find((x) => x.variantId === variant.variantId);
    if (!match) return { ...variant, name_vi: variant.name_vi || null };
    return {
      ...variant,
      name_vi: match.name_vi || variant.name_vi || null,
      shipping: match.shipping || variant.shipping || null,
    };
  });
}

/* ========================= */
/* VALIDATE KẾT QUẢ DỊCH */
function isValidTranslation(cleaned) {
  if (!cleaned) return false;
  const emptyName = !cleaned.name_vi || !String(cleaned.name_vi).trim();
  const emptySpecs = !cleaned.specs_vi || Object.keys(cleaned.specs_vi).length === 0;
  return !emptyName && !emptySpecs;
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
    prompt: buildPrompt(job.data),
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
  if (!parsed || !isValidTranslation(cleaned)) {
    const reason = !parsed ? "parse_failed" : "empty_translation";
    console.log(`⚠️ FAILED [${reason}] → move to failed/`);

    const failedData = {
      ...job.data,
      translationStatus: "failed",
      translationError: reason,
      translatedAt: new Date().toISOString(),
    };

    try {
      // ✅ Ghi vào FAILED_DIR
      const failPath = path.join(FAILED_DIR, job.file);
      upsertJsonl(failPath, failedData.productId, failedData);
      console.log("📁 SAVED TO FAILED:", failPath);

      // ✅ Xóa khỏi INPUT
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
  /* ✅ PARSE OK + KẾT QUẢ HỢP LỆ */
  const finalData = {
    ...job.data,
    name_vi: cleaned.name_vi,
    specs_vi: cleaned.specs_vi,
    product_shipping: cleaned.product_shipping,
    variants: mergeVariants(job.data.variants, cleaned.variants),

    translationStatus: "done",
    translationError: null,
    translatedHash: job.data.hash,
    translatedAt: new Date().toISOString(),
  };

  try {
    // ✅ Ghi vào SUCCESS_DIR
    const successPath = path.join(SUCCESS_DIR, job.file);
    upsertJsonl(successPath, finalData.productId, finalData);
    console.log("💾 SAVED TO SUCCESS:", successPath);

    // ✅ Xóa khỏi INPUT
    removeFromInput(job.filePath, job.data.productId);

    job.status = "done";
    stats.processing--;
    stats.done++;

    saveCheckpoint();
  } catch (err) {
    console.log("❌ WRITE ERROR:", err.message);
    return res.json({ ok: false, error: "write_failed" });
  }

  console.log("✅ DONE:", id);
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