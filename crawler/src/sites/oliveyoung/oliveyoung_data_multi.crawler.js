"use strict";

const path = require("path");
const fs = require("fs-extra");
const { chromium } = require("playwright");
const CrawlerSessionManager = require("../../../core/sessionManager");

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const LINKS_DIR = path.join(process.cwd(), "data/links/oliveyoung");
const OUTPUT_DIR = path.join(process.cwd(), "data/output_products/oliveyoung");

// PARALLEL WORKERS
const CONCURRENCY = 3;

// ─────────────────────────────────────────────────────────────────────────────
// LOGGER
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

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

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

function getSafeFileName(url, index) {
  const clean = url.split("?")[0];

  let name = path.basename(clean);

  if (!name || name.length < 3) {
    name = `img_${index}.jpg`;
  }

  return name;
}

async function safeEval(page, selector) {
  try {
    return await page.$eval(selector, (el) => el.innerText.trim());
  } catch {
    return null;
  }
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
  const normalized = {
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
  };
  return md5(JSON.stringify(normalized));
}

function hashVariant(v) {
  const normalized = {
    name: v.name_kr,
    price: {
      sale: v.price?.sale,
      discount: v.price?.discount,
    },
    soldout: v.is_soldout,
    flags: v.flags,
    thumbnail: v.thumbnail,
    detail_images: v.variant_detail_images,
  };
  return md5(JSON.stringify(normalized));
}

function hashImageUrls(imageUrls = []) {
  return md5(JSON.stringify([...imageUrls].sort()));
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);

    return `${u.origin}${u.pathname}?goodsNo=${u.searchParams.get("goodsNo")}`;
  } catch {
    return url;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXTRACTORS
// ─────────────────────────────────────────────────────────────────────────────

async function getImages(page) {
  try {
    await page.waitForSelector('[class*="GoodsDetailCarousel"] img', {
      timeout: 10000,
    });

    const urls = await page.$$eval(
      '[class*="GoodsDetailCarousel"] img',
      (imgs) => imgs.map((img) => img.currentSrc || img.src).filter(Boolean),
    );

    const unique = [...new Set(urls)];

    log.img(`found ${unique.length} gallery images`);

    return unique;
  } catch {
    log.warn("carousel images not found");
    return [];
  }
}

async function getRating(page) {
  try {
    await page.waitForSelector('[class*="ReviewArea_review-area"]', {
      timeout: 8000,
    });

    const avg = await page.$eval(
      '[class*="ReviewArea_rating-star"] .rating',
      (el) => {
        const text = el.innerText.replace(/[^0-9.]/g, "").trim();

        return parseFloat(text) || null;
      },
    );

    const count = await page.$eval(
      '[class*="ReviewArea_review-count"] span',
      (el) => {
        const text = el.innerText.replace(/[^0-9]/g, "").trim();

        return parseInt(text) || 0;
      },
    );

    log.star(`rating: ${avg} ⭐ | reviews: ${count.toLocaleString()}`);

    return {
      avg,
      count,
    };
  } catch (err) {
    log.warn(`rating extract failed: ${err.message}`);

    return {
      avg: null,
      count: 0,
    };
  }
}

async function openVariantDropdown(page) {
  try {
    const btn = await page.$('[class*="OptionSelector_btn-option"]');

    if (btn) {
      await btn.click();

      await page.waitForTimeout(800);

      await page.waitForSelector('[data-qa-name^="text-product-option"]', {
        timeout: 5000,
      });

      log.step("variant dropdown opened");
    }
  } catch {
    log.warn("variant dropdown open failed");
  }
}

async function getVariants(page, productId) {
  try {
    const variants = await page.$$eval(
      '[data-qa-name^="text-product-option"]',
      (nodes) =>
        nodes.map((el, i) => {
          const name =
            el.querySelector('[class*="option-item-tit"]')?.innerText.trim() ||
            null;

          const priceText =
            el.querySelector('[class*="option-item-price"]')?.innerText || "";

          const discountText =
            el.querySelector('[class*="option-item-discount"]')?.innerText ||
            "";

          const thumbnail = el.querySelector("img")?.src || null;

          const flags = Array.from(
            el.querySelectorAll('[class*="option-item-flag"]'),
          )
            .filter((f) => !f.className.includes("soldout"))
            .map((f) => f.innerText.trim())
            .filter(Boolean);

          const isSoldout = el.className.includes("is-soldout");

          return {
            index: i,
            name_kr: name,
            priceText,
            discountText,
            thumbnail,
            flags,
            isSoldout,
          };
        }),
    );

    let detailImages = [];

    try {
      detailImages = await page.$$eval(
        '[class*="ColorViewer_main-swiper"] .swiper-slide',
        (slides) =>
          slides.map((slide) => {
            const name =
              slide
                .querySelector('[class*="ColorViewer_title"]')
                ?.innerText?.trim() || null;

            const image = slide.querySelector("img")?.src || null;

            return {
              name_kr: name,
              image,
            };
          }),
      );
    } catch {}

    return variants.map((v) => {
      const matched = detailImages.find((x) => x.name_kr === v.name_kr);

      return {
        variantId: `${productId}_${v.index}`,

        name_kr: v.name_kr,

        thumbnail: v.thumbnail,

        variant_detail_images: matched?.image ? [matched.image] : [],

        flags: v.flags,

        is_soldout: v.isSoldout,

        price: {
          sale: parsePrice(v.priceText),

          discount: parseInt(v.discountText) || null,
        },

        price_raw: {
          priceText: v.priceText,

          discountText: v.discountText,
        },
      };
    });
  } catch (err) {
    log.warn(`getVariants failed: ${err.message}`);

    return [];
  }
}

async function getGlobalFlags(page) {
  try {
    const selector = '[class*="GoodsDetailInfo_flag-list"] li';

    const flags = await page.$$eval(selector, (nodes) =>
      nodes.map((el) => el.innerText.trim()).filter(Boolean),
    );

    if (flags.length > 0) {
      log.star(`flags found: ${flags.join(", ")}`);
    }

    return flags;
  } catch (err) {
    log.warn(`global flags extract failed: ${err.message}`);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MERGE
// ─────────────────────────────────────────────────────────────────────────────
function mergeVariants(oldVariants = [], freshVariants = []) {
  const map = new Map();

  for (const old of oldVariants) {
    map.set(old.variantId, old);
  }

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
// CRAWL PRODUCT
// ─────────────────────────────────────────────────────────────────────────────

async function crawlProduct(page, url) {
  try {
    log.step("navigating...");

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForSelector('[class*="GoodsDetailInfo_title"]', {
      timeout: 10000,
    });

    const productId = url.match(/goodsNo=([^&]+)/)?.[1];
    const source = "oliveyoung";

    log.info(`productId: ${productId}`);

    const name = await safeEval(page, '[class*="GoodsDetailInfo_title"]');

    const globalFlags = await getGlobalFlags(page);

    try {
      const btn = await page.$('button:has-text("상품정보 제공고시")');
      if (btn) {
        const expanded = await btn.getAttribute("aria-expanded");
        if (expanded === "false") {
          await btn.click();
          log.step("specs accordion expanded");
        }
        await page.waitForSelector('[class*="Accordion_table"] tbody tr', {
          timeout: 3000,
        });
      }
    } catch {
      log.warn("specs accordion not found or already open");
    }

    const specs = await page.$$eval(
      '[class*="Accordion_table"] tbody tr',
      (rows) => {
        const result = {};
        rows.forEach((row) => {
          const key = row.querySelector("th")?.innerText?.trim();
          const value = row.querySelector("td")?.innerText?.trim();
          if (key && value) result[key] = value;
        });
        return result;
      },
    );
    log.info(`specs: ${Object.keys(specs).length} fields`);

    const imageUrls = await getImages(page);

    const originalPrice = await safeEval(
      page,
      '[data-qa-name="text-product-original-price"]',
    );

    const salePrice = await safeEval(
      page,
      '[data-qa-name="text-product-discount-price"]',
    );

    const discount =
      (await safeEval(page, '[class*="GoodsDetailInfo_rate"]')) || null;

    const rating = await getRating(page);

    let variants = await getVariants(page, productId);

    if (!variants.length) {
      await openVariantDropdown(page);

      for (let attempt = 1; attempt <= 3; attempt++) {
        variants = await getVariants(page, productId);

        if (variants.length) break;

        await sleep(1000);
      }
    }

    const product = {
      productId,
      source,
      url,
      name,
      specs,
      price: {
        originalPrice: parsePrice(originalPrice),
        salePrice: parsePrice(salePrice),
        discount: parseInt(discount) || null,
      },
      price_raw: {
        originalPriceText: originalPrice,
        salePriceText: salePrice,
        discountText: discount,
      },
      images: imageUrls,
      source_flags: globalFlags,
      source_rating_avg: rating.avg,
      source_rating_count: rating.count,
      variants,
    };
    product.hash = hashProduct(product);
    product.image_hash = hashImageUrls(imageUrls);
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
// PROCESS PRODUCT
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
  const productId = new URL(url).searchParams.get("goodsNo") || null;

  if (!productId) {
    log.warn("missing productId");
    return;
  }

  // đang xử lý ở worker khác
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

    // So sánh hash để biết có thay đổi không
    const productChanged = !old || old.hash !== fresh.hash;
    const imageChanged = !old || old.image_hash !== fresh.image_hash;

    const variantChanges = fresh.variants.map((v) => {
      const oldV = old?.variants?.find((ov) => ov.variantId === v.variantId);
      return {
        variantId: v.variantId,
        changed: !oldV || oldV.hash !== v.hash,
      };
    });

    const anyVariantChanged = variantChanges.some((v) => v.changed);

    if (productChanged) log.warn(`product changed: ${productId}`);
    if (imageChanged) log.img(`images changed: ${productId}`);
    if (anyVariantChanged) {
      const changedIds = variantChanges
        .filter((v) => v.changed)
        .map((v) => v.variantId);
      log.warn(`variants changed: ${changedIds.join(", ")}`);
    }

    const merged = old
      ? {
          ...old,
          name: fresh.name ?? old.name,
          specs: fresh.specs ?? old.specs,
          images: fresh.images?.length ? fresh.images : old.images,
          variants: mergeVariants(old.variants, fresh.variants),
          source_flags: fresh.source_flags ?? old.source_flags,
          source_rating_avg: fresh.source_rating_avg ?? old.source_rating_avg,
          source_rating_count:
            fresh.source_rating_count ?? old.source_rating_count,

          price: productChanged ? fresh.price : old.price,
          price_raw: productChanged ? fresh.price_raw : old.price_raw,

          // Cập nhật hash mới
          hash: fresh.hash,
          image_hash: fresh.image_hash,

          // Lưu lịch sử thay đổi
          change_log: [
            ...(old.change_log ?? []).slice(-9), // giữ 10 bản gần nhất
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

    const current = resultMap.get(productId);

    if (
      !current ||
      new Date(merged.crawledAt || 0) > new Date(current.crawledAt || 0)
    ) {
      resultMap.set(productId, merged);
    }

    stats.success++;

    log.ok(
      `saved: ${productId} | changed: product=${productChanged} img=${imageChanged} variants=${anyVariantChanged}`,
    );
  } catch (err) {
    log.error(`${productId}: ${err.message}`);
    stats.failed++;

    if (existingMap.has(productId)) {
      const fallbackData = existingMap.get(productId);

      resultMap.set(productId, fallbackData);
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

// ─────────────────────────────────────────────────────────────────────────────
// PROCESS FILE
// ─────────────────────────────────────────────────────────────────────────────

async function processFile(sessionManager, fileName) {
  const inputPath = path.join(LINKS_DIR, fileName);

  const outputPath = path.join(OUTPUT_DIR, fileName.replace(".txt", ".jsonl"));

  const tempPath = outputPath + ".tmp";

  await fs.ensureDir(OUTPUT_DIR);

  const existingMap = new Map();
  const processingSet = new Set();
  const resultMap = new Map();

  if (fs.existsSync(outputPath)) {
    const lines = fs.readFileSync(outputPath, "utf-8").split("\n");

    lines.forEach((line) => {
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
        .map((x) => normalizeUrl(x.trim()))
        .filter(Boolean),
    ),
  ];
  log.info(`📚 total urls: ${urls.length}`);

  if (fs.existsSync(tempPath)) {
    fs.removeSync(tempPath);
  }

  const stats = {
    success: 0,
    failed: 0,
    fallback: 0,
  };

  let currentIndex = 0;

  async function worker(workerId) {
    const { page } = await sessionManager.safeGetPage();

    await page.route("**/*", (route) => {
      const type = route.request().resourceType();

      if (type === "font" || type === "media") {
        return route.abort();
      }

      route.continue();
    });

    log.info(`worker-${workerId} started`);

    while (true) {
      const index = currentIndex++;

      if (index >= urls.length) {
        break;
      }

      const url = urls[index];

      await processProduct({
        page,
        url,
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

  for (let i = 0; i < CONCURRENCY; i++) {
    workers.push(worker(i + 1));
  }

  await Promise.all(workers);

  const finalRows = [...resultMap.values()].sort((a, b) =>
    a.productId.localeCompare(b.productId),
  );

  writeJsonl(tempPath, finalRows);

  await fs.move(tempPath, outputPath, {
    overwrite: true,
  });

  log.ok(
    `output written: ${path.basename(outputPath)} | rows=${finalRows.length}`,
  );

  return stats;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();

  log.info("🚀 starting crawler...\n");

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

  if (!fs.existsSync(LINKS_DIR)) {
    throw new Error(`LINKS_DIR NOT FOUND: ${LINKS_DIR}`);
  }

  const files = fs.readdirSync(LINKS_DIR).filter((f) => f.endsWith(".txt"));

  log.info(`📂 found ${files.length} link file(s)`);

  if (!files.length) {
    log.warn("no txt files found");

    await sessionManager.close();

    await browser.close();

    return;
  }

  const total = {
    success: 0,
    failed: 0,
    fallback: 0,
  };

  for (const file of files) {
    try {
      log.info(`\n📄 processing: ${file}`);

      const stats = await processFile(sessionManager, file);

      total.success += stats.success;

      total.failed += stats.failed;

      total.fallback += stats.fallback;
    } catch (e) {
      log.error(`FILE ERROR: ${file}`);

      log.error(e.message);
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
