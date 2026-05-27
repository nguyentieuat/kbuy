"use strict";

const path = require("path");
const fs = require("fs-extra");
const { chromium } = require("playwright");
const CrawlerSessionManager = require("../../../core/sessionManager");

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const LINKS_DIR = path.join(process.cwd(), "data/links/GenG");
const OUTPUT_DIR = path.join(process.cwd(), "data/output_products/GenG");
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
      price: { sale: v.price?.sale, discount: v.price?.discount },
      soldout: v.is_soldout,
      thumbnail: v.thumbnail,
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

function extractGenGProductId(url) {
  try {
    const match = url.match(/\/product\/.*?\/(\d+)\//);

    return match ? match[1] : null;
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
    // ─────────────────────────────
    // 0. CLICK TAB "상세정보" (quan trọng)
    // ─────────────────────────────
    const tab = page.locator('li:has(a:has-text("상세정보")) a').first();

    if (await tab.count()) {
      await tab.click().catch(() => {});
    }

    // đợi tab active (class selected)
    await page
      .locator('li.selected:has(a:has-text("상세정보"))')
      .waitFor({ timeout: 5000 })
      .catch(() => {});

    // đợi DOM render thật sự
    await page.waitForTimeout(1200);

    // ─────────────────────────────
    // 1. ROOT
    // ─────────────────────────────
    const root = page.locator(".edibot-product-detail").first();

    await root.waitFor({ state: "attached", timeout: 5000 }).catch(() => {});

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
      detail_html: detailHtml,
      detail_images: detailImages,
    };
  } catch (err) {
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

async function getGenGVariants(page, productId) {
  try {
    const results = [];

    const parsePrice = (t) =>
      parseInt((t || "").replace(/[^\d]/g, ""), 10) || 0;

    // ─────────────────────────────
    // 0. PRODUCT NAME (STABLE)
    // ─────────────────────────────
    const productName = cleanText(
      await page.$eval(".headingArea h2", (el) => el.innerText),
    );

    // ─────────────────────────────
    // 1. SIZE OPTIONS (LABEL SOURCE OF TRUTH)
    // ─────────────────────────────
    const sizes = await page.$$eval("#product_option_id1 option", (opts) =>
      opts
        .map((o) => {
          const text = (o.label || o.textContent || "")
            .replace(/\[품절\]/g, "")
            .replace(/\s+/g, " ")
            .trim();

          const type = o.parentElement?.label || "OPTION"; // SIZE / COLOR / etc

          return {
            value: o.value,
            text,
            type,
            disabled: o.disabled || o.textContent.includes("품절"),
          };
        })
        .filter((o) => o.value && o.value !== "*" && o.value !== "**"),
    );

    // ─────────────────────────────
    // 2. LOOP OPTIONS
    // ─────────────────────────────
    for (const size of sizes) {
      if (size.disabled) continue;

      await page.selectOption("#product_option_id1", size.value);

      await page.waitForFunction(
        () =>
          document.querySelectorAll(".option_products tr.option_product")
            .length > 0,
        null,
        { timeout: 5000 },
      );

      await page
        .waitForSelector(".option_products tr.option_product", {
          timeout: 3000,
        })
        .catch(() => {});

      // ─────────────────────────────
      // 3. BASE VARIANTS (NO STRING PARSE)
      // ─────────────────────────────
      const baseVariants = await page.$$eval(
        ".option_products tr.option_product",
        (rows, sizeType) => {
          const parsePrice = (t) =>
            parseInt((t || "").replace(/[^\d]/g, ""), 10) || 0;

          return rows.map((row) => {
            const nameEl = row.querySelector("p.product");

            const product = nameEl.childNodes[0]?.textContent?.trim() || "";

            const option =
              nameEl.querySelector("span")?.textContent?.trim() || "";

            const price = parsePrice(
              row.querySelector(".ec-front-product-item-price")?.innerText,
            );

            const input = row.querySelector(".option_box_id");

            return {
              variantId: input?.value || null,
              product,
              option,
              optionType: sizeType, // 👈 IMPORTANT
              price,
            };
          });
        },
        size.type, // 👈 inject từ NodeJS
      );

      // ─────────────────────────────
      // 4. PUSH BASE VARIANTS (CLEAN)
      // ─────────────────────────────
      for (const v of baseVariants) {
        results.push({
          variantId: v.variantId,
          type: "variant",
          name: cleanText(`${v.product} - ${v.optionType} ${v.option}`),
          price: v.price,
        });
      }

      // ─────────────────────────────
      // 5. ADDONS
      // ─────────────────────────────
      const addons = await page.$$eval(
        ".productSet.additional li.xans-record-",
        (items) =>
          items.map((item) => {
            const name =
              item.querySelector(".name strong")?.textContent?.trim() || "";

            const price =
              parseInt(
                (
                  item.querySelector(".price strong")?.textContent || ""
                ).replace(/[^\d]/g, ""),
                10,
              ) || 0;

            const addonId = item
              .querySelector("select")
              ?.getAttribute("option_product_no");

            const options = Array.from(item.querySelectorAll("select option"))
              .map((o) => ({
                value: o.value,
                text: (o.label || o.textContent || "")
                  .replace(/\[품절\]/g, "")
                  .replace(/\s+/g, " ")
                  .trim(),
                disabled: o.disabled || o.textContent.includes("품절"),
              }))
              .filter((o) => o.value && o.value !== "*" && o.value !== "**");

            return { addonId, name, price, options };
          }),
      );

      // ─────────────────────────────
      // 6. FLATTEN ADDONS (NO SIZE DUPLICATION)
      // ─────────────────────────────
      for (const base of baseVariants) {
        for (const addon of addons) {
          for (const opt of addon.options) {
            if (opt.disabled) continue;

            results.push({
              variantId: `${size.value}|${base.variantId}|addon_${addon.addonId}_${opt.value}`,
              type: "variant",
              name: cleanText(
                [base.name, addon.name, opt.text].join(" - "),
              ),
              price: base.price + addon.price,
            });
          }
        }
      }
    }

    return results;
  } catch (err) {
    console.log("getGenGVariants error:", err.message);
    return [];
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

    const [name, price, specsData, images, variants, rating] =
      await Promise.all([
        getGenGName(page),
        getGenGPrice(page),
        getGenGSpecs(page),
        getGenGImages(page),
        getGenGVariants(page, productId),
        getGenGRating(page),
      ]);

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

      variants,
    };

    product.hash = hashProduct(product);

    product.image_hash = hashImageUrls(images);

    product.variants = product.variants.map((v) => ({
      ...v,
      hash: hashVariant(v),
    }));

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
  } catch {}
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
        } catch {}
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
