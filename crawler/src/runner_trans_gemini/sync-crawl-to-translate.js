// scripts/sync-crawl-to-translate.js
"use strict";

/**
 * Chạy sau khi crawl xong, trước khi translate
 * -------------------------------------------------------
 * So sánh output crawl mới với translate/success:
 *
 * TH1: Tồn tại trong success + hash KHÔNG đổi
 *   → bỏ qua
 *
 * TH2: Tồn tại trong success + hash ĐỔI
 *   → cập nhật lại data KR mới vào success
 *   → reset translationStatus = "pending" nếu productChanged
 *   → giữ nguyên name_vi, specs_vi cũ nếu chỉ variant/image đổi
 *
 * TH3: Không tồn tại trong success
 *   → copy sang INPUT_DIR để translate
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const fsExtra = require("fs-extra");

// ─────────────────────────────────────────────
// CONFIG — điều chỉnh theo từng source
// ─────────────────────────────────────────────

const SOURCE = process.argv[2] || "geng"; // oliveyoung | musinsa | t1

const CRAWL_DIR = path.resolve(__dirname, `../../data/output_products/${SOURCE}`);
const SUCCESS_DIR = path.resolve(
  __dirname,
  `../../data/translate/${SOURCE}/success`,
);
const INPUT_DIR = path.resolve(__dirname, `../../data/output_products/${SOURCE}`); // translate server đọc từ đây

fsExtra.ensureDirSync(SUCCESS_DIR);

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

async function readJsonl(filePath) {
  const rows = [];
  if (!fs.existsSync(filePath)) return rows;

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, "utf8"),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      rows.push(JSON.parse(trimmed));
    } catch { }
  }

  return rows;
}

function writeJsonl(filePath, rows) {
  if (!rows?.length) return;

  const content = rows.map((r) => JSON.stringify(r)).join("\n");

  fs.writeFileSync(filePath, content + "\n");
}

function isEmptyObject(obj) {
  return !obj || (typeof obj === "object" && Object.keys(obj).length === 0);
}

function isValidTranslation(product) {
  const hasName = product.name_vi && String(product.name_vi).trim();
  const hasSpecs = !isEmptyObject(product.specs_vi);
  return hasName && hasSpecs;
}

// So sánh hash variants
function getChangedVariants(oldVariants = [], newVariants = []) {
  const changed = [];

  for (const nv of newVariants) {
    const ov = oldVariants.find((v) => v.variantId === nv.variantId);
    if (!ov || ov.hash !== nv.hash) {
      changed.push(nv.variantId);
    }
  }

  return changed;
}

function mergeCrawlerData(
  existing,
  crawled,
  translationChanged = false
) {
  const {
    translationStatus,
    translationError,
    translatedHash,
    translatedAt,
    name_vi,
    specs_vi,
    ...crawlerData
  } = crawled;

  return {
    ...existing,
    ...crawlerData,

    name_vi: existing.name_vi,
    specs_vi: existing.specs_vi,

    translationStatus:
      translationChanged
        ? "needs_retranslate"
        : existing.translationStatus,

    translatedHash: existing.translatedHash,
    translatedAt: existing.translatedAt,
    translationError: null,
  };
}

const crypto = require("crypto");

function md5(str) {
  return crypto
    .createHash("md5")
    .update(str)
    .digest("hex");
}

function buildTranslationHash(product) {
  return md5(
    JSON.stringify({
      name: product.name,
      specs: product.specs,
    }),
  );
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

async function main() {
  console.log(`\n🚀 SYNC CRAWL → TRANSLATE [${SOURCE}]\n`);

  const crawlFiles = fs
    .readdirSync(CRAWL_DIR)
    .filter((f) => f.endsWith(".jsonl"));
  console.log(`📁 Found ${crawlFiles.length} crawl files`);

  const stats = {
    unchanged: 0, // hash không đổi → bỏ qua
    updatedKr: 0, // hash đổi → update KR, giữ VI
    resetPending: 0, // product hash đổi → cần dịch lại
    newProduct: 0, // chưa có trong success → mang đi dịch
  };

  for (const file of crawlFiles) {
    const crawlPath = path.join(CRAWL_DIR, file);
    const successPath = path.join(SUCCESS_DIR, file);

    console.log(`\n📂 ${file}`);

    const crawlRows = await readJsonl(crawlPath);
    const successRows = await readJsonl(successPath);

    // Map success theo productId
    const successMap = new Map(successRows.map((r) => [r.productId, r]));

    const updatedSuccessRows = [...successRows]; // sẽ update in-place
    const newToTranslate = []; // sản phẩm chưa có trong success

    for (const crawled of crawlRows) {
      const { productId, image_hash, variants = [] } = crawled;
      const existing = successMap.get(productId);

      // ── TH1: Chưa có trong success ──────────────────
      if (!existing) {
        newToTranslate.push({
          ...crawled,
          translationStatus: "pending",
          translationError: null,
          translatedHash: null,
          translatedAt: null,
        });
        stats.newProduct++;
        console.log(`  🆕 NEW: ${productId}`);
        continue;
      }

      // ── TH2: Đã có → so sánh hash ───────────────────
      const translationChanged =
        buildTranslationHash(existing) !==
        buildTranslationHash(crawled);
      const imageChanged = existing.image_hash !== image_hash;
      const changedVariants = getChangedVariants(
        existing.variants || [],
        variants,
      );
      const anyVariantChanged = changedVariants.length > 0;

      if (
        !translationChanged &&
        !imageChanged &&
        !anyVariantChanged
      ) {
        stats.unchanged++;
        continue;
      }

      console.log(
        `  🔄 CHANGED: ${productId} | product=${translationChanged} image=${imageChanged} variants=${changedVariants.length}`,
      );

      // Merge: giữ data VI cũ, cập nhật KR mới
      const updatedRow =
        mergeCrawlerData(existing, crawled, translationChanged);

      // Update trong successRows
      const idx = updatedSuccessRows.findIndex(
        (r) => r.productId === productId,
      );
      if (idx >= 0) {
        updatedSuccessRows[idx] = updatedRow;
      } else {
        updatedSuccessRows.push(updatedRow);
      }

      if (translationChanged) {
        stats.resetPending++;
        console.log(`    ↩️ Reset to pending (product content changed)`);
      } else {
        stats.updatedKr++;
        console.log(`    ✏️ Updated KR data (kept VI translation)`);
      }
    }

    // Ghi lại success file đã update
    if (newToTranslate.length) {
      updatedSuccessRows.push(...newToTranslate);
    }

    // Ghi lại success file đã update
    writeJsonl(successPath, updatedSuccessRows);

    // Ghi sản phẩm mới vào crawl file với translationStatus = pending
    // (translate server đọc từ INPUT_DIR và check needsTranslation)
    if (newToTranslate.length) {
      // Ghi thêm vào file crawl gốc với status pending
      const allCrawlRows = await readJsonl(crawlPath);
      const crawlMap = new Map(allCrawlRows.map((r) => [r.productId, r]));

      for (const r of newToTranslate) {
        crawlMap.set(r.productId, r);
      }

      writeJsonl(crawlPath, [...crawlMap.values()]);
      console.log(
        `  💾 ${newToTranslate.length} new products ready for translation`,
      );
    }

    // Với product đã reset pending — cũng update trong crawl file
    const resetIds = new Set();
    for (const row of updatedSuccessRows) {
      if (
        row.translationStatus === "pending" ||
        row.translationStatus === "needs_retranslate"
      ) {
        resetIds.add(row.productId);
      }
    }

    if (resetIds.size > 0) {
      const allCrawlRows = await readJsonl(crawlPath);
      const updated = allCrawlRows.map((r) => {
        if (!resetIds.has(r.productId)) return r;
        return {
          ...r,
          translationStatus: "pending",
          translationError: null,
          translatedHash: null,
          translatedAt: null,
        };
      });
      writeJsonl(crawlPath, updated);
    }

    console.log(
      `  📊 unchanged=${crawlRows.length - newToTranslate.length - stats.resetPending - stats.updatedKr} | updatedKr=${stats.updatedKr} | resetPending=${stats.resetPending} | new=${newToTranslate.length}`,
    );
  }

  console.log("\n" + "═".repeat(50));
  console.log("🎉 SYNC DONE");
  console.log(`  Unchanged:    ${stats.unchanged}`);
  console.log(`  ✏️  Updated KR:   ${stats.updatedKr}`);
  console.log(`  ↩️  Reset pending: ${stats.resetPending}`);
  console.log(`  🆕 New products: ${stats.newProduct}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
