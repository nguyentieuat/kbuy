"use strict";

const path = require("path");
const fs = require("fs-extra");
const { chromium } = require("playwright");
const CrawlerSessionManager = require("../../../core/sessionManager");

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const LINKS_DIR = path.join(process.cwd(), "data/links/t1");
const OUTPUT_DIR = path.join(process.cwd(), "data/output_products/t1");
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

function normalizeT1Url(url) {
  try {
    if (url.startsWith("/")) {
      return `https://shop-t1.gg${url}`;
    }

    return url.split("?")[0];
  } catch {
    return url;
  }
}

function extractT1ProductId(url) {
  try {
    const match = url.match(/\/product\/.*?\/(\d+)\//);

    return match ? match[1] : null;
  } catch {
    return null;
  }
}
// ─────────────────────────────────────────────────────────────────────────────
// MUSINSA EXTRACTORS
// ─────────────────────────────────────────────────────────────────────────────
async function getT1Images(page) {
  try {
    const images = await page.$$eval(".listImg img", (imgs) =>
      imgs.map((img) => img.src || img.getAttribute("src")).filter(Boolean),
    );

    return [...new Set(images)];
  } catch {
    return [];
  }
}

async function getT1Name(page) {
  try {
    return await page.$eval(".headingArea h1", (el) => el.innerText.trim());
  } catch {
    return null;
  }
}

async function getT1Price(page) {
  try {
    const originalText = await page
      .$eval("#span_product_price_text", (el) => el.innerText.trim())
      .catch(() => null);

    const saleText = await page
      .$eval("#span_product_price_sale", (el) => {
        return Array.from(el.childNodes)
          .filter((n) => n.nodeType === Node.TEXT_NODE)
          .map((n) => n.textContent.trim())
          .join(" ");
      })
      .catch(() => null);

    const discountText = await page
      .$eval(".discount-per", (el) => el.innerText.trim())
      .catch(() => null);

    return {
      originalPrice: parsePrice(originalText),
      salePrice: parsePrice(saleText || originalText),
      discount: parseInt((discountText || "").replace(/[^\d]/g, ""), 10) || 0,
    };
  } catch (err) {
    log.warn(`getT1Price failed: ${err.message}`);

    return {
      originalPrice: null,
      salePrice: null,
      discount: null,
    };
  }
}

async function getT1Rating(page) {
  try {
    const avg = await page.evaluate(() => {
      const selectors = [
        ".review-summary__per",
        ".current-grade-rate",
        ".jsScoreRate",
      ];

      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent.trim()) {
          return el.textContent.trim();
        }
      }

      // fallback: parse text node "5" trong review-score
      const fallback = document.querySelector(".review-score__rate");
      if (fallback) {
        const match = fallback.textContent.match(/(\d+(\.\d+)?)/);
        if (match) return match[1];
      }

      return null;
    });

    const count = await page.evaluate(() => {
      const el =
        document.querySelector(".total-count-container .value") ||
        document.querySelector(".review-summary__count") ||
        document.querySelector(".board-count .snap_review_count");

      return el ? Number(el.textContent.trim().replace(/,/g, "")) : 0;
    });

    return {
      avg: avg ? Number(avg) : null,
      count,
    };
  } catch (err) {
    return {
      avg: null,
      count: 0,
    };
  }
}

async function getT1Specs(page) {
  try {
    // lấy toàn bộ html detail
    const detailHtml = await page
      .locator("#prdDetail .edibot-product-detail")
      .first()
      .innerHTML()
      .catch(() => null);

    // hoặc lấy riêng image urls
    const detailImages = await page.$$eval(
      "#prdDetail .edibot-product-detail img",
      (imgs) => {
        return imgs
          .map((img) => {
            return (
              img.getAttribute("data-src") ||
              img.getAttribute("data-original") ||
              img.getAttribute("data-lazy-src") ||
              img.getAttribute("ec-data-src") ||
              img.src ||
              img.getAttribute("src")
            );
          })
          .filter(Boolean)
          .filter((src) => !src.startsWith("data:image"));
      },
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

async function getT1Variants(page, productId) {
  try {
    const opt1Selector = 'select[name="option1"]';
    const opt2Selector = 'select[name="option2"]';

    const results = [];

    // ─────────────────────────────
    // GET OPTIONS (SAFE)
    // ─────────────────────────────
    async function getOptions(selector) {
      const exists = await page.$(selector);
      if (!exists) return [];

      return await page.$$eval(selector + " option", (opts) => {
        return opts
          .map((o) => ({
            value: o.value,
            text: o.innerText.trim(),
            disabled:
              o.disabled ||
              o.value === "*" ||
              o.value === "**" ||
              o.innerText.includes("품절"),
          }))
          .filter((o) => o.value && o.value !== "*" && o.value !== "**");
      });
    }

    // ─────────────────────────────
    // SELECT OPTION SAFE
    // ─────────────────────────────
    async function select(selector, value) {
      await page.selectOption(selector, value);
      await page.waitForTimeout(800);
    }

    // ─────────────────────────────
    // WAIT VARIANTS RENDER
    // ─────────────────────────────
    async function waitVariants() {
      await page
        .waitForFunction(() => {
          return (
            document.querySelectorAll(".option_products tr.option_product")
              .length > 0
          );
        })
        .catch(() => {});
    }

    // ─────────────────────────────
    // EXTRACT VARIANTS
    // ─────────────────────────────
    async function extractRendered() {
      return await page.$$eval(
        ".option_products tr.option_product",
        (rows, productId) => {
          function parsePrice(t) {
            return parseInt((t || "").replace(/[^\d]/g, ""), 10) || null;
          }

          return rows.map((row, idx) => {
            const input = row.querySelector(".option_box_id");
            const optionCode = input?.value || `${productId}_${idx}`;

            const text = row.querySelector("p.product")?.innerText || "";

            const soldout =
              text.includes("[품절]") || text.includes("Sold Out");

            const priceText =
              row.querySelector('[id*="_price"]')?.innerText?.trim() ||
              row
                .querySelector(".ec-front-product-item-price")
                ?.innerText?.trim() ||
              "";

            return {
              variantId: optionCode,
              name_kr: text.trim(),
              thumbnail: null,
              variant_detail_images: [],
              flags: [],
              is_soldout: soldout,
              price: {
                sale: parsePrice(priceText),
                discount: null,
              },
              price_raw: {
                priceText,
                discountText: "",
              },
            };
          });
        },
        productId,
      );
    }

    // ─────────────────────────────
    // GET OPTIONS LIST (option1)
    // ─────────────────────────────
    const opt1List = await getOptions(opt1Selector);
    const hasOpt2 = await page.$(opt2Selector);

    for (const op1 of opt1List) {
      if (op1.disabled) continue;

      // select option1
      await select(opt1Selector, op1.value);
      await waitVariants();

      // ─────────────────────────────
      // CASE 1: NO OPTION2
      // ─────────────────────────────
      if (!hasOpt2) {
        const variants = await extractRendered();
        results.push(...variants);
        continue;
      }

      // ─────────────────────────────
      // GET option2 AFTER selecting option1 (IMPORTANT)
      // ─────────────────────────────
      const opt2List = await getOptions(opt2Selector);

      // CASE 2: option2 exists but empty → treat as single variant
      if (!opt2List.length) {
        const variants = await extractRendered();
        results.push(...variants);
        continue;
      }

      // CASE 3: real dependent options
      for (const op2 of opt2List) {
        if (op2.disabled) continue;

        await select(opt2Selector, op2.value);
        await waitVariants();

        const variants = await extractRendered();
        results.push(...variants);
      }
    }

    // ─────────────────────────────
    // DEDUPE
    // ─────────────────────────────
    return [...new Map(results.map((v) => [v.variantId, v])).values()];
  } catch (err) {
    console.log("getT1Variants error:", err.message);
    return [];
  }
}
// ─────────────────────────────────────────────────────────────────────────────
// CRAWL PRODUCT — MUSINSA
// ─────────────────────────────────────────────────────────────────────────────

async function crawlProduct(page, url) {
  try {
    log.step("navigating...");

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.locator(".headingArea h1").first().waitFor({
      state: "attached",
      timeout: 15000,
    });

    const productId = extractT1ProductId(url);

    const source = "t1";

    log.info(`productId: ${productId}`);

    const [name, price, specsData, images, variants, rating] =
      await Promise.all([
        getT1Name(page),
        getT1Price(page),
        getT1Specs(page),
        getT1Images(page),
        getT1Variants(page, productId),
        getT1Rating(page),
      ]);

    const product = {
      productId,
      source,

      url: normalizeT1Url(url),

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
  const productId = extractT1ProductId(url);

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
        .map((x) => normalizeT1Url(x.trim()))
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
  log.info("🚀 starting musinsa crawler...\n");

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
