// scripts/import-products.js
"use strict";

require("dotenv").config();
const knex = require("knex")(require("../config/knexfile"));
const fs = require("fs");
const path = require("path");
const readline = require("readline");

// ─────────────────────────────────────────────────────────────────────────────
// MODE — detect from CLI args
// --mode=full  : translate specs + upsert all fields (first run / manual refresh)
// --mode=price : batch update price + soldout only, full insert for new products
//
// Usage:
//   node scripts/import-products.js --mode=full
//   node scripts/import-products.js --mode=price
// ─────────────────────────────────────────────────────────────────────────────

const args         = process.argv.slice(2);
const MODE         = args.find((a) => a.startsWith("--mode="))?.split("=")[1] ?? "full";
const IS_PRICE_MODE = MODE === "price";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const KR_DIR    = path.resolve(__dirname, "../data/output_products_newest");
const VI_DIR    = path.resolve(__dirname, "../data/output_products_vi");
const DICT_PATH = path.resolve(__dirname, "../data/dict_vi.json");

const GEMINI_MODEL          = "gemini-2.5-flash";
const MAX_TRANSLATE_RETRIES = 2;   // max retry attempts if Korean still remains
const PRICE_BATCH_SIZE      = 100; // products per batch UPDATE transaction

// ─────────────────────────────────────────────────────────────────────────────
// GEMINI KEY MANAGER — round-robin + fallback on error
// ─────────────────────────────────────────────────────────────────────────────

const API_KEYS = process.env.GEMINI_KEYS.split(",")
  .map((k) => k.trim())
  .filter(Boolean);

if (!API_KEYS.length) {
  console.warn("⚠️  No GEMINI_KEYS found in .env, translation will be skipped");
}

const RETRYABLE_STATUSES = new Set([401, 403, 429, 500, 503, 504]);

let keyIndex = 0;

function getNextKey() {
  const key = API_KEYS[keyIndex % API_KEYS.length];
  keyIndex++;
  return key;
}

// ─────────────────────────────────────────────────────────────────────────────
// DICT — load once, reuse throughout
// ─────────────────────────────────────────────────────────────────────────────

let DICT = {};
if (fs.existsSync(DICT_PATH)) {
  DICT = JSON.parse(fs.readFileSync(DICT_PATH, "utf-8"));
  console.log(`📖 Dict loaded: ${Object.keys(DICT).length} entries`);
}

function dictNormalize(text) {
  return text?.toLowerCase().trim().replace(/\s+/g, " ") ?? "";
}

function saveDict() {
  fs.writeFileSync(DICT_PATH, JSON.stringify(DICT, null, 2));
}

// ─────────────────────────────────────────────────────────────────────────────
// KOREAN DETECTION
// ─────────────────────────────────────────────────────────────────────────────

function hasKorean(text) {
  if (!text || typeof text !== "string") return false;
  return /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(text);
}

// ─────────────────────────────────────────────────────────────────────────────
// KOREAN ABBREVIATION NORMALIZER
// Replace common Korean legal/company suffixes before translation check
// so entries like "(주)Mandom" are normalized without calling Gemini
// ─────────────────────────────────────────────────────────────────────────────

const KR_ABBREVIATIONS = {
  "(주)": "Co., Ltd. ", // 주식회사 — stock company
  "(유)": "LLC. ",      // 유한회사 — limited liability company
  "(재)": "Foundation ",// 재단법인 — foundation
  "(사)": "Assoc. ",    // 사단법인 — association
};

function normalizeKrAbbreviations(text) {
  if (!text || typeof text !== "string") return text;
  let result = text;
  for (const [kr, replacement] of Object.entries(KR_ABBREVIATIONS)) {
    result = result.replaceAll(kr, replacement);
  }
  return result.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSLATION FILTER
// Skip entries that are purely numeric, units, phone numbers, URLs, etc.
// Only send to Gemini if text actually contains meaningful Korean content
// ─────────────────────────────────────────────────────────────────────────────

const SKIP_PATTERNS = [
  /^\d+(\.\d+)?\s*(ml|g|mg|kg|l|oz|fl\.oz|mm|cm|%|원|₩)?$/i, // number + unit: 150ml, 50g
  /^\+?[\d\s\-().]{7,}$/,                                      // phone: 01012345678, (02)1234-5678
  /^https?:\/\//i,                                             // URL
  /^[\w._%+\-]+@[\w.\-]+\.[a-z]{2,}$/i,                      // email
  /^[A-Z0-9\-/]+$/,                                           // product code: ABC-123
];

function needsTranslation(text) {
  if (!text || typeof text !== "string") return false;
  const t = text.trim();
  if (!hasKorean(t)) return false;
  if (SKIP_PATTERNS.some((re) => re.test(t))) return false;
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSLATION VALIDATOR
// Reject translation result if it still contains Korean or is unchanged
// ─────────────────────────────────────────────────────────────────────────────

function isValidTranslation(original, translated) {
  if (!translated || typeof translated !== "string") return false;
  if (translated.trim() === original.trim())         return false; // unchanged
  if (hasKorean(translated))                         return false; // still has Korean
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTRACT SPECS ENTRIES THAT NEED TRANSLATION
// ─────────────────────────────────────────────────────────────────────────────

function extractKoreanFromSpecs(specs) {
  const items = [];
  for (const [k, v] of Object.entries(specs ?? {})) {
    if (needsTranslation(k))          items.push({ id: `key_${k}`, text: k });
    const vStr = String(v ?? "");
    if (needsTranslation(vStr))       items.push({ id: `val_${k}`, text: vStr });
  }
  return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// GEMINI TRANSLATE
// ─────────────────────────────────────────────────────────────────────────────

function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("Gemini returned invalid JSON");
    return JSON.parse(match[0]);
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function translateBatch(items) {
  if (!items.length) return [];
  if (!API_KEYS.length) throw new Error("No GEMINI_KEYS configured");

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
- Giữ nguyên tên các hợp chất hóa học bằng tiếng Anh (ví dụ: Glycerin, Niacinamide)
- Chỉ dịch tên các chiết xuất tự nhiên sang tiếng Việt
- Đối với các trường có nội dung dài như 'Lưu ý khi sử dụng' và 'Hướng dẫn sử dụng':
    Phân tích cấu trúc và nhận diện các thành phần có tính liệt kê.
    Trình bày lại dưới dạng Markdown có phân cấp:
    Các mục lớn bắt đầu bằng 1., 2., 3.
    Các mục con thụt lề và bắt đầu bằng dấu gạch ngang -.

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

  const triedKeys = new Set();

  while (triedKeys.size < API_KEYS.length) {
    const key = getNextKey();
    if (triedKeys.has(key)) continue;
    triedKeys.add(key);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error(`\n❌ Gemini API error:`);
        console.error(`   - Status : ${res.status} ${res.statusText}`);
        console.error(`   - Body   : ${JSON.stringify(errorData, null, 2)}`);
        console.error(`   - Key    : ...${key.slice(-6)}`);

        if (RETRYABLE_STATUSES.has(res.status)) {
          console.warn(`⚠️  Key ...${key.slice(-6)} hit ${res.status}, waiting 20s then switching key...`);
          await sleep(20000);
          continue;
        }
        throw new Error(`Fatal Gemini error, stopping: ${res.status}`);
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Gemini returned empty content");

      return safeParse(text);
    } catch (err) {
      if (triedKeys.size < API_KEYS.length) {
        console.warn(`  ⚠️  Key ...${key.slice(-6)} failed: ${err.message}, trying next key...`);
        continue;
      }
      throw err;
    }
  }

  throw new Error("All GEMINI_KEYS failed, cannot translate this batch");
}

// ─────────────────────────────────────────────────────────────────────────────
// ENSURE SPECS VI
// Normalize abbreviations → filter entries that need translation →
// hit dict cache → call Gemini for remaining → retry if Korean still remains
// ─────────────────────────────────────────────────────────────────────────────

async function ensureSpecsVi(specsVi, attempt = 1) {
  if (!specsVi || !Object.keys(specsVi).length) return specsVi ?? {};

  // Step 1: normalize Korean abbreviations — may eliminate some entries
  const normalizedSpecs = {};
  for (const [k, v] of Object.entries(specsVi)) {
    normalizedSpecs[normalizeKrAbbreviations(k)] = normalizeKrAbbreviations(String(v ?? ""));
  }

  const koreanItems = extractKoreanFromSpecs(normalizedSpecs);
  if (!koreanItems.length) return normalizedSpecs; // clean after normalization

  console.log(`   [attempt ${attempt}/${MAX_TRANSLATE_RETRIES}] ${koreanItems.length} entries need translation`);

  const translationMap = new Map();
  const needApi        = [];

  // Step 2: check dict cache — reject cached entries that still have Korean
  for (const item of koreanItems) {
    const dictKey = dictNormalize(item.text);

    if (DICT[dictKey]) {
      if (hasKorean(DICT[dictKey])) {
        // Cached translation is bad — remove and re-translate
        console.warn(`   ⚠️  removing invalid dict entry: "${item.text.slice(0, 40)}"`);
        delete DICT[dictKey];
        needApi.push(item);
      } else {
        translationMap.set(item.id, DICT[dictKey]);
      }
    } else {
      needApi.push(item);
    }
  }

  // Step 3: call Gemini for entries not in dict
  if (needApi.length) {
    if (!API_KEYS.length) {
      console.warn("  ⚠️  No GEMINI_KEYS, skipping translation");
    } else {
      const results = await translateBatch(needApi);
      let dictUpdated = false;

      results.forEach((r, i) => {
        const original = needApi[i];
        if (!original || !r?.text) return;

        // Reject if translation still has Korean or is unchanged
        if (!isValidTranslation(original.text, r.text)) {
          console.warn(`   ⚠️  rejected translation for: "${original.text.slice(0, 40)}"`);
          return; // leave as-is, may retry in next attempt
        }

        translationMap.set(original.id, r.text);

        // Cache into dict only if: short text, no newlines, valid translation
        const shouldCache =
          original.text.length < 500      &&
          !original.text.includes("\n")   &&
          isValidTranslation(original.text, r.text);

        if (shouldCache) {
          DICT[dictNormalize(original.text)] = r.text;
          dictUpdated = true;
        }
      });

      if (dictUpdated) saveDict();
    }
  }

  // Step 4: apply translations to normalized specs
  const newSpecs = {};
  for (const [k, v] of Object.entries(normalizedSpecs)) {
    const newKey = normalizeKrAbbreviations(translationMap.get(`key_${k}`) ?? k);
    const newVal = normalizeKrAbbreviations(translationMap.get(`val_${k}`) ?? String(v));
    newSpecs[newKey] = newVal;
  }

  // Step 5: retry if Korean still remains
  const remaining = extractKoreanFromSpecs(newSpecs);

  if (remaining.length > 0 && attempt < MAX_TRANSLATE_RETRIES) {
    console.warn(`   ⚠️  ${remaining.length} entries still in Korean, retrying...`);
    return ensureSpecsVi(newSpecs, attempt + 1);
  }

  if (remaining.length > 0) {
    console.warn(`   ⚠️  gave up after ${attempt} attempts, ${remaining.length} entries still in Korean`);
  }

  return newSpecs;
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH VI FILE — rewrite specs for a single productId in the VI JSONL file
// ─────────────────────────────────────────────────────────────────────────────

async function patchViFile(viFilePath, productId, patchedSpecs) {
  if (!fs.existsSync(viFilePath)) return;

  const lines   = fs.readFileSync(viFilePath, "utf-8").split("\n");
  let   changed = false;

  const newLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    try {
      const obj = JSON.parse(trimmed);
      if (obj.productId !== productId) return line;
      obj.specs = patchedSpecs;
      changed   = true;
      return JSON.stringify(obj);
    } catch {
      return line;
    }
  });

  if (changed) {
    fs.writeFileSync(viFilePath, newLines.join("\n"), "utf-8");
    console.log(`   💾 VI file patched: ${productId}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function parsePrice(str) {
  if (!str) return null;
  const num = parseInt(str.replace(/[^0-9]/g, ""), 10);
  return isNaN(num) ? null : num;
}

function generateSlug(name, productId) {
  if (!name) return productId.toLowerCase();
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 180);
  return `${base}-${productId.toLowerCase()}`;
}

function normalizeImagePath(rawPath) {
  if (!rawPath) return null;

  let p = rawPath.replace(/\\/g, "/");

  // Match phần từ image... trở đi
  const match = p.match(/(image[^/]*\/.+)$/);
  if (!match) return p;

  let result = match[1]; // vd: image_newest/xxx.jpg

  // Đảm bảo luôn có prefix data/
  if (!result.startsWith("data/")) {
    result = `data/${result}`;
  }

  return result;
}

function parseCategoryFromFilename(filename) {
  const base  = path.basename(filename, ".jsonl").replace(/_vi$/, "");
  const match = base.match(/^(.+)_(\d+)$/);
  if (!match) return { categorySlug: base, categoryId: null };
  return {
    categorySlug: match[1],
    categoryId:   parseInt(match[2], 10),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// READ JSONL FILE → Map<productId, object>
// ─────────────────────────────────────────────────────────────────────────────

async function readJsonlToMap(filePath) {
  const map = new Map();
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠️  File not found: ${filePath}`);
    return map;
  }

  const rl = readline.createInterface({
    input:     fs.createReadStream(filePath, "utf-8"),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const obj = JSON.parse(trimmed);
      if (obj.productId) map.set(obj.productId, obj);
    } catch {
      console.warn(`  ⚠️  Invalid JSON line: ${trimmed.slice(0, 80)}...`);
    }
  }

  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIC TỰ ĐỘNG HÓA (AUTO-CLASSIFICATION)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tự động xác định sản phẩm Nổi bật (Featured)
 * Dựa trên Flags của Olive Young và chỉ số Rating
 */
function determineIfFeatured(krDoc) {
  const flags = krDoc.source_flags || [];
  const ratingAvg = krDoc.source_rating_avg || 0;
  const ratingCount = krDoc.source_rating_count || 0;

  // 1. Nếu Olive Young gắn tag BEST -> Chắc chắn Nổi bật
  if (flags.includes("BEST")) return true;

  // 2. Nếu điểm đánh giá cao và có lượng review đủ lớn
  if (ratingAvg >= 4.7 && ratingCount >= 1000) return true;

  return false;
}

/**
 * Tính giá thấp nhất từ các biến thể hoặc giá gốc
 */
function calculateMinPrice(krDoc) {
  if (krDoc.variants && krDoc.variants.length > 0) {
    const prices = krDoc.variants
      .map((v) => v.price?.sale)
      .filter((p) => p !== null && p !== undefined);
    return prices.length > 0 ? Math.min(...prices) : 0;
  }
  return krDoc.price?.sale ? parseInt(String(krDoc.price.sale).replace(/[^\d]/g, "")) : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// UPSERT 1 PRODUCT — full mode or new product in price mode
// ─────────────────────────────────────────────────────────────────────────────

async function saveProduct(trx, krDoc, viDoc, categoryId, specsVi) {
  const variants        = krDoc.variants ?? [];
  const salePrices      = variants.map((v) => v.price?.sale).filter(Boolean);
  const priceMin        = salePrices.length ? Math.min(...salePrices) : null;
  const priceMax        = salePrices.length ? Math.max(...salePrices) : null;
  const discountPercent = variants[0]?.price?.discount ?? null;

  const isFeatured = determineIfFeatured(krDoc);
  
  // Thiết lập thời hạn "Hàng mới" trong 14 ngày cho sản phẩm mới hoàn toàn
  const newArrivalUntil = new Date();
  newArrivalUntil.setDate(newArrivalUntil.getDate() + 14);

  const originalPrice =
    parsePrice(viDoc?.price?.original) ??
    parsePrice(krDoc?.price?.original) ??
    (priceMin && discountPercent
      ? Math.round(priceMin / (1 - discountPercent / 100))
      : null);

      console.log(krDoc.productId, krDoc.source_rating_avg, krDoc.source_rating_count);
  // Upsert product — always merge extra_data to keep specs_vi up to date
  const [{ id: productId }] = await trx("products")
    .insert({
      external_id:         krDoc.productId,
      source:              "oliveyoung",
      slug:                generateSlug(viDoc?.name ?? krDoc.name, krDoc.productId),
      name_kr:             krDoc.name                  ?? null,
      name_vi:             viDoc?.name                 ?? null,
      price_min:           priceMin,
      price_max:           priceMax,
      original_price:      originalPrice,
      currency:            "KRW",
      discount_percent:    discountPercent,
      product_url:         krDoc.url                   ?? null,
      category_id:         categoryId,
      extra_data:          JSON.stringify({
        specs_kr: krDoc.specs ?? {},
        specs_vi: specsVi,
      }),
      source_rating_avg:   krDoc.source_rating_avg     ?? null,
      source_rating_count: krDoc.source_rating_count   ?? 0,
      is_featured:         isFeatured,
      new_arrival_until:   newArrivalUntil,
      is_active:           true,
      is_deleted:          false,
    })
    .onConflict("external_id")
    .merge([
      "name_kr",
      "name_vi",
      "slug",
      "price_min",
      "price_max",
      "original_price",
      "discount_percent",
      "category_id",
      "extra_data",           // always update translated specs
      "source_rating_avg",    // always update rating from latest crawl
      "source_rating_count",
      "is_active",
      "updated_at",
      "is_featured",
      "new_arrival_until"
    ])
    .returning("id");

  // Product images — replace all on each import
  if (krDoc.images?.length) {
    await trx("product_images").where("product_id", productId).delete();

    const imageRows = krDoc.images.map((localPath, idx) => ({
      product_id: productId,
      url:        normalizeImagePath(localPath),
      is_primary: idx === 0,
      sort_order: idx,
    }));

    await trx("product_images").insert(imageRows);
  }

  // Variants — upsert each by sku
  if (variants.length) {
    const viVariantMap = Object.fromEntries(
      (viDoc?.variants ?? []).map((v) => [v.variantId, v]),
    );

    for (const v of variants) {
      const viVariant = viVariantMap[v.variantId] ?? {};

      await trx("product_variants")
        .insert({
          product_id:       productId,
          sku:              v.variantId,
          name_kr:          v.name_kr                               ?? null,
          name_vi:          viVariant.name                          ?? null,
          price:            v.price?.sale                           ?? null,
          original_price:   originalPrice,
          discount_percent: v.price?.discount                       ?? null,
          image_url:        normalizeImagePath(viVariant.thumbnail  ?? null),
          is_soldout:       v.is_soldout                            ?? false,
          attributes:       JSON.stringify({ flags: v.flags        ?? [] }),
          is_active:        true,
        })
        .onConflict("sku")
        .merge([
          "name_kr",
          "name_vi",
          "price",
          "original_price",
          "discount_percent",
          "image_url",
          "is_soldout",
          "attributes",
          "updated_at",
        ]);
    }
  }

  return productId;
}

// ─────────────────────────────────────────────────────────────────────────────
// BATCH PRICE UPDATE — price mode only
// Groups all existing products into chunks, executes 1 transaction per chunk
// Much faster than individual transactions per product
// ─────────────────────────────────────────────────────────────────────────────

async function batchUpdatePrices(krDocs) {
  if (!krDocs.length) return;

  // Pre-compute price values for each product
  const productUpdates = krDocs.map((krDoc) => {
    const variants    = krDoc.variants ?? [];
    const salePrices  = variants.map((v) => v.price?.sale).filter(Boolean);
    return {
      external_id:      krDoc.productId,
      price_min:        salePrices.length ? Math.min(...salePrices) : null,
      price_max:        salePrices.length ? Math.max(...salePrices) : null,
      discount_percent: variants[0]?.price?.discount ?? null,
    };
  });

  // Pre-compute variant updates
  const variantUpdates = krDocs.flatMap((krDoc) =>
    (krDoc.variants ?? []).map((v) => ({
      sku:              v.variantId,
      price:            v.price?.sale     ?? null,
      discount_percent: v.price?.discount ?? null,
      is_soldout:       v.is_soldout      ?? false,
    }))
  );

  await knex.transaction(async (trx) => {
    // Batch update products — build CASE WHEN for all rows in 1 query
    if (productUpdates.length) {
      const bindings = {};
      const caseMin  = productUpdates.map((p, i) => {
        bindings[`eid_${i}`]  = p.external_id;
        bindings[`pmin_${i}`] = p.price_min;
        bindings[`pmax_${i}`] = p.price_max;
        bindings[`disc_${i}`] = p.discount_percent;
        return `WHEN :eid_${i} THEN :pmin_${i}`;
      }).join(" ");
      const caseMax  = productUpdates.map((_, i) => `WHEN :eid_${i} THEN :pmax_${i}`).join(" ");
      const caseDisc = productUpdates.map((_, i) => `WHEN :eid_${i} THEN :disc_${i}`).join(" ");
      const eids     = productUpdates.map((_, i) => `:eid_${i}`).join(", ");

      await trx.raw(`
        UPDATE products SET
          price_min        = CASE external_id ${caseMin}  END,
          price_max        = CASE external_id ${caseMax}  END,
          discount_percent = CASE external_id ${caseDisc} END,
          updated_at       = NOW()
        WHERE external_id IN (${eids})
      `, bindings);
    }

    // Batch update variants — build CASE WHEN for all variants in 1 query
    if (variantUpdates.length) {
      const vBindings  = {};
      const casePrice  = variantUpdates.map((v, i) => {
        vBindings[`sku_${i}`]   = v.sku;
        vBindings[`price_${i}`] = v.price;
        vBindings[`disc_${i}`]  = v.discount_percent;
        vBindings[`sold_${i}`]  = v.is_soldout;
        return `WHEN :sku_${i} THEN :price_${i}`;
      }).join(" ");
      const caseDisc  = variantUpdates.map((_, i) => `WHEN :sku_${i} THEN :disc_${i}`).join(" ");
      const caseSold  = variantUpdates.map((_, i) => `WHEN :sku_${i} THEN :sold_${i}`).join(" ");
      const skus      = variantUpdates.map((_, i) => `:sku_${i}`).join(", ");

      await trx.raw(`
        UPDATE product_variants SET
          price            = CASE sku ${casePrice} END,
          discount_percent = CASE sku ${caseDisc}  END,
          is_soldout       = CASE sku ${caseSold}  END,
          updated_at       = NOW()
        WHERE sku IN (${skus})
      `, vBindings);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL INSERT for new product in price mode
// Handles translation and full saveProduct call
// ─────────────────────────────────────────────────────────────────────────────

async function insertNewProduct(krDoc, viDoc, categoryId, viFilePath) {
  const rawSpecsVi    = viDoc?.specs ?? {};
  const koreanEntries = extractKoreanFromSpecs(rawSpecsVi);
  let   specsVi       = rawSpecsVi;

  if (koreanEntries.length > 0) {
    console.log(`   🔄 ${krDoc.productId}: translating ${koreanEntries.length} Korean entries...`);
    specsVi = await ensureSpecsVi(rawSpecsVi);
    await patchViFile(viFilePath, krDoc.productId, specsVi);
  }

  await knex.transaction((trx) =>
    saveProduct(trx, krDoc, viDoc, categoryId, specsVi)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCESS ONE KR + VI FILE PAIR
// ─────────────────────────────────────────────────────────────────────────────

async function importFilePair(krFilePath, viFilePath) {
  const { categoryId, categorySlug } = parseCategoryFromFilename(krFilePath);

  console.log(`\n📂 ${path.basename(krFilePath)}  (category: ${categorySlug}, id: ${categoryId})`);

  const [krMap, viMap] = await Promise.all([
    readJsonlToMap(krFilePath),
    readJsonlToMap(viFilePath),
  ]);

  console.log(`   KR: ${krMap.size} products | VI: ${viMap.size} products`);

  const stats = { success: 0, failed: 0, noVi: 0, translated: 0, newProduct: 0 };

  // ── PRICE MODE ─────────────────────────────────────────────────────────────
  if (IS_PRICE_MODE) {

    // 1 query to preload all existing external_ids from DB for this file
    const rows = await knex("products")
      .whereIn("external_id", [...krMap.keys()])
      .select("external_id");
    const existingIds = new Set(rows.map((r) => r.external_id));

    console.log(`   DB: ${existingIds.size} existing | 🆕 ${krMap.size - existingIds.size} new`);

    // Separate into existing (batch price update) vs new (full insert)
    const existingDocs = [];
    const newEntries   = [];

    for (const [productId, krDoc] of krMap) {
      if (existingIds.has(productId)) {
        existingDocs.push(krDoc);
      } else {
        newEntries.push({ productId, krDoc, viDoc: viMap.get(productId) ?? null });
      }
    }

    // Batch update existing products in chunks — 1 transaction per chunk
    const batches = chunk(existingDocs, PRICE_BATCH_SIZE);

    for (let i = 0; i < batches.length; i++) {
      try {
        await batchUpdatePrices(batches[i]);
        stats.success += batches[i].length;
        console.log(`   💰 price batch ${i + 1}/${batches.length}: ${batches[i].length} updated`);
      } catch (err) {
        stats.failed += batches[i].length;
        console.error(`   ❌ price batch ${i + 1} failed: ${err.message}`);
      }
    }

    // Full insert for new products found during price mode run
    for (const { productId, krDoc, viDoc } of newEntries) {
      if (!viDoc) stats.noVi++;
      stats.newProduct++;

      try {
        console.log(`   🆕 ${productId}: new product detected, running full insert...`);
        await insertNewProduct(krDoc, viDoc, categoryId, viFilePath);
        stats.success++;
      } catch (err) {
        stats.failed++;
        console.error(`   ❌ ${productId}: ${err.message}`);
      }
    }

    console.log(
      `   ✅ ${stats.success} updated | 🆕 ${stats.newProduct} new | ❌ ${stats.failed} errors | ⚠️  ${stats.noVi} missing VI`
    );

  // ── FULL MODE ──────────────────────────────────────────────────────────────
  } else {

    for (const [productId, krDoc] of krMap) {
      const viDoc = viMap.get(productId) ?? null;
      if (!viDoc) stats.noVi++;

      try {
        const rawSpecsVi    = viDoc?.specs ?? {};
        const koreanEntries = extractKoreanFromSpecs(rawSpecsVi);
        let   specsVi       = rawSpecsVi;

        if (koreanEntries.length > 0) {
          console.log(`   🔄 ${productId}: ${koreanEntries.length} entries still in Korean, translating...`);
          specsVi = await ensureSpecsVi(rawSpecsVi);
          stats.translated++;
          await patchViFile(viFilePath, productId, specsVi);
        }

        await knex.transaction((trx) =>
          saveProduct(trx, krDoc, viDoc, categoryId, specsVi)
        );
        stats.success++;
      } catch (err) {
        stats.failed++;
        console.error(`   ❌ ${productId}: ${err.message}`);
      }
    }

    console.log(
      `   ✅ ${stats.success} OK | ❌ ${stats.failed} errors | ⚠️  ${stats.noVi} missing VI | 🔄 ${stats.translated} translated`
    );
  }

  return stats;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function importAll() {
  const startTime = Date.now();

  console.log("🚀 Starting import...");
  console.log(`   Mode   : ${MODE.toUpperCase()}`);
  console.log(`   KR dir : ${KR_DIR}`);
  console.log(`   VI dir : ${VI_DIR}`);
  console.log(`   Dict   : ${DICT_PATH}\n`);

  if (!fs.existsSync(KR_DIR)) {
    console.error(`💥 KR directory not found: ${KR_DIR}`);
    process.exit(1);
  }

  const krFiles = fs
    .readdirSync(KR_DIR)
    .filter((f) => f.endsWith(".jsonl"))
    .sort();

  if (!krFiles.length) {
    console.warn("⚠️  No .jsonl files found in KR directory");
    process.exit(0);
  }

  const total = { success: 0, failed: 0, noVi: 0, translated: 0, newProduct: 0 };

  for (const krFile of krFiles) {
    const viFile = krFile.replace(".jsonl", "_vi.jsonl");
    const stats  = await importFilePair(
      path.join(KR_DIR, krFile),
      path.join(VI_DIR, viFile),
    );

    total.success    += stats.success;
    total.failed     += stats.failed;
    total.noVi       += stats.noVi;
    total.translated += stats.translated;
    total.newProduct += stats.newProduct;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n──────────────────────────────────────────────────────");
  console.log(`🎉 Import complete! (${elapsed}s)`);

  if (IS_PRICE_MODE) {
    console.log(
      `   ✅ ${total.success} updated  |  🆕 ${total.newProduct} new  |  ❌ ${total.failed} errors  |  ⚠️  ${total.noVi} missing VI`
    );
  } else {
    console.log(
      `   ✅ ${total.success} OK  |  ❌ ${total.failed} errors  |  ⚠️  ${total.noVi} missing VI  |  🔄 ${total.translated} translated`
    );
  }

  console.log("──────────────────────────────────────────────────────");

  await knex.destroy();
}

importAll().catch((err) => {
  console.error("\n💥 Fatal error:", err);
  knex.destroy().finally(() => process.exit(1));
});