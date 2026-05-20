const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const { buildPrompt } = require("./promptBuilder");
const { jsonrepair } = require("jsonrepair");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

/* ========================= */
/* LOG MIDDLEWARE */
app.use((req, res, next) => {
  console.log("\n➡️", req.method, req.url);
  next();
});

/* ========================= */
const INPUT_DIR = path.resolve(__dirname, "../../data/split/rest");
const OUTPUT_DIR = path.resolve(
  __dirname,
  "../../data/output_products_vi_gemini",
);
const CHECKPOINT_FILE = path.join(__dirname, "checkpoint.json");

const SUCCESS_DIR = path.join(OUTPUT_DIR, "success");

const FAILED_DIR = path.join(OUTPUT_DIR, "failed");

/* ========================= */
/* STATE */
let queue = [];
let stats = {
  total: 0,
  pending: 0,
  processing: 0,
  done: 0,
};

const processingMap = new Map();

/* ========================= */
/* UTIL */
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function upsertJsonl(filePath, productId, newData) {
  let rows = [];

  // đọc file cũ
  if (fs.existsSync(filePath)) {
    rows = fs
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

  // tìm existing
  const index = rows.findIndex((x) => x.productId === productId);

  // update hoặc insert
  if (index >= 0) {
    rows[index] = newData;
  } else {
    rows.push(newData);
  }

  // rewrite file
  fs.writeFileSync(
    filePath,
    rows.map((r) => JSON.stringify(r)).join("\n") + "\n",
  );
}

/* ========================= */
/* SUCCESS CACHE */
const successCache = new Map();

/**
 * load success products vào memory
 */
function loadSuccessCache() {
  if (!fs.existsSync(SUCCESS_DIR)) {
    return;
  }

  const files = fs.readdirSync(SUCCESS_DIR).filter((f) => f.endsWith(".jsonl"));

  for (const file of files) {
    const filePath = path.join(SUCCESS_DIR, file);

    const lines = fs
      .readFileSync(filePath, "utf-8")
      .split("\n")
      .filter(Boolean);

    for (const line of lines) {
      try {
        const json = JSON.parse(line);

        if (json.productId) {
          successCache.set(json.productId, json);
        }
      } catch {}
    }
  }

  console.log("✅ SUCCESS CACHE:", successCache.size);
}

/* ========================= */
/* SAFE PARSE GEMINI */
function safeJsonParse(str) {
  if (typeof str !== "string") {
    return str;
  }

  // remove markdown
  let cleaned = str
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .replace(/^JSON\s*:?/i, "")
    .replace(/^Result\s*:?/i, "")
    .trim();

  // extract JSON block
  const match = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);

  if (match) {
    cleaned = match[0];
  }

  // normal parse
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.log("⚠️ NORMAL JSON PARSE FAILED:", err.message);
  }

  // repair parse
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

  // Nếu là array thì lấy phần tử đầu tiên
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

    if (!match) {
      return {
        ...variant,
        name_vi: null,
        shipping: null,
      };
    }

    return {
      ...variant,

      // translated fields
      name_vi: match.name_vi || null,

      // shipping override
      shipping: match.shipping || null,
    };
  });
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

  for (const file of files) {
    const lines = fs
      .readFileSync(path.join(INPUT_DIR, file), "utf-8")
      .split("\n")
      .filter(Boolean);

    lines.forEach((line, index) => {
      queue.push({
        id: `${file}__${index}`,
        file,
        index,
        data: JSON.parse(line),
        status: "pending",
        startedAt: null,
        retries: 0,
      });
    });
  }

  stats.total = queue.length;
  stats.pending = queue.length;

  saveCheckpoint();

  console.log("📦 TOTAL:", queue.length);
}

/* ========================= */
/* GET JOB (LOCK SAFE + NO DUP) */
/* ========================= */
/* GET JOB */
app.get("/job/:workerId", (req, res) => {
  const workerId = req.params.workerId;

  while (true) {
    const job = queue.find((q) => q.status === "pending");

    if (!job) {
      return res.json(null);
    }

    const existing = successCache.get(job.data.productId);

    // nếu đã translate rồi
    if (existing) {
      console.log("♻️ SKIP GEMINI:", job.data.productId);

      // merge dữ liệu mới
      const merged = {
        ...job.data,

        // giữ translation cũ
        name_vi: existing.name_vi || job.data.name_vi,

        specs_vi: existing.specs_vi || job.data.specs_vi,

        product_shipping:
          existing.product_shipping || job.data.product_shipping,

        // merge variant
        variants: (job.data.variants || []).map((v) => {
          const oldVariant = (existing.variants || []).find(
            (x) => x.variantId === v.variantId,
          );

          return {
            ...v,

            // giữ translation cũ
            name_vi: oldVariant?.name_vi || v.name_vi || null,
          };
        }),
      };

      // update lại success file
      const successPath = path.join(SUCCESS_DIR, job.file);

      upsertJsonl(successPath, merged.productId, merged);

      job.status = "done";

      stats.pending--;
      stats.done++;

      saveCheckpoint();

      continue;
    }

    // chưa có -> gửi gemini
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
  }
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

  /* ========================= */
  /* ❌ PARSE FAIL */
  if (!parsed) {
    console.log("⚠️ PARSE FAILED → SAVE TO FAILED FOLDER");

    const failedData = {
      ...job.data,
      vi_raw_error: typeof result === "string" ? result.slice(0, 5000) : result,
      failed_reason: "parse_failed",
    };

    try {
      fs.mkdirSync(FAILED_DIR, { recursive: true });

      const failPath = path.join(FAILED_DIR, job.file);

      upsertJsonl(failPath, failedData.productId, failedData);

      console.log("📁 SAVED FAILED:", failPath);
    } catch (err) {
      console.log("❌ FAILED WRITE ERROR:", err.message);
    }

    job.status = "failed_parse";

    return res.json({ ok: false, error: "parse_failed" });
  }

  /* ========================= */
  /* ✅ PARSE OK */
  const cleaned = normalizeGeminiOutput(parsed);

  const finalData = {
    ...job.data,

    name_vi: cleaned.name_vi,
    specs_vi: cleaned.specs_vi,
    product_shipping: cleaned.product_shipping,

    variants: mergeVariants(job.data.variants, cleaned.variants),
  };

  try {
    fs.mkdirSync(SUCCESS_DIR, { recursive: true });

    const successPath = path.join(SUCCESS_DIR, job.file);

    upsertJsonl(successPath, finalData.productId, finalData);

    job.status = "done";

    console.log("💾 SAVED SUCCESS:", successPath);
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
/* INIT */

loadSuccessCache();

if (!loadCheckpoint()) {
  loadQueue();
}

app.listen(3100, () => {
  console.log("🚀 SERVER RUNNING :3100");
});
