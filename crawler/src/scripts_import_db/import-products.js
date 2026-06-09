"use strict";

require("dotenv").config();

const knex = require("knex")(require("../../config/knexfile"));

const fs = require("fs");
const path = require("path");
const readline = require("readline");

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────

const INPUT_DIR = path.resolve(
  __dirname,
  "../../data/translate/musinsa/success",
);

const DEBUG = false; // Tắt debug khi chạy production để tăng tốc

const SOURCE_MAP = {
  oliveyoung: {
    shop_name: "Olive Young",
    shop_url: "https://www.oliveyoung.co.kr",
  },
  geng: {
    shop_name: "Gen.G Shop",
    shop_url: "https://shop.geng.gg",
  },
  t1: {
    shop_name: "T1 Shop",
    shop_url: "https://shop.t1.gg",
  },
  musinsa: {
    shop_name: "Musinsa",
    shop_url: "https://www.musinsa.com",
  },
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function debugLog(title, data = null) {
  if (!DEBUG) return;
  console.log(`\n🔎 ${title}`);
  if (data !== null) console.dir(data, { depth: 5, colors: true });
}

function parsePrice(value) {
  if (value == null) return null;
  if (typeof value === "number") return value;
  const num = parseInt(String(value).replace(/[^\d]/g, ""), 10);
  return isNaN(num) ? null : num;
}

function generateSlug(name, productId) {
  const base = (name || productId)
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

function normalizeFlags(flags = []) {
  return flags.map((f) => {
    switch (f) {
      case "오늘드림": return "today_delivery";
      case "BEST": return "best";
      default: return String(f).toLowerCase();
    }
  });
}

function parseCategoryFromFilename(filename) {
  const base = path.basename(filename, ".jsonl").replace(/_vi$/, "");
  const match = base.match(/^(.+)_(\d+)$/);
  if (!match) return { category_slug: base, category_id: null };
  return { category_slug: match[1], category_id: parseInt(match[2], 10) };
}

function determineIfFeatured(raw) {
  const flags = raw.source_flags || [];
  if (flags.includes("BEST")) return true;
  if (Number(raw.source_rating_avg || 0) >= 4.7 && Number(raw.source_rating_count || 0) >= 1000) return true;
  return false;
}

function toInt(value) {
  if (value == null) return null;
  return Math.round(Number(value));
}

// ─────────────────────────────────────────────
// MUSINSA TEXT CLEANER
// Xóa thông tin giao hàng tạm thời khỏi option text
// VD: "XS 06.08(월) 도착 예정" → "XS"
//     "S (품절)" → "S"
// ─────────────────────────────────────────────

function cleanMusinsaOptionText(text) {
  if (!text) return "";
  let cleaned = text;

  // Xóa dạng số: "06.08(월) 도착 예정", "06/08(화) 이내 발송 예정"
  cleaned = cleaned.replace(/\d{2}[./]\d{2}\([^)]*\)[^\n]*/g, "");

  // Xóa dạng từ: "모레(월)", "내일(화)", "오늘(목)" + phần sau
  cleaned = cleaned.replace(/(모레|내일|오늘|이번\s*주\s*\S+)\([^)]*\)[^\n]*/g, "");

  // Xóa ngày trong tuần còn sót: "(월)", "(화)", ...
  cleaned = cleaned.replace(/\([월화수목금토일]\)/g, "");

  // Xóa delivery text còn sót
  cleaned = cleaned.replace(/도착\s*예정/g, "");
  cleaned = cleaned.replace(/발송\s*예정/g, "");
  cleaned = cleaned.replace(/순차\s*배송/g, "");
  cleaned = cleaned.replace(/이내\s*/g, "");
  cleaned = cleaned.replace(/모레|내일|오늘/g, "");

  // Xóa soldout marker và giá delta
  cleaned = cleaned.replace(/\(품절\)/g, "");
  cleaned = cleaned.replace(/\([+-]?[0-9,]+원\)/g, "");

  return cleaned.replace(/\s+/g, " ").trim();
}

/**
 * Clean attributes cho từng source
 * Hiện tại chỉ xử lý musinsa — xóa delivery text khỏi giá trị attribute
 * VD: { 사이즈: "XS 06.08(월) 도착 예정" } → { 사이즈: "XS" }
 */
function cleanAttributes(attributes, source) {
  if (!attributes || typeof attributes !== "object") return attributes;
  if (source !== "musinsa") return attributes;

  const cleaned = {};
  for (const [key, value] of Object.entries(attributes)) {
    // Giữ nguyên flags array
    if (key === "flags") {
      cleaned[key] = value;
      continue;
    }
    cleaned[key] = typeof value === "string"
      ? cleanMusinsaOptionText(value)
      : value;
  }
  return cleaned;
}

// ─────────────────────────────────────────────
// SHIPPING CALCULATION
// ─────────────────────────────────────────────

function calculateVolumetricWeight(lengthMm, widthMm, heightMm) {
  if (!lengthMm || !widthMm || !heightMm) return null;
  const volumetricKg = (lengthMm / 10) * (widthMm / 10) * (heightMm / 10) / 6000;
  return Math.ceil(volumetricKg * 1000);
}

function getShippingSafetyFactor(confidence = 0) {
  if (confidence >= 0.9) return 1.15;
  if (confidence >= 0.8) return 1.25;
  if (confidence >= 0.7) return 1.45;
  return 1.65;
}

function roundShippingWeight(weight) {
  if (!weight) return null;
  return Math.ceil(weight / 100) * 100;
}

function calculateChargeableWeight(shipping = {}) {
  const actualWeight = Number(shipping.weight_grams) || 0;
  const volumetricWeight = calculateVolumetricWeight(
    shipping.length_mm, shipping.width_mm, shipping.height_mm,
  ) || 0;
  const baseWeight = Math.max(actualWeight, volumetricWeight);
  if (!baseWeight) return { volumetricWeight: null, chargeableWeight: null };

  const factor = getShippingSafetyFactor(Number(shipping.weight_confidence || 0));
  return {
    volumetricWeight,
    chargeableWeight: roundShippingWeight(baseWeight * factor),
  };
}

// ─────────────────────────────────────────────
// READ JSONL
// ─────────────────────────────────────────────

async function readJsonl(filePath) {
  const rows = [];
  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, "utf-8"),
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      rows.push(JSON.parse(trimmed));
    } catch {
      console.log("❌ Invalid JSON:", trimmed.slice(0, 100));
    }
  }
  return rows;
}

// ─────────────────────────────────────────────
// NORMALIZE RAW PRODUCT
// ─────────────────────────────────────────────

function normalizeProduct(raw, category) {
  if (raw.translationStatus !== "done" || !raw.name_vi) {
    throw new Error(`Invalid translation state: ${raw.translationStatus}`);
  }

  const source = raw.source || "unknown";
  const shop = SOURCE_MAP[source] || { shop_name: source, shop_url: null };
  const variants = raw.variants || [];

  const variantPrices = variants.map((v) => v.price?.sale).filter(Boolean);
  const fallbackPrice = raw.price?.salePrice || raw.price?.sale || null;
  const priceMin = variantPrices.length > 0 ? Math.min(...variantPrices) : fallbackPrice;
  const priceMax = variantPrices.length > 0 ? Math.max(...variantPrices) : fallbackPrice;
  const originalPrice = raw.price?.originalPrice || raw.price?.original || null;
  const discountPercent = raw.price?.discount || variants?.[0]?.price?.discount || null;

  const newArrivalUntil = new Date();
  newArrivalUntil.setDate(newArrivalUntil.getDate() + 14);

  const shippingSource = raw.product_shipping || {};
  const shippingInput = {
    weight_grams: shippingSource.weight_grams || null,
    length_mm: shippingSource.length_mm || null,
    width_mm: shippingSource.width_mm || null,
    height_mm: shippingSource.height_mm || null,
    weight_confidence: shippingSource.weight_confidence || 0,
  };
  const { volumetricWeight, chargeableWeight } = calculateChargeableWeight(shippingInput);

  debugLog("SHIPPING CALCULATION", {
    productId: raw.productId,
    actual_weight: shippingInput.weight_grams,
    dimensions: {
      length_mm: shippingInput.length_mm,
      width_mm: shippingInput.width_mm,
      height_mm: shippingInput.height_mm,
    },
    volumetricWeight,
    chargeableWeight,
  });

  return {
    product: {
      external_id: raw.productId,
      source,
      slug: generateSlug(raw.name_vi || raw.name, raw.productId),
      name_kr: raw.name || null,
      name_vi: raw.name_vi || null,
      description_kr: null,
      description_vi: null,
      price_min: parsePrice(priceMin),
      price_max: parsePrice(priceMax),
      original_price: parsePrice(originalPrice),
      sale_price: parsePrice(fallbackPrice),
      currency: "KRW",
      discount_percent: discountPercent,
      product_url: raw.url || null,
      shop_name: shop.shop_name,
      shop_url: shop.shop_url,
      category_id: category.category_id,
      category_slug: category.category_slug,
      meta_title: raw.name_vi || raw.name,
      meta_description: raw.name_vi || raw.name,
      is_active: true,
      is_deleted: false,
      source_rating_avg: raw.source_rating_avg || null,
      source_rating_count: raw.source_rating_count || 0,
      is_featured: determineIfFeatured(raw),
      featured_order: 0,
      new_arrival_until: newArrivalUntil,
      hash: raw.hash || null,
      image_hash: raw.image_hash || null,
      extra_data: {
        specs: { kr: raw.specs || {}, vi: raw.specs_vi || {} },
        detail_images: raw.detail_images || [],
        detail_html: raw.detail_html || null,
        crawl: {
          flags: normalizeFlags(raw.source_flags || []),
          crawled_at: raw.crawledAt || null,
          price_raw: raw.price_raw || {},
          shipping_raw: raw.product_shipping || {},
        },
      },
    },

    images: Array.isArray(raw.images)
      ? raw.images.map((img, idx) => ({ url: img, is_primary: idx === 0, sort_order: idx }))
      : [],

    // Options — clean delivery text cho musinsa
    options: (raw.options || [])
      .filter((opt) => {
        // Bỏ option 색상 từ musinsa (đây là linked products, không phải option thực)
        if (source === "musinsa" && (opt.name || opt.title) === "색상") return false;
        return true;
      })
      .map((opt, idx) => ({
        name: opt.name || opt.title,
        values: (opt.values || []).map((v) =>
          source === "musinsa" ? cleanMusinsaOptionText(v) : v
        ),
        type: opt.type || "variant",
        position: opt.position ?? idx,
      })),

    addons: normalizeAddons(raw.addons || []),

    // Variants — filter other_color_link và clean attributes
    variants: variants
      .filter((v) => {
        // Bỏ color carousel variants từ musinsa (linked products, không phải variant thực)
        if (source === "musinsa" && v.flags?.includes("other_color_link")) return false;
        return true;
      }).map((v) => {
        const variantShipping = v.shipping || {};
        const { volumetricWeight: vVol, chargeableWeight: vCharge } =
          calculateChargeableWeight({
            weight_grams: variantShipping.weight_grams,
            length_mm: variantShipping.length_mm,
            width_mm: variantShipping.width_mm,
            height_mm: variantShipping.height_mm,
            weight_confidence: variantShipping.weight_confidence || 0,
          });

        return {
          // ✅ cleanMusinsaOptionText áp dụng cho sku và name_kr của musinsa
          sku: source === "musinsa"
            ? cleanMusinsaOptionText(v.variantId)
            : (v.variantId || null),

          name_kr: source === "musinsa"
            ? cleanMusinsaOptionText(v.name_kr)
            : (v.name_kr || null),

          name_vi: v.name_vi || null,
          price: parsePrice(v.price?.sale),
          original_price: parsePrice(originalPrice),
          discount_percent: v.price?.discount || null,
          currency: "KRW",
          is_soldout: v.is_soldout || false,
          image_url: v.thumbnail || null,
          image_detail_url: (v.variant_detail_images || [])[0]?.url ?? null,

          // ✅ cleanAttributes xử lý toàn bộ attributes object theo source
          attributes: cleanAttributes(
            {
              ...(v.attributes || {}),
              flags: normalizeFlags(v.flags || []),
            },
            source,
          ),

          is_active: true,
          hash: v.hash || null,

          variant_images: (v.variant_detail_images || []).map((img, idx) => ({
            url: img?.url ?? img,
            image_type: "detail",
            is_primary: idx === 0,
            sort_order: idx,
          })),

          shipping: {
            raw_weight_grams: toInt(variantShipping.raw_weight_grams) || null,
            raw_length_mm: toInt(variantShipping.raw_length_mm) || null,
            raw_width_mm: toInt(variantShipping.raw_width_mm) || null,
            raw_height_mm: toInt(variantShipping.raw_height_mm) || null,
            weight_grams: toInt(variantShipping.weight_grams) || null,
            length_mm: toInt(variantShipping.length_mm) || null,
            width_mm: toInt(variantShipping.width_mm) || null,
            height_mm: toInt(variantShipping.height_mm) || null,
            volumetric_weight_grams: toInt(vVol),
            chargeable_weight_grams: toInt(vCharge),
            is_bulky: variantShipping.is_bulky || false,
            weight_source: variantShipping.weight_source || null,
            weight_confidence: variantShipping.weight_confidence || null,
            is_weight_estimated: variantShipping.is_weight_estimated ?? true,
          },
        };
      }),

    shipping: {
      raw_weight_grams: shippingSource.raw_weight_grams || null,
      raw_length_mm: shippingSource.raw_length_mm || null,
      raw_width_mm: shippingSource.raw_width_mm || null,
      raw_height_mm: shippingSource.raw_height_mm || null,
      raw_specs_text: JSON.stringify(raw.product_shipping || {}),
      weight_grams: toInt(shippingSource.weight_grams) || null,
      length_mm: toInt(shippingSource.length_mm) || null,
      width_mm: toInt(shippingSource.width_mm) || null,
      height_mm: toInt(shippingSource.height_mm) || null,
      is_bulky: shippingSource.is_bulky || false,
      volumetric_weight_grams: toInt(volumetricWeight),
      chargeable_weight_grams: toInt(chargeableWeight),
      weight_source: shippingSource.weight_source || null,
      weight_confidence: shippingSource.weight_confidence || null,
      is_weight_estimated: shippingSource.is_weight_estimated ?? true,
    },
  };
}

function normalizeAddons(rawAddons = []) {
  return rawAddons.map((addon, idx) => ({
    addon_id: addon.addonId,
    name: addon.name,
    price: parsePrice(addon.price) || 0,
    position: idx,
    options: (addon.options || []).map((opt, i) => ({
      label: opt.label,
      value: opt.value,
      sort_order: i,
    })),
  }));
}

// ─────────────────────────────────────────────
// INSERT PRODUCT GRAPH
//
// Strategy:
// - Product: upsert (update nếu hash đổi)
// - Images: delete + insert nếu image_hash đổi
// - Options: delete + insert nếu product hash đổi
// - Addons: delete + insert nếu product hash đổi
// - Variants: DELETE toàn bộ + bulk INSERT (nhanh nhất cho musinsa)
//   → CASCADE xóa variant_images và variant_shipping tự động
// - Product shipping: delete + insert
// ─────────────────────────────────────────────

async function insertProductGraph(trx, data) {
  // ─────────────────────────
  // UPSERT PRODUCT
  // ─────────────────────────
  let product = await trx("products")
    .where({ external_id: data.product.external_id })
    .first();

  const incomingHash = data.product.hash;
  const incomingImageHash = data.product.image_hash;

  const productChanged = !product
    || product.hash !== incomingHash
    || product.image_hash !== incomingImageHash;

  const imageChanged = !product
    || product.image_hash !== incomingImageHash;

  if (product) {
    if (productChanged) {
      await trx("products")
        .where({ id: product.id })
        .update({
          slug: data.product.slug,
          name_kr: data.product.name_kr,
          name_vi: data.product.name_vi,
          price_min: data.product.price_min,
          price_max: data.product.price_max,
          original_price: data.product.original_price,
          sale_price: data.product.sale_price,
          discount_percent: data.product.discount_percent,
          category_id: data.product.category_id,
          category_slug: data.product.category_slug,
          extra_data: JSON.stringify(data.product.extra_data),
          source_rating_avg: data.product.source_rating_avg,
          source_rating_count: data.product.source_rating_count,
          hash: incomingHash,
          image_hash: incomingImageHash,
          updated_at: knex.fn.now(),
        });
      // Reload để lấy id mới nhất
      product = await trx("products").where({ id: product.id }).first();
    }
  } else {
    [product] = await trx("products")
      .insert({
        external_id: data.product.external_id,
        source: data.product.source,
        slug: data.product.slug,
        name_kr: data.product.name_kr,
        name_vi: data.product.name_vi,
        description_kr: data.product.description_kr,
        description_vi: data.product.description_vi,
        price_min: data.product.price_min,
        price_max: data.product.price_max,
        original_price: data.product.original_price,
        sale_price: data.product.sale_price,
        currency: data.product.currency,
        discount_percent: data.product.discount_percent,
        product_url: data.product.product_url,
        shop_name: data.product.shop_name,
        shop_url: data.product.shop_url,
        category_id: data.product.category_id,
        category_slug: data.product.category_slug,
        meta_title: data.product.meta_title,
        meta_description: data.product.meta_description,
        is_active: data.product.is_active,
        is_deleted: data.product.is_deleted,
        extra_data: JSON.stringify(data.product.extra_data),
        source_rating_avg: data.product.source_rating_avg,
        source_rating_count: data.product.source_rating_count,
        is_featured: data.product.is_featured,
        featured_order: data.product.featured_order,
        new_arrival_until: data.product.new_arrival_until,
        hash: incomingHash,
        image_hash: incomingImageHash,
      })
      .returning("*");
  }

  const productId = product.id;

  // ─────────────────────────
  // PRODUCT IMAGES
  // Delete + insert lại khi image_hash thay đổi
  // ─────────────────────────
  if (imageChanged && data.images?.length) {
    await trx("product_variant_images")
      .where({ product_id: productId, variant_id: null })
      .delete();

    await trx("product_variant_images").insert(
      data.images.map((img, idx) => ({
        product_id: productId,
        url: img.url,
        is_primary: idx === 0,
        sort_order: idx,
      })),
    );
  }

  // ─────────────────────────
  // OPTIONS
  // Delete + insert lại khi product hash thay đổi
  // ─────────────────────────
  if (productChanged && data.options?.length) {
    await trx("product_options")
      .where({ product_id: productId })
      .delete();

    await trx("product_options").insert(
      data.options.map((opt) => ({
        product_id: productId,
        name: opt.name,
        values: JSON.stringify(opt.values),
        type: opt.type || "variant",
        position: opt.position || 0,
      })),
    );
  }

  // ─────────────────────────
  // ADDONS
  // Delete + insert lại khi product hash thay đổi
  // CASCADE FK sẽ xóa addon_options tự động
  // ─────────────────────────
  if (productChanged && data.addons?.length) {
    await trx("product_addons").where({ product_id: productId }).delete();

    for (const addon of data.addons) {
      const [savedAddon] = await trx("product_addons")
        .insert({
          product_id: productId,
          addon_id: addon.addon_id,
          name: addon.name,
          price: addon.price,
          position: addon.position,
        })
        .returning("*");

      if (addon.options?.length) {
        await trx("product_addon_options").insert(
          addon.options.map((opt) => ({
            addon_id: savedAddon.id,
            label: opt.label,
            value: opt.value,
            sort_order: opt.sort_order,
          })),
        );
      }
    }
  }

  // ─────────────────────────
  // VARIANTS
  //
  // Strategy: DELETE toàn bộ + bulk INSERT
  // Lý do: musinsa có nhiều tổ hợp, xóa + insert nhanh hơn
  //        check-then-update từng variant
  // Yêu cầu: FK variant_images và variant_shipping có ON DELETE CASCADE
  // ─────────────────────────
  if (data.variants?.length) {
    // CASCADE tự xóa variant_images và variant_shipping liên quan
    await trx("product_variants")
      .where({ product_id: productId })
      .delete();

    // Bulk insert tất cả variants trong 1 query
    const newVariants = await trx("product_variants")
      .insert(
        data.variants.map((v) => ({
          product_id: productId,
          sku: v.sku,
          name_kr: v.name_kr,
          name_vi: v.name_vi,
          price: v.price,
          original_price: v.original_price,
          discount_percent: v.discount_percent,
          currency: v.currency,
          is_soldout: v.is_soldout,
          image_url: v.image_url,
          image_detail_url: v.image_detail_url,
          attributes: JSON.stringify(v.attributes),
          is_active: v.is_active,
          hash: v.hash,
        })),
      )
      .returning(["id", "sku"]);

    // Map sku → DB id để insert shipping và images
    const variantIdMap = new Map(newVariants.map((v) => [v.sku, v.id]));

    // ── Variant images — bulk insert ──
    const variantImages = data.variants.flatMap((v) => {
      const vid = variantIdMap.get(v.sku);
      if (!vid || !v.variant_images?.length) return [];
      return v.variant_images.map((img) => ({
        product_id: productId,
        variant_id: vid,
        url: img.url,
        image_type: img.image_type || "detail",
        is_primary: img.is_primary,
        sort_order: img.sort_order,
      }));
    });

    if (variantImages.length) {
      await trx("product_variant_images").insert(variantImages);
    }

    // ── Variant shipping — bulk insert ──
    const variantShipping = data.variants
      .map((v) => {
        const vid = variantIdMap.get(v.sku);
        if (!vid) return null;
        return { product_id: productId, variant_id: vid, ...v.shipping };
      })
      .filter(Boolean);

    if (variantShipping.length) {
      await trx("product_variant_shipping").insert(variantShipping);
    }
  }

  // ─────────────────────────
  // PRODUCT-LEVEL SHIPPING (variant_id = null)
  // Delete + insert để tránh vấn đề NULL trong unique constraint
  // ─────────────────────────
  await trx("product_variant_shipping")
    .where({ product_id: productId, variant_id: null })
    .delete();

  await trx("product_variant_shipping").insert({
    product_id: productId,
    variant_id: null,
    ...data.shipping,
  });
}

// ─────────────────────────────────────────────
// IMPORT FILE
// ─────────────────────────────────────────────

async function importFile(filePath) {
  console.log(`\n📂 ${path.basename(filePath)}`);

  const category = parseCategoryFromFilename(filePath);
  const rows = await readJsonl(filePath);

  console.log(`📦 ${rows.length} products`);

  let success = 0;
  let failed = 0;

  for (const raw of rows) {
    if (raw.translationStatus !== "done") {
      console.log(`⏭ SKIP ${raw.productId} [${raw.translationStatus}]`);
      if (raw.translationError) {
        console.log(
          `   ↳ Error: ${typeof raw.translationError === "string"
            ? raw.translationError
            : JSON.stringify(raw.translationError)
          }`,
        );
      }
      continue;
    }

    try {
      console.log(`\n🚀 IMPORT ${raw.productId}`);

      const normalized = normalizeProduct(raw, category);

      await knex.transaction(async (trx) => {
        await insertProductGraph(trx, normalized);
      });

      success++;
      console.log(`✅ SUCCESS ${raw.productId}`);
    } catch (err) {
      failed++;
      console.log(`❌ FAILED ${raw.productId}`);
      console.log(err);
      if (err.detail) console.log("DETAIL:", err.detail);
      if (err.constraint) console.log("CONSTRAINT:", err.constraint);
    }
  }

  console.log(`\n🎉 DONE | ✅ ${success} | ❌ ${failed}`);
}

// ─────────────────────────────────────────────
// MAIN
// Chạy parallel tối đa 3 files cùng lúc
// ─────────────────────────────────────────────

async function main() {
  const files = fs.readdirSync(INPUT_DIR).filter((f) => f.endsWith(".jsonl"));
  console.log(`📁 Found ${files.length} files`);

  const PARALLEL = 3;
  for (let i = 0; i < files.length; i += PARALLEL) {
    const batch = files.slice(i, i + PARALLEL);
    await Promise.all(
      batch.map((file) => importFile(path.join(INPUT_DIR, file))),
    );
  }

  await knex.destroy();
  console.log("\n🚀 ALL IMPORTED");
}

main().catch(async (err) => {
  console.error(err);
  await knex.destroy();
  process.exit(1);
});