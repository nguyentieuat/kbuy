"use strict";

const path = require("path");
const fs = require("fs-extra");
const { chromium } = require("playwright");
const CrawlerSessionManager = require("../../../core/sessionManager");

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const OUTPUT_DIR = path.join(process.cwd(), "data/output_products/kgc");
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

function absoluteUrl(url, baseUrl) {
  if (!url) return null;

  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}

function normalizeDetailHtml(html, baseUrl) {
  if (!html) return html;

  return html.replace(
    /(ec-data-src|src)="([^"]+)"/gi,
    (_, attr, url) => {
      return `${attr}="${absoluteUrl(url, baseUrl)}"`;
    }
  );
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

      rating: {
        avg: product.source_rating_avg,
        count: product.source_rating_count,
      },
    }),
  );
}

function hashImageUrls(imageUrls = []) {
  return md5(JSON.stringify([...imageUrls].sort()));
}

function normalizeKGCUrl(url) {
  try {
    const u = new URL(url);

    return `${u.origin}${u.pathname}?itemId=${u.searchParams.get("itemId")}`;
  } catch {
    return url;
  }
}

function extractKGCProductId(url) {
  try {
    const u = new URL(url);

    return u.searchParams.get("itemId");
  } catch {
    return null;
  }
}
// ─────────────────────────────────────────────────────────────────────────────
// MUSINSA EXTRACTORS
// ─────────────────────────────────────────────────────────────────────────────
async function getKGCImages(page) {
  try {
    const images = await page.$$eval(
      ".goods-image .bxslider li:not(.bx-clone) img",
      imgs =>
        imgs
          .map(img =>
            img.getAttribute("src") ||
            img.getAttribute("data-original")
          )
          .filter(Boolean)
    );

    return [...new Set(images)];
  } catch {
    return [];
  }
}

async function getKGCName(page) {
  try {
    return await page.$eval(
      ".goods-info h1",
      (el) => {
        const clone = el.cloneNode(true);

        clone.querySelectorAll("i,button")
          .forEach((x) => x.remove());

        return clone.textContent
          .replace(/\s+/g, " ")
          .trim();
      }
    );
  } catch {
    return null;
  }
}

async function getKGCPrice(page) {
  try {
    const data = await page.$eval(
      ".goods-price-info",
      el => {
        const strike =
          el.querySelector(".strike")
            ?.textContent
            ?.trim();

        const sale =
          el.querySelector(".price")
            ?.textContent
            ?.trim();

        const discount =
          el.querySelector(".discount")
            ?.textContent
            ?.trim();

        return {
          strike,
          sale,
          discount,
          text: el.innerText,
        };
      }
    );

    // có 할인가
    if (data.sale) {
      return {
        originalPrice: parsePrice(data.strike),
        salePrice: parsePrice(data.sale),
        discount:
          parseInt(
            (data.discount || "")
              .replace(/[^\d]/g, ""),
            10
          ) || 0,
      };
    }

    // không 할인가
    const match = data.text.match(
      /판매가\s*([\d,]+)원/
    );

    const price = parsePrice(
      match?.[1]
    );

    return {
      originalPrice: price,
      salePrice: price,
      discount: 0,
    };
  } catch (err) {
    log.warn(
      `getKGCPrice failed: ${err.message}`
    );

    return {
      originalPrice: null,
      salePrice: null,
      discount: 0,
    };
  }
}

async function getMusinsaDetail(page) {
  try {
    return await page.evaluate(() => {
      const container = document.querySelector(
        '[class*="Contents__StyledInner"]'
      );

      if (!container) {
        return {
          detailHtml: "",
          detailImages: [],
        };
      }

      return {
        detailHtml: container.innerHTML,

        detailImages: [
          ...container.querySelectorAll("img"),
        ]
          .map(
            (img) =>
              img.dataset.src ||
              img.dataset.fallbackSrc ||
              img.src
          )
          .filter(Boolean),
      };
    });
  } catch (err) {
    return {
      detailHtml: "",
      detailImages: [],
    };
  }
}
async function getKGCSpecs(page) {
  try {
    const specs = await page.$$eval(
      ".info-table tbody tr",
      rows => {
        const result = {};

        rows.forEach(row => {
          const key =
            row.querySelector("th")
              ?.innerText
              ?.trim();

          const value =
            row.querySelector("td")
              ?.innerText
              ?.trim();

          if (key && value) {
            result[key] = value;
          }
        });

        return result;
      }
    );

    const { detailHtml, detailImages } = getMusinsaDetail(page);


    return {
      specs,
      detail_html: normalizeDetailHtml(
        detailHtml,
        page.url()
      ),
      detail_images: [...new Set(detailImages)],
    };
  } catch (err) {
    return {
      specs: {},
      detail_html: null,
      detail_images: [],
    };
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

    await page.locator(".goods-info h1")
      .first()
      .waitFor({
        state: "visible",
        timeout: 15000,
      });

    const productId = extractKGCProductId(url);

    const source = "KGC";

    log.info(`productId: ${productId}`);

    const [name, price, specsData, images] =
      await Promise.all([
        getKGCName(page),
        getKGCPrice(page),
        getKGCSpecs(page),
        getKGCImages(page),
      ]);


    const product = {
      productId,
      source,

      url: normalizeKGCUrl(url),

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
  const productId = extractKGCProductId(url);

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

    const updated = {
      ...old,

      name: fresh.name ?? old?.name,

      specs: fresh.specs,

      detail_html: fresh.detail_html,

      detail_images:
        fresh.detail_images?.length
          ? fresh.detail_images
          : old?.detail_images,

      images:
        fresh.images?.length
          ? fresh.images
          : old?.images,

      price: fresh.price,

      price_raw: fresh.price_raw,

      source_rating_avg:
        old?.source_rating_avg ?? 0,

      source_rating_count:
        old?.source_rating_count ?? 0,

      source_purchase_count:
        old?.source_purchase_count ?? 0,

      hash: fresh.hash,
      image_hash: fresh.image_hash,

      crawledAt: new Date().toISOString(),
    };

    existingMap.set(productId, updated);
    resultMap.set(productId, updated);
    stats.success++;
    log.ok(
      `saved: ${productId} | images=${fresh.images.length}`
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
  const outputPath = path.join(
    OUTPUT_DIR,
    fileName
  );

  const tempPath = outputPath + ".tmp";

  await fs.ensureDir(OUTPUT_DIR);

  const existingMap = new Map();
  const resultMap = new Map();
  const processingSet = new Set();

  let rows = [];

  try {
    rows = fs
      .readFileSync(outputPath, "utf8")
      .split("\n")
      .filter(Boolean)
      .map(line => JSON.parse(line));
  } catch (err) {
    log.error(
      `load jsonl failed: ${err.message}`
    );

    return {
      success: 0,
      failed: 0,
      fallback: 0,
    };
  }

  for (const p of rows) {
    if (!p.productId) continue;

    existingMap.set(
      String(p.productId),
      p
    );

    resultMap.set(
      String(p.productId),
      p
    );
  }

  const urls = [
    ...new Set(
      rows
        .map(p => p.url)
        .filter(Boolean)
    ),
  ];

  log.info(
    `loaded existing: ${existingMap.size}`
  );

  log.info(
    `📚 total urls: ${urls.length}`
  );

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

  // ─────────────────────────────
  // Write output — JSON (không phải JSONL)
  // ─────────────────────────────
  const finalRows = [...resultMap.values()].sort((a, b) =>
    String(a.productId).localeCompare(String(b.productId)),
  );

  const jsonlContent = finalRows
    .map(row => JSON.stringify(row))
    .join("\n");

  await fs.writeFile(
    tempPath,
    jsonlContent,
    "utf8"
  );
  await fs.move(
    tempPath,
    outputPath,
    { overwrite: true }
  );

  log.ok(`output written: ${path.basename(outputPath)} | rows=${finalRows.length}`);
  return stats;
}

async function main() {
  const startTime = Date.now();
  log.info("🚀 starting KGC crawler...\n");

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

  if (!fs.existsSync(OUTPUT_DIR)) {
    throw new Error(`OUTPUT_DIR NOT FOUND: ${OUTPUT_DIR}`);
  }

  // đọc toàn bộ output json từ bước crawl list
  const files = fs
    .readdirSync(OUTPUT_DIR)
    .filter(
      (f) =>
        f.endsWith(".jsonl") &&
        !f.endsWith(".backup.jsonl")
    );

  log.info(`📂 found ${files.length} product file(s)`);

  if (!files.length) {
    log.warn("no json files found");

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

      const stats = await processFile(
        sessionManager,
        file
      );

      total.success += stats.success;
      total.failed += stats.failed;
      total.fallback += stats.fallback;
    } catch (e) {
      log.error(
        `FILE ERROR: ${file} — ${e.message}`
      );
    }
  }

  await sessionManager.close();
  await browser.close();

  const elapsed = (
    (Date.now() - startTime) /
    1000 /
    60
  ).toFixed(1);

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
