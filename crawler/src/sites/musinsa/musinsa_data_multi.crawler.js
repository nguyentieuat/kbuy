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
// LOGGER + HELPERS
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
      options: product.options,
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
    const res = await fetch(bigUrl, { method: "HEAD" });
    if (res.ok) return bigUrl;
  } catch { }
  return url;
}

async function getMusinsaImages(page) {
  try {
    await page.waitForSelector('[class*="Pagination__Bullet"] img', { timeout: 8000 });
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
    const originalPriceText = await page
      .$eval('[class*="Price__DiscountWrap"] [data-mds="Typography"]', (el) => el.innerText.trim())
      .catch(() => null);

    const discountRateText = await page
      .$eval('[class*="Price__DiscountRate"]', (el) => el.innerText.trim())
      .catch(() => null);

    const salePriceText = await page
      .$eval('[class*="Price__CalculatedPrice"]', (el) => el.innerText.trim())
      .catch(() => null);

    const salePrice = parsePrice(salePriceText);
    // 🔥 Nếu không có giá gốc (không sale), gán thẳng bằng salePrice
    const originalPrice = parsePrice(originalPriceText) || salePrice;
    // 🔥 Nếu không có giảm giá thì đưa về số 0 luôn thay vì null
    const discount = parseInt((discountRateText || "").replace(/[^\d]/g, ""), 10) || 0;

    return {
      originalPrice,
      salePrice,
      discount
    };
  } catch (err) {
    log.warn(`price extract failed: ${err.message}`);
    return { originalPrice: null, salePrice: null, discount: 0 };
  }
}

async function getMusinsaRating(page) {
  try {
    await page.waitForSelector('[class*="ReviewSummary__Wrap"]', { timeout: 5000 });
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

async function getMusinsaVariants(page, productId, basePrice = null, baseDiscount = null) {
  try {
    await page.waitForTimeout(1000);
    const results = [];
    const optionsMeta = [];
    const allDropdownsData = [];

    function cleanMusinsaOptionText(text) {
      if (!text) return "";
      let cleaned = text;

      // Xóa dạng số: "06.08(월) 도착 예정", "06/08(화) 이내 발송 예정"
      cleaned = cleaned.replace(/\d{2}[./]\d{2}\([^)]*\)[^\n]*/g, "");

      // Xóa dạng từ: "모레(월)", "내일(화)", "오늘(목)" + phần sau
      cleaned = cleaned.replace(/(모레|내일|오늘|이번\s*주\s*\S+)\([^)]*\)[^\n]*/g, "");

      // Xóa "(월)", "(화)", "(수)", "(목)", "(금)", "(토)", "(일)" còn sót
      cleaned = cleaned.replace(/\([월화수목금토일]\)/g, "");

      // Xóa delivery text còn sót
      cleaned = cleaned.replace(/도착\s*예정/g, "");
      cleaned = cleaned.replace(/발송\s*예정/g, "");
      cleaned = cleaned.replace(/순차\s*배송/g, "");
      cleaned = cleaned.replace(/이내\s*/g, "");
      cleaned = cleaned.replace(/모레/g, "");
      cleaned = cleaned.replace(/내일/g, "");
      cleaned = cleaned.replace(/오늘/g, "");

      // Xóa soldout, giá delta
      cleaned = cleaned.replace(/\(품절\)/g, "");
      cleaned = cleaned.replace(/\([+-]?[0-9,]+원\)/g, "");

      return cleaned.replace(/\s+/g, " ").trim();
    }

    function generateVariantId(prodId, cleanTextsArray) {
      const rawStr = [prodId, ...cleanTextsArray].join("_");
      return rawStr
        .replace(/[^a-zA-Z0-9가-힣_]/g, "_")
        .replace(/_+/g, "_")
        .replace(/_$/, "");
    }

    function getCartesianProduct(arrays) {
      return arrays.reduce((acc, curr) => {
        return acc.flatMap(c => curr.map(n => [...c, n]));
      }, [[]]);
    }

    async function readDropdown(index) {
      const container = page.locator('[data-mds="StaticDropdownMenu"]').nth(index);
      if (await container.count() === 0) return null;

      const trigger = container.locator('[data-mds="DropdownTriggerBox"]');
      await trigger.scrollIntoViewIfNeeded();

      const state = await trigger.getAttribute('data-state');
      if (state === 'closed') { await trigger.click(); }

      const menu = container.locator('[data-mds="StaticDropdownMenuContent"]');
      const visible = await menu.waitFor({ state: "visible", timeout: 2000 }).then(() => true).catch(() => false);
      if (!visible) return null;

      const data = await menu.evaluate((menuEl) => {
        const items = Array.from(menuEl.querySelectorAll('[data-mds="StaticDropdownMenuItem"]'));
        const options = items.map((el) => {
          const content = el.querySelector('[class*="DropdownItemContent__ContentColumn"]')?.innerText || el.innerText;
          const rawText = (content || "").trim();
          const soldout = el.getAttribute("data-disabled") === "true" || rawText.includes("품절");
          const match = rawText.match(/\(([+-][0-9,]+)원\)/);
          return {
            rawText,
            soldout,
            delta: match ? parseInt(match[1].replace(/,/g, ""), 10) : 0,
          };
        });

        const parentContainer = menuEl.closest('[data-mds="StaticDropdownMenu"]');
        const triggerInput = parentContainer?.querySelector('[data-mds="DropdownTriggerInput"], [data-mds="DropdownTriggerInputBox"]');
        let title = "option";
        if (triggerInput) {
          title = triggerInput.getAttribute("placeholder") || triggerInput.getAttribute("data-button-name") || "option";
        }
        return { title: title.trim(), options };
      });

      await page.keyboard.press("Escape");
      await menu.waitFor({ state: "hidden", timeout: 2000 }).catch(() => { });
      await page.waitForTimeout(150);
      return data;
    }

    async function selectOption(index, value) {
      const container = page.locator('[data-mds="StaticDropdownMenu"]').nth(index);
      if (await container.count() === 0) return false;

      const trigger = container.locator('[data-mds="DropdownTriggerBox"]');
      const state = await trigger.getAttribute('data-state');
      if (state === 'closed') { await trigger.click(); }

      const menu = container.locator('[data-mds="StaticDropdownMenuContent"]');
      await menu.waitFor({ state: 'visible', timeout: 3000 });

      const items = menu.locator('[data-mds="StaticDropdownMenuItem"]');
      const itemCount = await items.count();
      const normalize = (s) => (s || "").replace(/\(품절\)/g, "").replace(/\([+-][0-9,]+원\)/g, "").replace(/\s+/g, " ").trim();
      const target = normalize(value);

      for (let i = 0; i < itemCount; i++) {
        const item = items.nth(i);
        const text = await item.innerText();
        if (normalize(text).includes(target)) {
          await item.click();
          await menu.waitFor({ state: 'hidden', timeout: 2000 }).catch(() => { });
          await page.waitForTimeout(200);
          return true;
        }
      }
      await page.keyboard.press("Escape");
      return false;
    }

    // 1. Đọc và tổ hợp Dropdown (Size)
    let depth = 0;
    while (true) {
      const dropData = await readDropdown(depth);
      if (!dropData || !dropData.options || dropData.options.length === 0) break;
      allDropdownsData.push(dropData);

      const activeOption = dropData.options.find(op => !op.soldout);
      const targetOption = activeOption || dropData.options[0];
      const targetOptionText = cleanMusinsaOptionText(targetOption.rawText);
      const ok = await selectOption(depth, targetOptionText);
      if (!ok) break;

      await page.waitForTimeout(500);
      depth++;
    }

    if (allDropdownsData.length > 0) {
      allDropdownsData.forEach(drop => {
        optionsMeta.push({
          title: drop.title,
          values: drop.options.map(op => cleanMusinsaOptionText(op.rawText))
        });
      });

      const optionsCluster = allDropdownsData.map(d => d.options);
      const totalVariants = optionsCluster.reduce(
        (acc, arr) => acc * arr.length,
        1
      );

      console.log(
        `[${productId}] total combinations: ${totalVariants}`
      );

      if (totalVariants > 10000) {
        console.log(
          `[${productId}] Too many variants (${totalVariants}), skip`
        );

        return {
          options: optionsMeta,
          variants: [],
        };
      }
      const combinations = getCartesianProduct(optionsCluster);

      for (const combo of combinations) {
        const cleanTexts = combo.map(op => cleanMusinsaOptionText(op.rawText));
        const totalDelta = combo.reduce((sum, op) => sum + op.delta, 0);
        const isSoldOut = combo.some(op => op.soldout);

        const attributes = {};
        allDropdownsData.forEach((drop, idx) => {
          attributes[drop.title] = cleanTexts[idx];
        });

        const sale = basePrice ? Math.round((basePrice + totalDelta) * (1 - (baseDiscount || 0) / 100)) : null;
        const original = basePrice ? basePrice + totalDelta : null;

        results.push({
          variantId: generateVariantId(productId, cleanTexts),
          name_kr: cleanTexts.join(" - "),
          attributes,
          price: { sale, original, discount: baseDiscount },
          price_raw: {
            priceText: String(sale || ""),
            discountText: `${baseDiscount || 0}%`,
          },
          is_soldout: isSoldOut,
          thumbnail: null,
          variant_detail_images: [],
          flags: [],
        });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 🔥 ĐOẠN THIẾU: QUÉT CAROUSEL MÀU SẮC KHÁC ĐỂ BƠM VÀO KẾT QUẢ
    // ─────────────────────────────────────────────────────────────────────────
    try {
      const itemSelector = 'div[class*="OtherColorGoods__Item"]';
      const hasCarousel = await page.locator(itemSelector).first().count();

      if (hasCarousel > 0) {
        const carouselVariants = await page.$$eval(itemSelector, (elements) => {
          return elements.map((el) => {
            const anchor = el.querySelector('a[class*="OtherColorGoods__Anchor"]');
            const img = el.querySelector('img');
            const colorNameEl = el.querySelector('span[class*="OtherColorGoods__ColorText"]');
            const isSoldOut = !!el.querySelector('div[class*="OtherColorGoods__Dimmed"]') || el.innerText.includes("품절");

            const itemId = anchor ? anchor.getAttribute('data-item-id') : null;
            const colorName = colorNameEl ? colorNameEl.innerText.trim() : "Other Color";

            const price = anchor ? parseInt(anchor.getAttribute('data-price'), 10) : null;
            const originalPrice = anchor ? parseInt(anchor.getAttribute('data-original-price'), 10) : null;
            const discountRate = anchor ? parseInt(anchor.getAttribute('data-discount-rate'), 10) : null;

            return {
              variantId: itemId ? `${itemId}_${colorName}` : `color_${Math.random().toString(36).substring(2, 7)}`,
              name_kr: colorName,
              attributes: { "색상": colorName },
              price: { sale: price, original: originalPrice, discount: discountRate },
              price_raw: {
                priceText: String(price || ""),
                discountText: `${discountRate || 0}%`,
              },
              is_soldout: isSoldOut,
              thumbnail: img ? (img.currentSrc || img.src) : null,
              variant_detail_images: [],
              flags: ["other_color_link"], // Kích hoạt cờ này để khớp với bộ lọc ở processProduct
              target_url: anchor ? anchor.getAttribute('href') : null
            };
          });
        });

        results.push(...carouselVariants);

      }
    } catch (carouselErr) {
      console.log("getMusinsaVariants > carousel crawl failed:", carouselErr.message);
    }
    // ─────────────────────────────────────────────────────────────────────────

    const seen = new Set();
    const dedupedVariants = results
      .filter((v) => {
        if (seen.has(v.variantId)) return false;
        seen.add(v.variantId);
        return true;
      })
      .map((v) => ({ ...v, hash: hashVariant(v) }));

    return { options: optionsMeta, variants: dedupedVariants };
  } catch (err) {
    console.log("getMusinsaVariants error:", err.message);
    return { options: [], variants: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CRAWL PRODUCT — MUSINSA
// ─────────────────────────────────────────────────────────────────────────────

async function waitForMusinsaProduct(page) {
  // Kiểm tra tiêu đề để phát hiện trường hợp bị chặn bởi Anti-Bot
  const title = await page.title().catch(() => "");
  if (title.includes("Cloudflare") || title.includes("Access Denied")) {
    log.error(`🚨 Bị hệ thống bảo mật chặn (Title: ${title})`);
    return false;
  }

  const selectors = [
    '[class*="GoodsName__Wrap"]',
    'div[class*="GoodsName"]',
    'h1[data-mds="Typography"]',
    'h1'
  ];

  try {
    // 🔥 Cải tiến: Kết hợp tất cả selector lại thành một cụm duy nhất để Playwright lắng nghe đồng thời (Race Condition)
    let combinedLocator = page.locator(selectors[0]);
    for (let i = 1; i < selectors.length; i++) {
      combinedLocator = combinedLocator.or(page.locator(selectors[i]));
    }

    // Đợi tối đa 15s cho bất cứ phần tử nào hiển thị trước
    await combinedLocator.first().waitFor({ state: "attached", timeout: 15000 });
    return true;
  } catch {
    return false;
  }
}

async function crawlProduct(page, url) {
  try {
    log.step("navigating...");

    // Đổi sang 'load' để bảo đảm Next.js script nạp đầy đủ cấu trúc client-side router
    await page.goto(url, {
      waitUntil: "load",
      timeout: 60000,
    });

    const ready = await waitForMusinsaProduct(page);
    if (!ready) {
      throw new Error("product page not ready (hoặc bị block/hết hạn phiên)");
    }

    const productId = extractMusinsaProductId(url);
    log.info(`productId: ${productId}`);

    const source = "musinsa";

    // Trích xuất thông tin song song
    const [name, price, rating, specs, imageUrls] = await Promise.all([
      getMusinsaName(page),
      getMusinsaPrice(page),
      getMusinsaRating(page),
      getMusinsaSpecs(page),
      getMusinsaImages(page),
    ]);

    let variantData = { options: [], variants: [] };
    try {
      variantData = await getMusinsaVariants(
        page,
        productId,
        price.originalPrice,
        price.discount
      );
    } catch (err) {
      log.warn(`variants failed: ${err.message}`);
    }

    let variants = variantData.variants;
    const options = variantData.options;

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
      options,
    };

    product.hash = hashProduct(product);
    product.image_hash = hashImageUrls(imageUrls);

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
// PROCESS PRODUCT + FILE + MAIN
// ─────────────────────────────────────────────────────────────────────────────
async function processProduct({
  page,
  url,
  existingMap,
  resultMap,
  processingSet,
  stats,
  index,
  // Thêm 3 tham số quản lý hàng đợi này 👇
  urls,
  urlSet,
  inputPath
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
  log.info(`[${index + 1}/${urls.length}] ${productId}`); // Đổi total thành urls.length để hiển thị động

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
        options: fresh.options,
        variants: mergeVariants(old.variants, fresh.variants),
        source_rating_avg: fresh.source_rating_avg ?? old.source_rating_avg,
        source_rating_count: fresh.source_rating_count ?? old.source_rating_count,
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
    log.ok(`saved: ${productId} | changed: product=${productChanged} img=${imageChanged} variants=${anyVariantChanged}`);

    // ─────────────────────────────────────────────────────────────────────────
    // 🔥 ĐOẠN BỔ SUNG: PHÁT HIỆN MÀU MỚI -> ĐẨY VÀO LINKS.TXT VÀ MẢNG ĐANG CHẠY
    // ─────────────────────────────────────────────────────────────────────────
    if (fresh.variants && fresh.variants.length > 0) {
      const newUrls = fresh.variants
        .filter(v => v.flags?.includes("other_color_link") && v.target_url)
        .map(v => normalizeMusinsaUrl(v.target_url));

      for (const newUrl of newUrls) {
        if (!urlSet.has(newUrl)) {
          urlSet.add(newUrl);  // Chặn trùng nội bộ bộ nhớ
          urls.push(newUrl);   // Bơm vào mảng để các worker đào tiếp luôn

          // Ghi trực tiếp xuống file links.txt gốc để lưu trữ lâu dài
          fs.appendFileSync(inputPath, `${newUrl}\n`, "utf-8");
          log.star(`🔗 Phát hiện màu khác! Đã đẩy vào links.txt: ${extractMusinsaProductId(newUrl)}`);
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

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
            if (!existing || new Date(p.crawledAt || 0) > new Date(existing.crawledAt || 0)) {
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
        .map((x) => normalizeMusinsaUrl(x.trim()))
        .filter(Boolean),
    ),
  ];

  // 🔥 Khởi tạo Set bảo vệ chống trùng lặp link
  const urlSet = new Set(urls);
  log.info(`📚 total urls khởi điểm: ${urls.length}`);

  if (fs.existsSync(tempPath)) fs.removeSync(tempPath);

  const stats = { success: 0, failed: 0, fallback: 0 };
  let currentIndex = 0;

  async function worker(workerId) {
    const { page } = await sessionManager.safeGetPage();

    await page.context().setExtraHTTPHeaders({
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
    });

    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (type === "font" || type === "media") return route.abort();
      route.continue();
    });

    log.info(`worker-${workerId} started`);

    while (true) {
      const index = currentIndex++;
      // Do urls.length sẽ tăng lên một cách linh hoạt, biểu thức kiểm tra này 
      // luôn đúng cho đến khi không còn link màu mới nào được tìm thấy nữa.
      if (index >= urls.length) break;

      await processProduct({
        page,
        url: urls[index],
        existingMap,
        resultMap,
        processingSet,
        stats,
        index,
        urls,
        urlSet,
        inputPath
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
  log.ok(`output written: ${path.basename(outputPath)} | rows=${finalRows.length}`);
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