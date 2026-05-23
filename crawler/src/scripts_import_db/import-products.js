// scripts/import-products.js
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
  "../../data/output_products_vi_gemini/success",
);

const DEBUG = true;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function debugLog(title, data = null) {
  if (!DEBUG) return;

  console.log(`\n🔎 ${title}`);

  if (data !== null) {
    console.dir(data, {
      depth: 5,
      colors: true,
    });
  }
}

function parsePrice(value) {
  if (value == null) return null;

  if (typeof value === "number") {
    return value;
  }

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

function normalizeImagePath(rawPath) {
  if (!rawPath) return null;

  let p = rawPath.replace(/\\/g, "/");

  const match = p.match(/(image[^/]*\/.+)$/);

  if (!match) return p;

  let result = match[1];

  if (!result.startsWith("data/")) {
    result = `data/${result}`;
  }

  return result;
}

function normalizeFlags(flags = []) {
  return flags.map((f) => {
    switch (f) {
      case "오늘드림":
        return "today_delivery";

      case "BEST":
        return "best";

      default:
        return String(f).toLowerCase();
    }
  });
}

function parseCategoryFromFilename(filename) {
  const base = path.basename(filename, ".jsonl").replace(/_vi$/, "");

  const match = base.match(/^(.+)_(\d+)$/);

  if (!match) {
    return {
      category_slug: base,
      category_id: null,
    };
  }

  return {
    category_slug: match[1],
    category_id: parseInt(match[2], 10),
  };
}

function determineIfFeatured(raw) {
  const flags = raw.source_flags || [];

  const ratingAvg = Number(raw.source_rating_avg || 0);

  const ratingCount = Number(raw.source_rating_count || 0);

  if (flags.includes("BEST")) {
    return true;
  }

  if (ratingAvg >= 4.7 && ratingCount >= 1000) {
    return true;
  }

  return false;
}

// ─────────────────────────────────────────────
// SHIPPING CALCULATION
// ─────────────────────────────────────────────

/**
 * Tính volumetric weight
 *
 * Formula:
 * (cm × cm × cm) / 6000
 *
 * return grams
 */
function calculateVolumetricWeight(lengthMm, widthMm, heightMm) {
  if (!lengthMm || !widthMm || !heightMm) {
    return null;
  }

  const lengthCm = lengthMm / 10;
  const widthCm = widthMm / 10;
  const heightCm = heightMm / 10;

  const volumetricKg = (lengthCm * widthCm * heightCm) / 6000;

  return Math.ceil(volumetricKg * 1000);
}

/**
 * hệ số buffer theo độ tin cậy AI
 */
function getShippingSafetyFactor(confidence = 0) {
  if (confidence >= 0.9) {
    return 1.25;
  }

  if (confidence >= 0.8) {
    return 1.35;
  }

  if (confidence >= 0.7) {
    return 1.45;
  }

  return 1.65;
}

/**
 * round shipping
 *
 * <=500g -> round 100g
 * >500g -> round 500g
 */
function roundShippingWeight(weight) {
  if (!weight) return null;

  if (weight <= 500) {
    return Math.ceil(weight / 100) * 100;
  }

  return Math.ceil(weight / 500) * 500;
}

/**
 * final shipping calculation
 */
function calculateChargeableWeight(shipping = {}) {
  const actualWeight = Number(shipping.weight_grams) || 0;

  const volumetricWeight =
    calculateVolumetricWeight(
      shipping.length_mm,
      shipping.width_mm,
      shipping.height_mm,
    ) || 0;

  const baseWeight = Math.max(actualWeight, volumetricWeight);

  if (!baseWeight) {
    return {
      volumetricWeight: null,
      chargeableWeight: null,
    };
  }

  const confidence = Number(shipping.weight_confidence || 0);

  const factor = getShippingSafetyFactor(confidence);

  const bufferedWeight = baseWeight * factor;

  const roundedWeight = roundShippingWeight(bufferedWeight);

  return {
    volumetricWeight,
    chargeableWeight: roundedWeight,
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
    } catch (err) {
      console.log("❌ Invalid JSON:", trimmed.slice(0, 100));
    }
  }

  return rows;
}

// ─────────────────────────────────────────────
// NORMALIZE RAW PRODUCT
// ─────────────────────────────────────────────

function normalizeProduct(raw, category) {
  const variants = raw.variants || [];

  const variantPrices = variants.map((v) => v.price?.sale).filter(Boolean);

  const fallbackPrice = raw.price?.salePrice || raw.price?.sale || null;

  const priceMin =
    variantPrices.length > 0 ? Math.min(...variantPrices) : fallbackPrice;

  const priceMax =
    variantPrices.length > 0 ? Math.max(...variantPrices) : fallbackPrice;

  const originalPrice = raw.price?.originalPrice || raw.price?.original || null;

  const discountPercent =
    raw.price?.discount || variants?.[0]?.price?.discount || null;

  const newArrivalUntil = new Date();

  newArrivalUntil.setDate(newArrivalUntil.getDate() + 14);

  // ─────────────────────────
  // SHIPPING CALCULATION
  // ─────────────────────────

  const shippingSource = raw.product_shipping || {};

  const shippingInput = {
    weight_grams: shippingSource.weight_grams || null,

    length_mm: shippingSource.length_mm || null,

    width_mm: shippingSource.width_mm || null,

    height_mm: shippingSource.height_mm || null,

    weight_confidence: shippingSource.weight_confidence || 0,
  };

  const { volumetricWeight, chargeableWeight } =
    calculateChargeableWeight(shippingInput);

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

  const normalized = {
    product: {
      external_id: raw.productId,

      source: "oliveyoung",

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

      shop_name: "Olive Young",

      shop_url: "https://www.oliveyoung.co.kr",

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

      extra_data: {
        specs: {
          kr: raw.specs || {},
          vi: raw.specs_vi || {},
        },

        crawl: {
          flags: normalizeFlags(raw.source_flags || []),

          crawled_at: raw.crawledAt || null,

          price_raw: raw.price_raw || {},

          shipping_raw: raw.product_shipping || {},
        },
      },
    },

    // ─────────────────────────
    // IMAGES
    // ─────────────────────────

    images: (raw.images || []).map((img, idx) => ({
      url: normalizeImagePath(img),

      is_primary: idx === 0,

      sort_order: idx,
    })),

    // ─────────────────────────
    // VARIANTS
    // ─────────────────────────

    variants: variants.map((v) => {
      const variantShipping = v.shipping || {};

      const { volumetricWeight, chargeableWeight } = calculateChargeableWeight({
        weight_grams: variantShipping.weight_grams,
        length_mm: variantShipping.length_mm,
        width_mm: variantShipping.width_mm,
        height_mm: variantShipping.height_mm,
        weight_confidence: variantShipping.weight_confidence || 0,
      });

      return {
        sku: v.variantId,

        name_kr: v.name_kr || null,

        name_vi: v.name_vi || null,

        price: parsePrice(v.price?.sale),

        original_price: parsePrice(originalPrice),

        discount_percent: v.price?.discount || null,

        currency: "KRW",

        is_soldout: v.is_soldout || false,

        image_url: normalizeImagePath(v.thumbnail),

        image_detail_url: (v.variant_detail_images || [])[0]?.url ?? null,

        attributes: {
          flags: normalizeFlags(v.flags || []),
        },

        is_active: true,

        // ─────────────────────
        // VARIANT IMAGES
        // ─────────────────────

        variant_images: (v.variant_detail_images || []).map((img, idx) => ({
          url: normalizeImagePath(img?.url ?? img),

          image_type: "detail",

          is_primary: idx === 0,

          sort_order: idx,
        })),

        // ─────────────────────
        // VARIANT SHIPPING
        // ─────────────────────

        shipping: {
          raw_weight_grams: variantShipping.raw_weight_grams || null,

          raw_length_mm: variantShipping.raw_length_mm || null,

          raw_width_mm: variantShipping.raw_width_mm || null,

          raw_height_mm: variantShipping.raw_height_mm || null,

          weight_grams: variantShipping.weight_grams || null,

          length_mm: variantShipping.length_mm || null,

          width_mm: variantShipping.width_mm || null,

          height_mm: variantShipping.height_mm || null,

          volumetric_weight_grams: volumetricWeight,

          chargeable_weight_grams: chargeableWeight,

          is_bulky: variantShipping.is_bulky || false,

          weight_source: variantShipping.weight_source || null,

          weight_confidence: variantShipping.weight_confidence || null,

          is_weight_estimated: variantShipping.is_weight_estimated ?? true,
        },
      };
    }),

    // ─────────────────────────
    // SHIPPING
    // ─────────────────────────

    shipping: {
      raw_weight_grams: shippingSource.raw_weight_grams || null,

      raw_length_mm: shippingSource.raw_length_mm || null,

      raw_width_mm: shippingSource.raw_width_mm || null,

      raw_height_mm: shippingSource.raw_height_mm || null,

      raw_specs_text: JSON.stringify(raw.product_shipping || {}),

      weight_grams: shippingSource.weight_grams || null,

      length_mm: shippingSource.length_mm || null,

      width_mm: shippingSource.width_mm || null,

      height_mm: shippingSource.height_mm || null,

      is_bulky: shippingSource.is_bulky || false,

      // calculated
      volumetric_weight_grams: volumetricWeight,

      chargeable_weight_grams: chargeableWeight,

      weight_source: shippingSource.weight_source || null,

      weight_confidence: shippingSource.weight_confidence || null,

      is_weight_estimated: shippingSource.is_weight_estimated ?? true,
    },
  };

  debugLog("NORMALIZED PRODUCT", {
    external_id: normalized.product.external_id,

    shipping: normalized.shipping,
  });

  return normalized;
}

// ─────────────────────────────────────────────
// INSERT PRODUCT GRAPH
// ─────────────────────────────────────────────

async function insertProductGraph(trx, data) {
  // check existing product
  let product = await trx("products")
    .where({
      external_id: data.product.external_id,
    })
    .first();

  // update existing
  if (product) {
    await trx("products")
      .where({
        id: product.id,
      })
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

        updated_at: knex.fn.now(),
      });

    product = await trx("products")
      .where({
        id: product.id,
      })
      .first();
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
      })
      .returning("*");
  }

  const productId = product.id;

  // ─────────────────────────
  // PRODUCT IMAGES
  // ─────────────────────────

  await trx("product_variant_images").where("product_id", productId).delete();

  if (data.images.length) {
    await trx("product_variant_images").insert(
      data.images.map((img) => ({
        product_id: productId,

        url: img.url,

        is_primary: img.is_primary,

        sort_order: img.sort_order,
      })),
    );
  }

  // ─────────────────────────
  // VARIANTS
  // ─────────────────────────

  for (const variant of data.variants) {
    let savedVariant = await trx("product_variants")
      .where({
        sku: variant.sku,
      })
      .first();

    if (savedVariant) {
      await trx("product_variants")
        .where({
          id: savedVariant.id,
        })
        .update({
          name_kr: variant.name_kr,

          name_vi: variant.name_vi,

          price: variant.price,

          original_price: variant.original_price,

          discount_percent: variant.discount_percent,

          is_soldout: variant.is_soldout,

          image_url: variant.image_url,

          attributes: JSON.stringify(variant.attributes),

          updated_at: knex.fn.now(),
        });

      savedVariant = await trx("product_variants")
        .where({
          id: savedVariant.id,
        })
        .first();
    } else {
      [savedVariant] = await trx("product_variants")
        .insert({
          product_id: productId,

          sku: variant.sku,

          name_kr: variant.name_kr,

          name_vi: variant.name_vi,

          price: variant.price,

          original_price: variant.original_price,

          discount_percent: variant.discount_percent,

          currency: variant.currency,

          is_soldout: variant.is_soldout,

          image_url: variant.image_url,

          image_detail_url: variant.image_detail_url,

          attributes: JSON.stringify(variant.attributes),

          is_active: variant.is_active,
        })
        .returning("*");
    }

    // variant images
    await trx("product_variant_images").where("variant_id", savedVariant.id).delete();

    if (variant.variant_images.length) {
      await trx("product_variant_images").insert(
        variant.variant_images.map((img) => ({
          product_id: productId,

          variant_id: savedVariant.id,

          url: img.url,

          image_type: img.type,

          is_primary: img.is_primary,

          sort_order: img.sort_order,
        })),
      );
    }

    // variant shipping
    const variantShippingExists = await trx("product_variant_shipping")
      .where({
        variant_id: savedVariant.id,
      })
      .first();

    if (variantShippingExists) {
      await trx("product_variant_shipping")
        .where({
          variant_id: savedVariant.id,
        })
        .update({
          ...variant.shipping,

          updated_at: knex.fn.now(),
        });
    } else {
      await trx("product_variant_shipping").insert({
        product_id: productId,
        variant_id: savedVariant.id,

        ...variant.shipping,
      });
    }
  }

  // ─────────────────────────
  // SHIPPING
  // ─────────────────────────

  const shippingExists = await trx("product_variant_shipping")
    .where({
      product_id: productId,
    })
    .first();

  if (shippingExists) {
    await trx("product_variant_shipping")
      .where({
        product_id: productId,
      })
      .update({
        ...data.shipping,

        updated_at: knex.fn.now(),
      });
  } else {
    await trx("product_variant_shipping").insert({
      product_id: productId,

      ...data.shipping,
    });
  }
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

      if (err.detail) {
        console.log("DETAIL:", err.detail);
      }

      if (err.constraint) {
        console.log("CONSTRAINT:", err.constraint);
      }
    }
  }

  console.log(`\n🎉 DONE | ✅ ${success} | ❌ ${failed}`);
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

async function main() {
  const files = fs.readdirSync(INPUT_DIR).filter((f) => f.endsWith(".jsonl"));

  console.log(`📁 Found ${files.length} files`);

  for (const file of files) {
    await importFile(path.join(INPUT_DIR, file));
  }

  await knex.destroy();

  console.log("\n🚀 ALL IMPORTED");
}

main().catch(async (err) => {
  console.error(err);

  await knex.destroy();

  process.exit(1);
});
