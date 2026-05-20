// oliveyoung/oliveyoung_data.crawler.js
"use strict";

const path = require("path");
const fs = require("fs-extra");
const { chromium } = require("playwright");
const CrawlerSessionManager = require("../../../core/sessionManager");

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const LINKS_DIR = path.join(process.cwd(), "data/links_newest");
const OUTPUT_DIR = path.join(process.cwd(), "data/output_products_newest");
const IMAGE_DIR = path.join(process.cwd(), "data/image_newest");

// ─────────────────────────────────────────────────────────────────────────────
// LOGGER — prefix timestamp + level vào mọi log
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
  return new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Chờ ms milliseconds */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Random delay giả lập hành vi người dùng:
 * 50% → 1.5–3.5s  |  30% → 3–7s  |  20% → 5–10s
 */
function humanDelay() {
  const r = Math.random();
  if (r < 0.5) return 1500 + Math.random() * 2000;
  if (r < 0.8) return 3000 + Math.random() * 4000;
  return 5000 + Math.random() * 5000;
}

/** Chuyển chuỗi giá "₩12,000" → 12000 */
function parsePrice(text) {
  if (!text) return null;
  return parseInt(text.replace(/[^\d]/g, ""), 10) || null;
}

/** Lấy tên file an toàn từ URL, fallback về img_{index}.jpg */
function getSafeFileName(url, index) {
  const clean = url.split("?")[0];
  let name = path.basename(clean);
  if (!name || name.length < 3) name = `img_${index}.jpg`;
  return name;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOM HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Lấy innerText từ selector, trả về null nếu không tìm thấy */
async function safeEval(page, selector) {
  try {
    return await page.$eval(selector, (el) => el.innerText.trim());
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE DOWNLOAD
// ─────────────────────────────────────────────────────────────────────────────

/** Download 1 ảnh từ URL về filepath */
async function downloadImage(url, filepath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} khi tải ${url}`);
  const buffer = await res.arrayBuffer();
  await fs.writeFile(filepath, Buffer.from(buffer));
}

/**
 * Lưu gallery ảnh sản phẩm vào data/image/{productId}/
 * Bỏ qua nếu file đã tồn tại (idempotent)
 */
async function saveImages(imageUrls, productId) {
  const folder = path.join(IMAGE_DIR, productId);
  await fs.ensureDir(folder);

  const saved = [];

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    try {
      const fileName = getSafeFileName(url, i);
      const filePath = path.join(folder, fileName);

      if (fs.existsSync(filePath)) {
        log.img(`skip (exists): ${fileName}`);
        saved.push(filePath);
        continue;
      }

      await downloadImage(url, filePath);
      saved.push(filePath);
      log.img(`saved: ${fileName}`);
    } catch (err) {
      log.warn(`image download failed [${i}]: ${err.message}`);
    }
  }

  log.img(`gallery: ${saved.length}/${imageUrls.length} saved`);
  return saved;
}

/**
 * Lưu thumbnail variant vào data/image/{productId}/variants/
 * Bỏ qua nếu file đã tồn tại (idempotent)
 */
async function saveThumbnail(url, productId, index = 0) {
  if (!url) return null;

  try {
    const folder = path.join(IMAGE_DIR, productId, "variants");
    await fs.ensureDir(folder);

    const fileName = getSafeFileName(url, index);
    const filePath = path.join(folder, fileName);

    if (fs.existsSync(filePath)) return filePath;

    await downloadImage(url, filePath);
    log.img(`thumbnail saved: ${fileName}`);
    return filePath;
  } catch (err) {
    log.warn(`thumbnail download failed [${index}]: ${err.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE EXTRACTORS
// ─────────────────────────────────────────────────────────────────────────────

/** Lấy danh sách URL ảnh carousel từ trang sản phẩm */
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

/**
 * Lấy rating trung bình và số lượng review từ ReviewArea
 * HTML target:
 *   평점 4.8   → source_rating_avg
 *   리뷰 111,872건 → source_rating_count
 */
async function getRating(page) {
  try {
    // Chờ ReviewArea render
    await page.waitForSelector('[class*="ReviewArea_review-area"]', {
      timeout: 8000,
    });

    // Lấy điểm trung bình — xóa text "평점" (oyblind span), chỉ giữ số
    const avg = await page.$eval(
      '[class*="ReviewArea_rating-star"] .rating',
      (el) => {
        const text = el.innerText.replace(/[^0-9.]/g, "").trim();
        return parseFloat(text) || null;
      },
    );

    // Lấy số lượng review — số nằm trong <span> bên trong button
    const count = await page.$eval(
      '[class*="ReviewArea_review-count"] span',
      (el) => {
        const text = el.innerText.replace(/[^0-9]/g, "").trim();
        return parseInt(text) || 0;
      },
    );

    log.star(`rating: ${avg} ⭐ | reviews: ${count.toLocaleString()}`);
    return { avg, count };
  } catch (err) {
    log.warn(`rating extract failed: ${err.message}`);
    return { avg: null, count: 0 };
  }
}

/** Mở dropdown variant nếu đang collapsed */
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

/**
 * Extract danh sách variants từ dropdown DOM
 * Mỗi variant gồm: variantId, name_kr, thumbnail, flags, is_soldout, price
 */
async function getVariants(page, productId) {
  try {
    /* ===================================================== */
    /* VARIANT OPTIONS */
    /* ===================================================== */

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

    /* ===================================================== */
    /* VARIANT DETAIL IMAGES */
    /* ===================================================== */

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

    /* ===================================================== */
    /* MERGE */
    /* ===================================================== */

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

/**
 * Lấy các flag (BEST, 오늘드림, 증정...) ở đầu trang sản phẩm
 */
async function getGlobalFlags(page) {
  try {
    // Chờ element flag xuất hiện (không bắt buộc vì có thể sản phẩm không có flag)
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
// MERGE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Merge variants mới vào variants cũ
 * Giữ lại field đã dịch (name_vi), chỉ update price/flags/thumbnail
 */
function mergeVariants(oldVariants, freshVariants) {
  if (!freshVariants?.length) return oldVariants ?? [];
  if (!oldVariants?.length) return freshVariants;

  return freshVariants.map((fresh) => {
    const old = oldVariants.find((o) => o.variantId === fresh.variantId);
    if (!old) return fresh;

    return {
      ...old, // giữ name_vi và các field đã dịch
      is_soldout: fresh.is_soldout, // luôn update trạng thái tồn kho
      flags: fresh.flags, // luôn update badges
      thumbnail: fresh.thumbnail ?? old.thumbnail, // update nếu có mới
      price: fresh.price, // luôn update giá
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CRAWL 1 PRODUCT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Crawl toàn bộ data 1 sản phẩm từ URL
 * Return object product hoặc null nếu lỗi nghiêm trọng
 */
async function crawlProduct(page, url) {
  try {
    log.step("navigating...");
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3000);

    const productId = url.match(/goodsNo=([^&]+)/)?.[1];
    log.info(`productId: ${productId}`);

    // ── Tên sản phẩm ────────────────────────────────────────────────────────
    const name = await safeEval(page, '[class*="GoodsDetailInfo_title"]');
    log.info(`name: ${name ?? "not found"}`);

    // ── Global Flags (BEST, 오늘드림...) ─────────────────────────────────────
    const globalFlags = await getGlobalFlags(page);

    // ── Specs (bảng thông tin sản phẩm) ─────────────────────────────────────
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

    // ── Gallery images ───────────────────────────────────────────────────────
    const imageUrls = await getImages(page);
    const savedImages = await saveImages(imageUrls, productId);

    // ── Giá fallback (khi không có variants) ────────────────────────────────
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
    log.info(
      `price fallback — original: ${originalPrice} | sale: ${salePrice} | discount: ${discount}`,
    );

    // ── Rating & Review count ────────────────────────────────────────────────
    const rating = await getRating(page);

    // ── Variants ─────────────────────────────────────────────────────────────
    let variants = await getVariants(page, productId);
    log.info(`variants direct: ${variants.length}`);

    // Nếu không tìm thấy variant → thử mở dropdown rồi retry
    if (!variants.length) {
      await openVariantDropdown(page);

      for (let attempt = 1; attempt <= 3; attempt++) {
        variants = await getVariants(page, productId);
        log.info(`variants retry ${attempt}: ${variants.length}`);
        if (variants.length) break;
        await sleep(1000);
      }
    }

    // Download thumbnail cho từng variant
    if (variants.length) {
      log.step(`downloading ${variants.length} variant thumbnails...`);
      for (let i = 0; i < variants.length; i++) {
        const thumbUrl = variants[i].thumbnail;
        if (thumbUrl) {
          variants[i].thumbnail = await saveThumbnail(thumbUrl, productId, i);
        }
      }
    }

    const product = {
      productId,
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
      images: savedImages,
      source_flags: globalFlags,
      source_rating_avg: rating.avg, // ⭐ rating từ OliveYoung
      source_rating_count: rating.count, // 📊 số lượng review từ OliveYoung
      ...(variants.length > 0
        ? { variants }
        : { price: { original, sale, discount } }),
    };

    log.ok(`crawlProduct done: ${productId}`);
    return product;
  } catch (err) {
    log.error(`crawlProduct fatal: ${err.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// XỬ LÝ 1 FILE LINKS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Đọc file links .txt, crawl từng URL, merge với data cũ, ghi ra .jsonl
 * Dùng file .tmp để tránh mất data nếu script bị crash giữa chừng
 */
async function processFile(sessionManager, fileName) {
  const inputPath = path.join(LINKS_DIR, fileName);

  const outputPath = path.join(OUTPUT_DIR, fileName.replace(".txt", ".jsonl"));

  const tempPath = outputPath + ".tmp";

  await fs.ensureDir(OUTPUT_DIR);

  /* ========================= */
  /* LOAD EXISTING */
  const existingMap = new Map();

  if (fs.existsSync(outputPath)) {
    const lines = fs.readFileSync(outputPath, "utf-8").split("\n");

    lines.forEach((line) => {
      try {
        const p = JSON.parse(line);

        if (p.productId) {
          existingMap.set(p.productId, p);
        }
      } catch {}
    });

    log.info(`loaded existing: ${existingMap.size}`);
  }

  /* ========================= */
  /* READ LINKS */
  const urls = fs
    .readFileSync(inputPath, "utf-8")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  log.info(`📚 total urls: ${urls.length}`);

  /* ========================= */
  /* REMOVE OLD TEMP */
  if (fs.existsSync(tempPath)) {
    fs.removeSync(tempPath);
  }

  /* ========================= */
  /* PAGE */
  const { page } = await sessionManager.safeGetPage();

  const stats = {
    success: 0,
    failed: 0,
    fallback: 0,
  };

  /* ========================= */
  /* LOOP */
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];

    const productId = url.match(/goodsNo=([^&]+)/)?.[1];

    console.log(`\n${"─".repeat(60)}`);

    log.info(`[${i + 1}/${urls.length}] ${productId}`);

    try {
      const fresh = await crawlProduct(page, url);

      if (!fresh) {
        throw new Error("crawlProduct returned null");
      }

      await simulateHuman(page);

      const old = existingMap.get(productId);

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

            ...(!fresh.variants?.length && {
              price: fresh.price,
            }),

            crawledAt: new Date().toISOString(),
          }
        : {
            ...fresh,

            crawledAt: new Date().toISOString(),
          };

      fs.appendFileSync(tempPath, JSON.stringify(merged) + "\n");

      stats.success++;

      log.ok(`saved: ${productId}`);
    } catch (err) {
      log.error(`${productId}: ${err.message}`);

      stats.failed++;

      if (existingMap.has(productId)) {
        fs.appendFileSync(
          tempPath,
          JSON.stringify(existingMap.get(productId)) + "\n",
        );

        stats.fallback++;

        log.warn(`fallback old data: ${productId}`);
      }
    }

    const delay = humanDelay();

    log.info(`waiting ${(delay / 1000).toFixed(1)}s`);

    await sleep(delay);
  }

  /* ========================= */
  /* CLOSE PAGE */
  await page.close();

  /* ========================= */
  /* ATOMIC REPLACE */
  if (fs.existsSync(tempPath)) {
    await fs.move(tempPath, outputPath, {
      overwrite: true,
    });

    log.ok(`output written: ${path.basename(outputPath)}`);
  }

  return stats;
}
// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

async function simulateHuman(page) {
  try {
    await page.waitForTimeout(800 + Math.random() * 1200);

    await page.mouse.move(Math.random() * 400, Math.random() * 400);

    await page.waitForTimeout(500 + Math.random() * 1000);

    await page.mouse.wheel(0, 300 + Math.random() * 700);
  } catch {}
}

async function main() {
  const startTime = Date.now();

  log.info("🚀 starting crawler...\n");

  /* ========================= */
  /* BROWSER */
  const browser = await chromium.launch({
    headless: false,

    slowMo: 30,

    args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
  });

  /* ========================= */
  /* SESSION MANAGER */
  const sessionManager = new CrawlerSessionManager(browser, {
    maxPagesPerContext: 5,
  });

  /* ========================= */
  /* INPUT CHECK */
  if (!fs.existsSync(LINKS_DIR)) {
    throw new Error(`LINKS_DIR NOT FOUND: ${LINKS_DIR}`);
  }

  /* ========================= */
  /* FILES */
  const files = fs.readdirSync(LINKS_DIR).filter((f) => f.endsWith(".txt"));

  log.info(`📂 found ${files.length} link file(s)`);

  if (!files.length) {
    log.warn("no txt files found");

    await sessionManager.close();

    await browser.close();

    return;
  }

  /* ========================= */
  /* TOTAL STATS */
  const total = {
    success: 0,
    failed: 0,
    fallback: 0,
  };

  /* ========================= */
  /* PROCESS FILES */
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

  /* ========================= */
  /* CLEANUP */
  await sessionManager.close();

  await browser.close();

  /* ========================= */
  /* SUMMARY */
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
