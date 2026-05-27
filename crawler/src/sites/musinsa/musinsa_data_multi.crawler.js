"use strict";

const path = require("path");
const fs = require("fs-extra");
const { chromium } = require("playwright");
const CrawlerSessionManager = require("../../../core/sessionManager");

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const LINKS_DIR = path.join(process.cwd(), "data/links/musinsa");
const OUTPUT_DIR = path.join(process.cwd(), "data/output_products/musinsa");
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

function normalizeMusinsaUrl(url) {
  try {
    const u = new URL(url);

    const match = u.pathname.match(/\/(?:goods|products)\/(\d+)/);

    if (match) {
      return `https://www.musinsa.com/products/${match[1]}`;
    }

    return url;
  } catch {
    return url;
  }
}

function extractMusinsaProductId(url) {
  try {
    const match = url.match(/\/(?:goods|products)\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
// ─────────────────────────────────────────────────────────────────────────────
// MUSINSA EXTRACTORS
// ─────────────────────────────────────────────────────────────────────────────
async function toBigImageUrl(url) {
  if (!url) return null;

  const bigUrl = url
    .replace("/thumbnails/", "/")
    .replace(/_(\d+)\.(jpg|jpeg|png|webp)$/i, "_big.$2");

  try {
    const res = await fetch(bigUrl, {
      method: "HEAD",
    });

    if (res.ok) {
      return bigUrl;
    }
  } catch {}

  return url;
}

async function getMusinsaImages(page) {
  try {
    await page.waitForSelector('[class*="Pagination__Bullet"] img', {
      timeout: 10000,
    });

    const rawUrls = await page.$$eval(
      '[class*="Pagination__Bullet"] img',
      (imgs) =>
        imgs
          .map((img) => img.currentSrc || img.src)
          .filter(Boolean)
          .filter((src) => !src.includes("/snap/")),
    );

    const urls = [];

    for (const url of rawUrls) {
      urls.push(await toBigImageUrl(url));
    }

    return [...new Set(urls)];
  } catch (err) {
    log.warn(`musinsa images not found: ${err.message}`);
    return [];
  }
}

async function getMusinsaName(page) {
  try {
    return await page.$eval(
      '[class*="GoodsName__Wrap"] [data-mds="Typography"]',
      (el) => el.innerText.trim(),
    );
  } catch {
    return null;
  }
}

async function getMusinsaPrice(page) {
  try {
    // Giá gốc (gạch ngang)
    const originalPrice = await page
      .$eval('[class*="Price__DiscountWrap"] [data-mds="Typography"]', (el) =>
        el.innerText.trim(),
      )
      .catch(() => null);

    // % giảm giá
    const discountRate = await page
      .$eval('[class*="Price__DiscountRate"]', (el) => el.innerText.trim())
      .catch(() => null);

    // Giá hiện tại
    const salePrice = await page
      .$eval('[class*="Price__CalculatedPrice"]', (el) => el.innerText.trim())
      .catch(() => null);

    return {
      originalPrice: parsePrice(originalPrice),
      salePrice: parsePrice(salePrice),
      discount: parseInt((discountRate || "").replace(/[^\d]/g, "")) || null,
    };
  } catch (err) {
    log.warn(`price extract failed: ${err.message}`);
    return { originalPrice: null, salePrice: null, discount: null };
  }
}

async function getMusinsaRating(page) {
  try {
    await page.waitForSelector('[class*="ReviewSummary__Wrap"]', {
      timeout: 8000,
    });

    const avg = await page
      .$eval(
        '[class*="ReviewSummary__Wrap"] [data-mds="Typography"]:first-of-type',
        (el) => parseFloat(el.innerText.trim()) || null,
      )
      .catch(() => null);

    const countText = await page
      .$eval(
        '[class*="ReviewSummary__Wrap"] [data-mds="Typography"]:last-of-type',
        (el) => el.innerText.trim(),
      )
      .catch(() => "0");

    const count = parseInt((countText || "").replace(/[^\d]/g, "")) || 0;

    log.star(`rating: ${avg} ⭐ | reviews: ${count}`);
    return { avg, count };
  } catch {
    log.warn("rating extract failed");
    return { avg: null, count: 0 };
  }
}

async function getMusinsaSpecs(page) {
  try {
    const specs = await page.$$eval(
      'dl[class*="Layout__Wrap"] > div',
      (rows) => {
        const result = {};

        rows.forEach((row) => {
          const key = row.querySelector("dt")?.innerText?.trim();
          const value = row.querySelector("dd")?.innerText?.trim();

          if (!key || !value) return;

          result[key] = value;
        });

        return result;
      },
    );

    log.info(`specs: ${Object.keys(specs).length} fields`);

    return specs;
  } catch (err) {
    log.warn(`specs extract failed: ${err.message}`);
    return {};
  }
}

async function openMusinsaVariantDropdown(page) {
  try {
    // Click vào dropdown trigger
    const trigger = await page.$('[data-mds="DropdownTriggerInput"]');
    if (trigger) {
      await trigger.click();
      await page.waitForTimeout(800);

      // Chờ dropdown menu hiển thị
      await page.waitForSelector('[data-mds="StaticDropdownMenuContent"]', {
        timeout: 5000,
      });

      log.step("musinsa variant dropdown opened");
      return true;
    }
    return false;
  } catch {
    log.warn("musinsa variant dropdown open failed");
    return false;
  }
}

async function getMusinsaVariants(page, productId) {
  try {
    const dropdowns = await page.$$(
      '[class*="OptionDropdown__Wrapper"]',
    );

    if (!dropdowns.length) {
      log.warn("no variant dropdown");
      return [];
    }

    log.info(`variant dropdowns: ${dropdowns.length}`);

    // ─────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────

    async function openDropdown(index) {
      const triggers = await page.$$(
        '[data-mds="DropdownTriggerInput"]',
      );

      if (!triggers[index]) return false;

      await triggers[index].click();

      await page.waitForSelector(
        '[data-mds="StaticDropdownMenuItem"]',
        { timeout: 5000 },
      );

      await page.waitForTimeout(300);

      return true;
    }

    async function getOptions() {
      return await page.$$eval(
        '[data-mds="StaticDropdownMenuItem"]',
        (items) =>
          items.map((el, idx) => ({
            index: idx,

            text: el.innerText.trim(),

            disabled:
              el.dataset.disabled === "true" ||
              el.getAttribute("aria-disabled") === "true" ||
              el.classList.toString().includes("disabled") ||
              el.innerText.includes("품절"),
          })),
      );
    }

    async function extractRenderedVariants() {
      return await page.$$eval(
        '[class*="SelectedOption__Item"]',
        (items, productId) => {
          return items.map((item, idx) => {
            const name =
              item.querySelector(
                '[class*="SelectedOptionItem__OptionNameTypography"]',
              )?.innerText?.trim() || "";

            const delivery =
              item.querySelector(
                '[class*="SelectedOptionItem__DeliveryRow"]',
              )?.innerText?.trim() || "";

            const priceText =
              [...item.querySelectorAll('[data-mds="Typography"]')]
                .map((el) => el.innerText.trim())
                .find((t) => t.includes("원")) || "";

            const sale =
              parseInt(
                priceText.replace(/[^\d]/g, ""),
                10,
              ) || null;

            return {
              variantId: `${productId}_${idx}_${name}`,

              name_kr: name,

              thumbnail: null,

              variant_detail_images: [],

              flags: delivery ? [delivery] : [],

              is_soldout:
                name.includes("품절"),

              price: {
                sale,
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

    async function clearSelected() {
      while (true) {
        const buttons = await page.$$(
          '[class*="SelectedOption__Item"] button[data-mds="IconButton"]',
        );

        if (!buttons.length) break;

        await buttons[0].click();

        await page.waitForTimeout(250);
      }
    }

    // ─────────────────────────────────────────────
    // RESULT
    // ─────────────────────────────────────────────

    const results = [];

    // ─────────────────────────────────────────────
    // CASE 1: ONE DEPTH
    // ─────────────────────────────────────────────

    if (dropdowns.length === 1) {
      log.step("handling 1-depth variants");

      await openDropdown(0);

      const options = await getOptions();

      for (const option of options) {
        // soldout
        if (option.disabled) {
          results.push({
            variantId: `${productId}_${option.text}`,

            name_kr: option.text,

            thumbnail: null,

            variant_detail_images: [],

            flags: [],

            is_soldout: true,

            price: {
              sale: null,
              discount: null,
            },

            price_raw: {
              priceText: "",
              discountText: "",
            },
          });

          continue;
        }

        // reopen dropdown
        await openDropdown(0);

        const items = await page.$$(
          '[data-mds="StaticDropdownMenuItem"]',
        );

        if (!items[option.index]) continue;

        await items[option.index].click();

        await page.waitForTimeout(700);

        const rendered =
          await extractRenderedVariants();

        results.push(...rendered);

        await clearSelected();

        await page.waitForTimeout(300);
      }
    }

    // ─────────────────────────────────────────────
    // CASE 2: TWO DEPTH
    // ─────────────────────────────────────────────

    else if (dropdowns.length >= 2) {
      log.step("handling 2-depth variants");

      // open option1
      await openDropdown(0);

      const options1 = await getOptions();

      for (const op1 of options1) {
        if (op1.disabled) continue;

        // reopen option1
        await openDropdown(0);

        const items1 = await page.$$(
          '[data-mds="StaticDropdownMenuItem"]',
        );

        if (!items1[op1.index]) continue;

        await items1[op1.index].click();

        await page.waitForTimeout(700);

        // open option2
        await openDropdown(1);

        const options2 = await getOptions();

        for (const op2 of options2) {
          // soldout
          if (op2.disabled) {
            results.push({
              variantId:
                `${productId}_${op1.text}_${op2.text}`,

              name_kr:
                `${op1.text} · ${op2.text}`,

              thumbnail: null,

              variant_detail_images: [],

              flags: [],

              is_soldout: true,

              price: {
                sale: null,
                discount: null,
              },

              price_raw: {
                priceText: "",
                discountText: "",
              },
            });

            continue;
          }

          // reopen option2
          await openDropdown(1);

          const items2 = await page.$$(
            '[data-mds="StaticDropdownMenuItem"]',
          );

          if (!items2[op2.index]) continue;

          await items2[op2.index].click();

          await page.waitForTimeout(1000);

          const rendered =
            await extractRenderedVariants();

          results.push(...rendered);

          await clearSelected();

          await page.waitForTimeout(300);

          // reselect option1
          await openDropdown(0);

          const resetItems1 = await page.$$(
            '[data-mds="StaticDropdownMenuItem"]',
          );

          if (!resetItems1[op1.index]) continue;

          await resetItems1[op1.index].click();

          await page.waitForTimeout(500);
        }
      }
    }

    // dedupe
    const deduped = [
      ...new Map(
        results.map((v) => [v.variantId, v]),
      ).values(),
    ];

    log.ok(
      `variants extracted: ${deduped.length}`,
    );

    return deduped;
  } catch (err) {
    log.warn(
      `getMusinsaVariants failed: ${err.message}`,
    );

    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CRAWL PRODUCT — MUSINSA
// ─────────────────────────────────────────────────────────────────────────────

async function waitForMusinsaProduct(page) {
  const selectors = [
    '[class*="GoodsName__Wrap"]',
    'h1[data-mds="Typography"]',
    "h1",
  ];

  for (const selector of selectors) {
    try {
      await page.waitForSelector(selector, {
        timeout: 8000,
        state: "attached",
      });

      return true;
    } catch {}
  }

  return false;
}

async function crawlProduct(page, url) {
  try {
    log.step("navigating...");

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    const ready = await waitForMusinsaProduct(page);

    if (!ready) {
      throw new Error("product page not ready");
    }

    // Chờ tên sản phẩm load
    await page.waitForSelector('[class*="GoodsName__Wrap"]', {
      timeout: 12000,
    });

    const productId = extractMusinsaProductId(url);
    log.info(`productId: ${productId}`);

    const source = "musinsa";

    // Extract song song
    const [name, price, rating, specs, imageUrls] = await Promise.all([
      getMusinsaName(page),
      getMusinsaPrice(page),
      getMusinsaRating(page),
      getMusinsaSpecs(page),
      getMusinsaImages(page),
    ]);

    // Variants
    let variants = await getMusinsaVariants(page, productId);

    // Nếu có variants, gán price từ product (vì dropdown không hiển thị giá riêng)
    if (variants.length) {
      variants = variants.map((v) => ({
        ...v,
        price: {
          sale: price.salePrice,
          discount: price.discount,
        },
        price_raw: {
          priceText: String(price.salePrice || ""),
          discountText: `${price.discount || 0}%`,
        },
      }));
    }

    const product = {
      productId,
      source,
      url,
      name,
      specs,
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
      images: imageUrls,
      source_flags: [],
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
  const productId = extractMusinsaProductId(url);

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
        .map((x) => normalizeMusinsaUrl(x.trim()))
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
