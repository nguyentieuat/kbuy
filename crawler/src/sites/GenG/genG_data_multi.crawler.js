"use strict";

const path = require("path");
const fs = require("fs-extra");
const { chromium } = require("playwright");
const CrawlerSessionManager = require("../../../core/sessionManager");

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const LINKS_DIR = path.join(process.cwd(), "data/links/geng");
const OUTPUT_DIR = path.join(process.cwd(), "data/output_products/geng");
const CONCURRENCY = 3;

// ─────────────────────────────────────────────────────────────────────────────
// LOGGER + HELPERS (giữ nguyên từ code cũ)
// ─────────────────────────────────────────────────────────────────────────────

const log = {
  info: (...args) => console.log(`[${ts()}] ℹ️ `, ...args),
  ok: (...args) => console.log(`[${ts()}] ✅`, ...args),
  warn: (...args) => console.warn(`[${ts()}] ⚠️ `, ...args),
  error: (...args) => console.error(`[${ts()}] ❌`, ...args),
  step: (...args) => console.log(`[${ts()}] 👉`, ...args),
  img: (...args) => console.log(`[${ts()}] 🖼️ `, ...args),
  star: (...args) => console.log(`[${ts()}] ⭐`, ...args),
};

function ts() {
  return new Date().toISOString().slice(11, 23);
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function humanDelay() {
  const r = Math.random();
  if (r < 0.5) return 1500 + Math.random() * 2000;
  if (r < 0.8) return 3000 + Math.random() * 4000;
  return 5000 + Math.random() * 5000;
}
function parsePrice(text) {
  if (!text) return null;
  return parseInt(text.replace(/[^\d]/g, ""), 10) || null;
}
function writeJsonl(filePath, rows) {
  const content =
    rows
      .filter(Boolean)
      .map((r) => JSON.stringify(r))
      .join("\n") + "\n";
  fs.outputFileSync(filePath, content, "utf-8");
}

// ─────────────────────────────────────────────────────────────────────────────
// HASH
// ─────────────────────────────────────────────────────────────────────────────

const crypto = require("crypto");
function md5(str) {
  return crypto.createHash("md5").update(str).digest("hex");
}

function hashProduct(product) {
  return md5(
    JSON.stringify({
      name: product.name,

      specs: product.specs,

      options: product.options,

      addons: product.addons,

      price: {
        originalPrice: product.price?.originalPrice,
        salePrice: product.price?.salePrice,
        discount: product.price?.discount,
      },

      flags: product.source_flags,

      rating: {
        avg: product.source_rating_avg,
        count: product.source_rating_count,
      },
    }),
  );
}
function hashVariant(v) {
  return md5(
    JSON.stringify({
      name: v.name_kr,

      attributes: v.attributes,

      price: {
        sale: v.price?.sale,
        discount: v.price?.discount,
      },

      soldout: v.is_soldout,

      images: {
        thumbnail: v.thumbnail,
        detail: [...(v.variant_detail_images || [])].sort(),
      },
    }),
  );
}

function hashImageUrls(imageUrls = []) {
  return md5(JSON.stringify([...imageUrls].sort()));
}

function normalizeGenGUrl(url) {
  try {
    if (url.startsWith("/")) {
      return `https://shop-GenG.gg${url}`;
    }

    return url.split("?")[0];
  } catch {
    return url;
  }
}

function absoluteUrl(url, baseUrl) {
  if (!url) return null;

  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

function extractGenGProductId(url) {
  try {
    const pretty = url.match(/\/product\/.*?\/(\d+)\//);
    if (pretty) return pretty[1];

    const u = new URL(url);
    return u.searchParams.get("product_no");
  } catch {
    return null;
  }
}
// ─────────────────────────────────────────────────────────────────────────────
// GenG EXTRACTORS
// ─────────────────────────────────────────────────────────────────────────────
async function getGenGImages(page) {
  try {
    const images = await page.$$eval(".prd-add-img img.ThumbImage", (imgs) =>
      imgs
        .map((img) => img.getAttribute("src") || img.src)
        .filter(Boolean)
        .map((src) => (src.startsWith("//") ? "https:" + src : src)),
    );

    return [...new Set(images)];
  } catch {
    return [];
  }
}

async function getGenGName(page) {
  try {
    return await page.$eval(".headingArea h2", (el) => el.innerText.trim());
  } catch {
    return null;
  }
}

async function getGenGPrice(page) {
  try {
    const originalText = await page
      .$eval("#span_product_price_text", (el) => el.textContent.trim())
      .catch(() => null);

    const saleText = await page
      .$eval(".prd-price-custom:not(.displaynone)", (el) =>
        el.textContent.trim(),
      )
      .catch(() => null);

    const discountText = await page
      .$eval(".ec-sale-rate", (el) => el.textContent.trim())
      .catch(() => null);

    return {
      originalPrice: parsePrice(originalText),
      salePrice: parsePrice(saleText || originalText),
      discount: parseInt((discountText || "").replace(/[^\d]/g, ""), 10) || 0,
    };
  } catch {
    return {
      originalPrice: null,
      salePrice: null,
      discount: null,
    };
  }
}

async function getGenGRating(page) {
  try {
    const avg = await page
      .locator(".current-grade-rate")
      .textContent()
      .catch(() => null);

    const count = await page
      .locator(".total-count-container .value")
      .textContent()
      .catch(() => null);

    return {
      avg: avg ? Number(avg.trim()) : 5,
      count: count ? Number(count.replace(/,/g, "")) : 0,
      is_default: !avg,
    };
  } catch {
    return {
      avg: 5,
      count: 0,
      is_default: true,
    };
  }
}

async function getGenGSpecs(page) {
  try {
    // đợi DOM render thật sự
    await page.waitForTimeout(5000);

    // ─────────────────────────────
    // 0. CLICK TAB "상세정보" (quan trọng)
    // ─────────────────────────────
    const li = page.locator(
      'li:has(a:has-text("상세정보"))'
    ).first();

    await page.evaluate(() => {
      document
        .querySelectorAll(
          '#app-saladlab-alphareview-onsite-box-164658'
        )
        .forEach(el => el.remove());
    });

    await li.click({
      force: true
    });

    // ─────────────────────────────
    // 1. ROOT
    // ─────────────────────────────
    const selectors = [
      ".edibot-product-detail",
      ".xans-product-detail",
      ".prd-detail",
      ".cont"
    ];

    let root = null;

    for (const sel of selectors) {
      const locator = page.locator(sel).first();
      const exists = await locator.count().catch(() => 0);

      if (exists > 0) {
        root = locator;
        break;
      }
    }

    if (!root) {
      root = page.locator("body");
    }

    // optional wait (không fail crawler)
    try {
      await root.waitFor({ state: "attached", timeout: 3000 });
    } catch (_) { }

    const detailHtml = await root.innerHTML().catch(() => null);

    // ─────────────────────────────
    // 2. IMAGES (fix lazy + relative)
    // ─────────────────────────────
    const baseUrl = page.url();

    const detailImages = await page.$$eval(
      ".edibot-product-detail img",
      (imgs, baseUrl) => {
        const toAbs = (src) => {
          if (!src) return null;

          if (src.startsWith("//")) return "https:" + src;
          if (src.startsWith("/")) return new URL(src, baseUrl).href;

          return src;
        };

        return imgs
          .map((img) => {
            // 🔥 PRIORITY FIX: ec-data-src > data-src > src
            const src =
              img.getAttribute("ec-data-src") ||
              img.getAttribute("data-src") ||
              img.getAttribute("src");

            if (!src) return null;

            // ❌ lọc base64 placeholder
            if (src.startsWith("data:image")) return null;

            // ❌ lọc empty pixel / tracking gif
            if (src.includes("1x1") || src.includes("blank")) return null;

            return toAbs(src);
          })
          .filter(Boolean);
      },
      page.url(),
    );

    return {
      specs: {},
      detail_html: detailHtml.replace(
        /(ec-data-src|src)="([^"]+)"/g,
        (_, attr, url) => {
          return `${attr}="${absoluteUrl(
            url,
            "https://shop-GenG.gg"
          )}"`;
        }
      ),

      detail_images: [...new Set(detailImages)],
    };
  } catch (err) {
    console.error("getGenGSpecs error:", err);
    return {
      specs: {},
      detail_html: null,
      detail_images: [],
    };
  }
}

function cleanText(s) {
  return (s || "").replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

function cleanOptionText(t) {
  return (t || "")
    .replace(/\[품절\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function getGenGVariants(page, productId, salePrice = null, discount = null) {
  try {
    const results = [];
    const optionsMeta = [];

    const productName = cleanText(
      await page.$eval(".headingArea h2", (el) => el.innerText),
    );

    // ─────────────────────────────
    // HELPERS
    // ─────────────────────────────

    // ─────────────────────────────
    // Parse price delta từ option text
    // ─────────────────────────────
    function parsePriceDelta(text) {
      // (+45,000원) hoặc (-3,600원)
      const match = text.match(/\(([+-][0-9,]+)원\)/);
      if (!match) return 0;
      return parseInt(match[1].replace(/,/g, ""), 10) || 0;
    }

    async function select(selector, value) {
      await page.selectOption(selector, value);
      await page.waitForTimeout(500);
    }

    async function waitVariants() {
      await page
        .waitForFunction(() =>
          document.querySelectorAll(".option_products tr.option_product").length > 0
        )
        .catch(() => { });
    }


    async function getAddons() {
      return await page.$$eval(
        ".productSet.additional ul.product > li.xans-record-",
        (items) =>
          items.map((item) => {
            const name =
              item.querySelector(".information .name strong")?.textContent?.trim() || "";
            const priceText =
              item.querySelector(".information p.price strong")?.textContent?.trim() || "";
            const price = parseInt(priceText.replace(/[^\d]/g, ""), 10) || 0;
            const selectEl = item.querySelector("select");
            const addonId =
              selectEl?.getAttribute("option_product_no") ||
              selectEl?.id?.match(/addproduct_option_id_(\d+)/)?.[1] ||
              null;
            const options = selectEl
              ? Array.from(selectEl.querySelectorAll("option"))
                .map((o) => ({
                  value: o.value,
                  text: (o.label || o.textContent || "")
                    .replace(/\[품절\]/g, "")
                    .replace(/\s+/g, " ")
                    .trim(),
                  disabled:
                    o.disabled ||
                    o.value === "*" ||
                    o.value === "**" ||
                    (o.textContent || "").includes("품절"),
                }))
                .filter((o) => o.value && o.value !== "*" && o.value !== "**")
              : [];
            return { addonId, name, price, options };
          }),
      );
    }

    // ─────────────────────────────
    // 1. OPTIONS META
    // ─────────────────────────────
    const sizeTitle = await page.$eval(
      "tr:has(#product_option_id1) th",
      (el) => el?.innerText?.trim() || "SIZE"
    ).catch(() => "SIZE");

    const sizes = await page.$$eval("#product_option_id1 option", (opts) =>
      opts
        .map((o) => ({
          value: o.value,
          text: (o.label || o.textContent || "")
            .replace(/\[품절\]/g, "")
            .replace(/\s+/g, " ")
            .trim(),
          type: o.parentElement?.label || "OPTION",
          disabled: o.disabled || (o.textContent || "").includes("품절"),
        }))
        .filter((o) => o.value && o.value !== "*" && o.value !== "**"),
    );

    optionsMeta.push({
      name: sizeTitle,
      position: 0,
      type: "variant",
      values: sizes.map(s => ({
        label: s.text,
        value: s.value,
      })),
    });

    // ─────────────────────────────
    // 2. LOOP SIZES
    // ─────────────────────────────
    const addons = await getAddons();
    const addonsMeta = addons.map(addon => ({
      addonId: addon.addonId,
      name: addon.name,
      price: addon.price,
      options: addon.options.map(opt => ({
        label: opt.text,
        value: opt.value,
      })),
    }));

    for (const size of sizes) {
      if (size.disabled) continue;

      // Lấy giá từ rendered table (có thể khác nhau theo size)
      const sizeText = cleanOptionText(size.text);
      const sizeDelta = parsePriceDelta(size.text);

      // Tính giá
      const baseSizePrice = (salePrice ?? 0) + sizeDelta;
      const baseSizePriceAfterDiscount = Math.round(baseSizePrice * (1 - (discount ?? 0) / 100));

      const variantId = `${productId}_${size.value}`.toLowerCase();

      const fullName = cleanText(`${productName} - ${size.type} ${size.text}`);

      // ── Base variant ──
      results.push({
        variantId,
        name_kr: size.text,
        attributes: { [sizeTitle]: size.text },
        source_option_values: {
          option1: size.value,
        },
        type: "variant",
        price: { sale: baseSizePriceAfterDiscount, original: baseSizePrice, discount: discount },
        price_raw: {
          priceText: String(baseSizePriceAfterDiscount || ""),
          discountText: `${discount || 0}%`,
        },
        thumbnail: null,
        variant_detail_images: [],
        flags: [],
        is_soldout: false,
      });

      // ── Addons ──
      await page.waitForSelector(
        ".productSet.additional ul.product > li.xans-record-",
        { timeout: 2000 }
      ).catch(() => { });

      for (const addon of addons) {
        // Addon không có options → 1 option duy nhất
        if (addon.options.length === 0) {
          const addonVariantId = `${productId}_${size.value}|addon_${addon.addonId || addon.name.replace(/\s+/g, "_")}_single`.toLowerCase();

          results.push({
            variantId: addonVariantId,
            name_kr: `${size.text} - ${addon.name}`,
            attributes: { [sizeTitle]: size.text, addon: addon.name },
            source_option_values: {
              option1: size.value,

              addon: {
                addonId: addon.addonId,
              }
            },
            type: "variant",
            price: { sale: baseSizePriceAfterDiscount, original: baseSizePrice, discount: discount },
            price_raw: {
              priceText: String(baseSizePriceAfterDiscount || ""),
              discountText: `${discount || 0}%`,
            },
            thumbnail: null,
            variant_detail_images: [],
            flags: [],
            is_soldout: false,
          });
          continue;
        }

        // Addon có options → loop
        for (const opt of addon.options) {
          if (opt.disabled) continue;

          const addonVariantId = `${productId}_${size.value}|addon_${addon.addonId}_${opt.value}`.toLowerCase();

          // Tính giá
          const adjustedPrice = baseSizePrice + addon.price;

          const finalPrice = Math.round(
            adjustedPrice * (1 - ((discount ?? 0) || 0) / 100)
          );
          const originalPrice = adjustedPrice;


          results.push({
            variantId: addonVariantId,
            name_kr: `${size.text} - ${addon.name} ${opt.text}`.trim(),
            attributes: {
              [sizeTitle]: size.text,
              [addon.name]: opt.text,
            },
            source_option_values: {
              option1: size.value,

              addon: {
                addonId: addon.addonId,
                optionValue: opt.value,
              }
            },
            type: "variant",
            price: { sale: finalPrice, original: originalPrice, discount: discount },
            price_raw: {
              priceText: String(finalPrice || ""),
              discountText: `${discount || 0}%`,
            },
            thumbnail: null,
            variant_detail_images: [],
            flags: [],
            is_soldout: false,
          });
        }
      }
    }

    const dedupedVariants =
      [...new Map(results.map(v => [v.variantId, v])).values()];

    const variantsWithHash =
      dedupedVariants.map(v => ({
        ...v,
        hash: hashVariant(v),
      }));

    return {
      options: optionsMeta,
      addons: addonsMeta,
      variants: variantsWithHash,
    };
  } catch (err) {
    console.log("getGenGVariants error:", err.message);
    return { options: [], variants: [] };
  }
}
// ─────────────────────────────────────────────────────────────────────────────
// CRAWL PRODUCT — GenG
// ─────────────────────────────────────────────────────────────────────────────

async function crawlProduct(page, url) {
  try {
    log.step("navigating...");

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.locator(".headingArea h2").first().waitFor({
      state: "attached",
      timeout: 15000,
    });

    const productId = extractGenGProductId(url);

    const source = "geng";

    log.info(`productId: ${productId}`);

    const [name, price, specsData, images, rating] =
      await Promise.all([
        getGenGName(page),
        getGenGPrice(page),
        getGenGSpecs(page),
        getGenGImages(page),
        getGenGRating(page),
      ]);

    const variantData =
      await getGenGVariants(
        page,
        productId,
        price.originalPrice,
        price.discount
      );

    const product = {
      productId,
      source,

      url: normalizeGenGUrl(url),

      name,

      specs: specsData.specs,

      detail_images: specsData.detail_images,

      detail_html: specsData.detail_html,

      price: {
        originalPrice: price.originalPrice,
        salePrice: price.salePrice,
        discount: price.discount,
      },

      price_raw: {
        originalPriceText: String(price.originalPrice || ""),

        salePriceText: String(price.salePrice || ""),

        discountText: `${price.discount || 0}%`,
      },

      images,

      source_flags: [],

      source_rating_avg: rating.avg,

      source_rating_count: rating.count,

      options: variantData.options,
      addons: variantData.addons,
      variants: variantData.variants,
    };

    product.hash = hashProduct(product);

    product.image_hash = hashImageUrls(images);

    log.ok(`crawlProduct done: ${productId}`);

    return product;
  } catch (err) {
    log.error(`crawlProduct fatal: ${err.message}`);

    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HUMAN SIMULATION
// ─────────────────────────────────────────────────────────────────────────────

async function simulateHuman(page) {
  try {
    await page.waitForTimeout(800 + Math.random() * 1200);
    await page.mouse.move(Math.random() * 400, Math.random() * 400);
    await page.waitForTimeout(500 + Math.random() * 1000);
    await page.mouse.wheel(0, 300 + Math.random() * 700);
  } catch { }
}

// ─────────────────────────────────────────────────────────────────────────────
// MERGE VARIANTS
// ─────────────────────────────────────────────────────────────────────────────

function mergeVariants(oldVariants = [], freshVariants = []) {
  const map = new Map();
  for (const old of oldVariants) map.set(old.variantId, old);
  for (const fresh of freshVariants) {
    const old = map.get(fresh.variantId);
    if (!old) {
      map.set(fresh.variantId, fresh);
      continue;
    }
    map.set(fresh.variantId, {
      ...old,
      ...fresh,
      thumbnail: fresh.thumbnail || old.thumbnail,
      variant_detail_images: fresh.variant_detail_images?.length
        ? fresh.variant_detail_images
        : old.variant_detail_images,
      hash: fresh.hash ?? old.hash,
    });
  }
  return [...map.values()];
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCESS PRODUCT + FILE + MAIN — giữ nguyên từ code cũ
// ─────────────────────────────────────────────────────────────────────────────

async function processProduct({
  page,
  url,
  existingMap,
  resultMap,
  processingSet,
  stats,
  index,
  total,
}) {
  const productId = extractGenGProductId(url);

  if (!productId) {
    log.warn("missing productId");
    return;
  }
  if (processingSet.has(productId)) {
    log.warn(`already processing: ${productId}`);
    return;
  }

  processingSet.add(productId);
  console.log(`\n${"─".repeat(60)}`);
  log.info(`[${index + 1}/${total}] ${productId}`);

  try {
    const fresh = await crawlProduct(page, url);
    if (!fresh) throw new Error("crawlProduct returned null");

    await simulateHuman(page);

    const old = existingMap.get(productId);
    const productChanged = !old || old.hash !== fresh.hash;
    const imageChanged = !old || old.image_hash !== fresh.image_hash;
    const variantChanges = fresh.variants.map((v) => {
      const oldV = old?.variants?.find((ov) => ov.variantId === v.variantId);
      return { variantId: v.variantId, changed: !oldV || oldV.hash !== v.hash };
    });
    const anyVariantChanged = variantChanges.some((v) => v.changed);

    if (productChanged) log.warn(`product changed: ${productId}`);
    if (imageChanged) log.img(`images changed: ${productId}`);

    const merged = old
      ? {
        ...old,
        name: fresh.name ?? old.name,
        specs: fresh.specs ?? old.specs,
        detail_html: fresh.detail_html ?? old.detail_html,
        detail_images: fresh.detail_images?.length
          ? fresh.detail_images
          : old.detail_images,
        images: fresh.images?.length ? fresh.images : old.images,
        options: fresh.options,
        addons: fresh.addons,
        variants: mergeVariants(old.variants, fresh.variants),
        source_rating_avg: fresh.source_rating_avg ?? old.source_rating_avg,
        source_rating_count:
          fresh.source_rating_count ?? old.source_rating_count,
        price: productChanged ? fresh.price : old.price,
        price_raw: productChanged ? fresh.price_raw : old.price_raw,
        hash: fresh.hash,
        image_hash: fresh.image_hash,
        change_log: [
          ...(old.change_log ?? []).slice(-9),
          {
            crawledAt: new Date().toISOString(),
            productChanged,
            imageChanged,
            variantsChanged: variantChanges
              .filter((v) => v.changed)
              .map((v) => v.variantId),
          },
        ],
        crawledAt: new Date().toISOString(),
      }
      : {
        ...fresh,
        change_log: [
          {
            crawledAt: new Date().toISOString(),
            productChanged: true,
            imageChanged: true,
            variantsChanged: fresh.variants.map((v) => v.variantId),
          },
        ],
        crawledAt: new Date().toISOString(),
      };

    existingMap.set(productId, merged);
    resultMap.set(productId, merged);
    stats.success++;
    log.ok(
      `saved: ${productId} | changed: product=${productChanged} img=${imageChanged} variants=${anyVariantChanged}`,
    );
  } catch (err) {
    log.error(`${productId}: ${err.message}`);
    stats.failed++;
    if (existingMap.has(productId)) {
      resultMap.set(productId, existingMap.get(productId));
      stats.fallback++;
      log.warn(`fallback old data: ${productId}`);
    }
  } finally {
    processingSet.delete(productId);
  }

  const delay = humanDelay();
  log.info(`waiting ${(delay / 1000).toFixed(1)}s`);
  await sleep(delay);
}

async function processFile(sessionManager, fileName) {
  const inputPath = path.join(LINKS_DIR, fileName);
  const outputPath = path.join(OUTPUT_DIR, fileName.replace(".txt", ".jsonl"));
  const tempPath = outputPath + ".tmp";

  await fs.ensureDir(OUTPUT_DIR);

  const existingMap = new Map();
  const processingSet = new Set();
  const resultMap = new Map();

  if (fs.existsSync(outputPath)) {
    fs.readFileSync(outputPath, "utf-8")
      .split("\n")
      .forEach((line) => {
        try {
          const p = JSON.parse(line);
          if (p.productId) {
            const existing = existingMap.get(p.productId);
            if (
              !existing ||
              new Date(p.crawledAt || 0) > new Date(existing.crawledAt || 0)
            ) {
              existingMap.set(p.productId, p);
              resultMap.set(p.productId, p);
            }
          }
        } catch { }
      });
    log.info(`loaded existing: ${existingMap.size}`);
  }

  const urls = [
    ...new Set(
      fs
        .readFileSync(inputPath, "utf-8")
        .split("\n")
        .map((x) => normalizeGenGUrl(x.trim()))
        .filter(Boolean),
    ),
  ];
  log.info(`📚 total urls: ${urls.length}`);

  if (fs.existsSync(tempPath)) fs.removeSync(tempPath);

  const stats = { success: 0, failed: 0, fallback: 0 };
  let currentIndex = 0;

  async function worker(workerId) {
    const { page } = await sessionManager.safeGetPage();
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (type === "font" || type === "media") return route.abort();
      route.continue();
    });
    log.info(`worker-${workerId} started`);
    while (true) {
      const index = currentIndex++;
      if (index >= urls.length) break;
      await processProduct({
        page,
        url: urls[index],
        existingMap,
        resultMap,
        processingSet,
        stats,
        index,
        total: urls.length,
      });
    }
    await page.close();
    log.info(`worker-${workerId} finished`);
  }

  const workers = [];
  for (let i = 0; i < CONCURRENCY; i++) workers.push(worker(i + 1));
  await Promise.all(workers);

  const finalRows = [...resultMap.values()].sort((a, b) =>
    a.productId.localeCompare(b.productId),
  );
  writeJsonl(tempPath, finalRows);
  await fs.move(tempPath, outputPath, { overwrite: true });
  log.ok(
    `output written: ${path.basename(outputPath)} | rows=${finalRows.length}`,
  );
  return stats;
}

async function main() {
  const startTime = Date.now();
  log.info("🚀 starting GenG crawler...\n");

  const browser = await chromium.launch({
    headless: false,
    slowMo: 30,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  const sessionManager = new CrawlerSessionManager(browser, {
    maxPagesPerContext: CONCURRENCY,
  });

  if (!fs.existsSync(LINKS_DIR))
    throw new Error(`LINKS_DIR NOT FOUND: ${LINKS_DIR}`);

  const files = fs.readdirSync(LINKS_DIR).filter((f) => f.endsWith(".txt"));
  log.info(`📂 found ${files.length} link file(s)`);

  if (!files.length) {
    log.warn("no txt files found");
    await sessionManager.close();
    await browser.close();
    return;
  }

  const total = { success: 0, failed: 0, fallback: 0 };

  for (const file of files) {
    try {
      log.info(`\n📄 processing: ${file}`);
      const stats = await processFile(sessionManager, file);
      total.success += stats.success;
      total.failed += stats.failed;
      total.fallback += stats.fallback;
    } catch (e) {
      log.error(`FILE ERROR: ${file} — ${e.message}`);
    }
  }

  await sessionManager.close();
  await browser.close();

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  console.log(`\n${"═".repeat(60)}`);
  log.ok("🎉 ALL DONE");
  log.info(`total time: ${elapsed} min`);
  log.ok(`success: ${total.success}`);
  log.error(`failed: ${total.failed}`);
  log.warn(`fallback: ${total.fallback}`);
  console.log(`${"═".repeat(60)}`);
}

main().catch((err) => {
  log.error("fatal:", err);
  process.exit(1);
});
