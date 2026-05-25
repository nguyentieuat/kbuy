// scripts/refill-failed-translations.js
"use strict";

/**
 * Mục tiêu:
 * -------------------------------------------------------
 * Đọc:
 * - folder dữ liệu KR gốc
 * - folder dữ liệu đã dịch
 *
 * Filter các product:
 * - name_vi rỗng
 * HOẶC
 * - specs_vi rỗng
 *
 * Sau đó:
 * - lấy lại dữ liệu KR gốc
 * - ghi sang folder fail để translate lại
 *
 * Đồng thời:
 * - remove dữ liệu lỗi khỏi success
 *
 * Kết quả:
 * success/ => chỉ chứa dữ liệu sạch
 * fail/    => chỉ chứa dữ liệu cần retry
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const fsExtra = require("fs-extra");

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────

const VI_DIR = path.resolve(
  __dirname,
  "../../data/split/priority",
);

const FAILED_DIR = path.resolve(__dirname, "../../data/split/failed");

fsExtra.ensureDirSync(FAILED_DIR);

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * đọc file jsonl
 */
async function readJsonl(filePath) {
  const rows = [];

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, "utf8"),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();

    if (!trimmed) continue;

    try {
      rows.push(JSON.parse(trimmed));
    } catch (err) {
      console.log(`❌ Invalid JSON in ${filePath}`);
    }
  }

  return rows;
}

/**
 * check object rỗng
 */
function isEmptyObject(obj) {
  if (!obj) return true;

  return typeof obj === "object" && Object.keys(obj).length === 0;
}

/**
 * xác định translation lỗi
 */
function isInvalidTranslation(product) {
  // Chưa có status hoặc failed
  if (!product.translationStatus || product.translationStatus === "failed") {
    return true;
  }

  // Status done nhưng kết quả rỗng
  if (product.translationStatus === "done") {
    const emptyName = !product.name_vi || !String(product.name_vi).trim();
    const emptySpecs = !product.specs_vi || isEmptyObject(product.specs_vi);
    return emptyName || emptySpecs;
  }

  // pending → cũng cần retry
  if (product.translationStatus === "pending") return true;

  return false;
}

/**
 * ghi file jsonl
 */
function writeJsonl(filePath, rows) {
  const content = rows.map((row) => JSON.stringify(row)).join("\n");

  fs.writeFileSync(filePath, content ? content + "\n" : "");
}

/**
 * remove các product đã success khỏi failed file
 */
async function cleanFailedFile(failPath, validProductIds) {
  // chưa có fail file
  if (!fs.existsSync(failPath)) {
    return;
  }

  const failRows = await readJsonl(failPath);

  // giữ lại những product chưa success
  const remainingRows = failRows.filter(
    (row) => !validProductIds.has(row.productId),
  );

  // rewrite fail file
  writeJsonl(failPath, remainingRows);

  console.log(`🧹 Cleaned failed file: ${remainingRows.length} remaining`);

  // nếu empty -> delete luôn
  if (!remainingRows.length) {
    fs.unlinkSync(failPath);

    console.log(`🗑 Deleted empty failed file`);
  }
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

async function main() {
  // lấy toàn bộ file translated
  const viFiles = fs.readdirSync(VI_DIR).filter((f) => f.endsWith(".jsonl"));

  console.log(`📁 Found ${viFiles.length} translated files`);

  // loop từng file
  for (const file of viFiles) {
    console.log(`\n📂 Processing ${file}`);

    const viPath = path.join(VI_DIR, file);

    // đọc dữ liệu
    const viRows = await readJsonl(viPath);

    // dữ liệu cần retry
    const failedRows = [];

    // dữ liệu success sạch
    const cleanedSuccessRows = [];

    // ─────────────────────────
    // FILTER
    // ─────────────────────────

    for (const viProduct of viRows) {
      const invalid = isInvalidTranslation(viProduct);

      // nếu valid -> giữ lại success
      if (!invalid) {
        cleanedSuccessRows.push(viProduct);

        continue;
      }

      // add vào fail
      failedRows.push(viProduct);

      console.log(`❌ Re-queue ${viProduct.productId}`);
    }

    // ─────────────────────────
    // REWRITE SUCCESS FILE
    // ─────────────────────────
    const validProductIds = new Set(cleanedSuccessRows.map((x) => x.productId));
    writeJsonl(viPath, cleanedSuccessRows);

    // clean failed file
    const failPath = path.join(FAILED_DIR, file);

    await cleanFailedFile(failPath, validProductIds);

    console.log(`🧹 Cleaned success file: ${cleanedSuccessRows.length} rows`);

    // ─────────────────────────
    // WRITE FAIL FILE
    // ─────────────────────────

    if (!failedRows.length) {
      console.log("✅ No failed rows");

      continue;
    }

    writeJsonl(failPath, failedRows);

    console.log(`💾 Saved ${failedRows.length} failed rows -> ${failPath}`);
  }

  console.log("\n🎉 DONE");
}

// ─────────────────────────────────────────────
// RUN
// ─────────────────────────────────────────────

main().catch((err) => {
  console.error(err);

  process.exit(1);
});
