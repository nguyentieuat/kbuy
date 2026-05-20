// sites/oliveyoung/crawlFullProduct.js

const fs = require("fs");
const path = require("path");
const fsExtra = require("fs-extra");
const { chromium } = require("playwright");

const CrawlerSessionManager = require("../../../core/sessionManager");
const { downloadImage } = require("../../utils/downloadImage");

/* ===================================================== */
/* CONFIG */
/* ===================================================== */

const INPUT_DIR = path.join(process.cwd(), "data/links_newest");

const OUTPUT_DIR = path.join(
  process.cwd(),
  "data/olive/output_products_krnewest",
);

const OUTPUT_IMAGE_DIR = path.join(process.cwd(), "data/image/olive");

/* ===================================================== */
/* UTILS */
/* ===================================================== */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parsePrice(text) {
  if (!text) return null;

  return parseInt(text.replace(/[^\d]/g, ""), 10);
}

async function safeEval(page, selector) {
  try {
    return await page.$eval(selector, (el) => el.innerText.trim());
  } catch {
    return null;
  }
}

function cleanImageUrl(url) {
  try {
    const u = new URL(url);

    // remove tracking query
    u.search = "";

    return u.toString();
  } catch {
    return url;
  }
}

/* ===================================================== */
/* HUMAN SIMULATION */
/* ===================================================== */

async function simulateHuman(page) {
  try {
    await page.waitForTimeout(800 + Math.random() * 1200);

    await page.mouse.move(Math.random() * 400, Math.random() * 400);

    await page.waitForTimeout(500 + Math.random() * 1000);

    await page.mouse.wheel(0, 300 + Math.random() * 700);
  } catch {}
}

/* ===================================================== */
/* IMAGES */
/* ===================================================== */

async function getImages(page) {
  try {
    await page.waitForSelector('[class*="GoodsDetailCarousel"] img', {
      timeout: 10000,
    });

    const urls = await page.$$eval(
      '[class*="GoodsDetailCarousel"] img',
      (imgs) => imgs.map((img) => img.currentSrc || img.src).filter(Boolean),
    );

    return [...new Set(urls)];
  } catch {
    return [];
  }
}

async function saveImages(imageUrls, productId) {
  const folder = path.join(OUTPUT_IMAGE_DIR, productId);

  await fsExtra.ensureDir(folder);

  const saved = [];

  for (let i = 0; i < imageUrls.length; i++) {
    const url = cleanImageUrl(imageUrls[i]);

    const fileName = path.basename(url.split("?")[0]) || `img_${i}.jpg`;

    const filePath = path.join(folder, fileName);

    try {
      await downloadImage(url, filePath);

      saved.push(filePath);
    } catch (e) {
      console.log("❌ image error:", e.message);
    }
  }

  return saved;
}

async function attachVariantThumbnails(variants, productId) {
  const baseFolder = path.join(OUTPUT_IMAGE_DIR, productId, "variants");

  await fsExtra.ensureDir(baseFolder);

  const result = [];

  for (const v of variants) {
    const cleanUrl = cleanImageUrl(v.thumbnail);

    let localPath = null;

    if (cleanUrl) {
      try {
        const fileName =
          path.basename(new URL(cleanUrl).pathname) || `${v.variantId}.jpg`;

        const filePath = path.join(baseFolder, `${v.variantId}_${fileName}`);

        await downloadImage(cleanUrl, filePath);

        localPath = filePath;
      } catch (e) {
        console.log("❌ variant image error:", e.message);
      }
    }

    result.push({
      ...v,
      thumbnail: localPath,
    });
  }

  return result;
}

/* ===================================================== */
/* PRODUCT DETAIL */
/* ===================================================== */

async function extractProductDetail(page, url) {
  console.log("🌐 goto:", url);

  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await page.waitForTimeout(3000);

  const productId = url.match(/goodsNo=([^&]+)/)?.[1] || null;

  const name = await safeEval(page, '[class*="GoodsDetailInfo_title"]');

  /* ========================= */
  /* OPEN SPECS */
  const btn = page.locator('button:has-text("상품정보 제공고시")');

  if ((await btn.count()) > 0) {
    const expanded = await btn.getAttribute("aria-expanded");

    if (expanded === "false") {
      await btn.click();
    }

    await page.waitForSelector('[class*="Accordion_table"] tbody tr', {
      timeout: 5000,
    });
  }

  /* ========================= */
  /* SPECS */
  const specs = await page.$$eval(
    '[class*="Accordion_table"] tbody tr',
    (rows) => {
      const result = {};

      rows.forEach((row) => {
        const key = row.querySelector("th")?.innerText?.trim();

        const value = row.querySelector("td")?.innerText?.trim();

        if (key && value) {
          result[key] = value;
        }
      });

      return result;
    },
  );

  /* ========================= */
  /* IMAGES */
  const images = await getImages(page);

  const savedImages = await saveImages(images, productId);

  /* ========================= */
  /* PRICE */
  const original = await safeEval(
    page,
    '[data-qa-name="text-product-original-price"]',
  );

  const sale = await safeEval(
    page,
    '[data-qa-name="text-product-discount-price"]',
  );

  const discount =
    (await safeEval(page, '[class*="GoodsDetailInfo_rate"]')) || null;

  return {
    productId,
    url,
    name,

    specs,

    images: savedImages,

    price: {
      original: parsePrice(original),
      sale: parsePrice(sale),
      discount,
    },
  };
}

/* ===================================================== */
/* VARIANTS */
/* ===================================================== */

async function openVariantDropdown(page) {
  try {
    await page.evaluate(() => {
      const btn = document.querySelector(
        '[class*="OptionSelector_btn-option"]',
      );

      if (btn) btn.click();
    });

    await page.waitForTimeout(1000);

    await page.waitForSelector('[data-qa-name^="text-product-option"]', {
      timeout: 5000,
    });
  } catch {}
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

    return variants.map((v) => ({
      variantId: `${productId}_${v.index}`,

      name_kr: v.name_kr,

      thumbnail: v.thumbnail,

      flags: v.flags,

      is_soldout: v.isSoldout,

      price: {
        sale: parsePrice(v.priceText),

        discount: parseInt(v.discountText) || null,
      },
    }));
  } catch {
    return [];
  }
}

/* ===================================================== */
/* PROCESS FILE */
/* ===================================================== */

async function processFile(sessionManager, file) {
  console.log("\n====================");
  console.log("📄 FILE:", file);
  console.log("====================");

  /* ========================= */
  /* PARSE CATEGORY */
  const fileBase = path.basename(file, ".txt");

  const lastUnderscore = fileBase.lastIndexOf("_");

  const categorySlug = fileBase.slice(0, lastUnderscore);

  const categoryId = parseInt(fileBase.slice(lastUnderscore + 1), 10);

  console.log("📦 CATEGORY:", categorySlug);

  console.log("🆔 CATEGORY ID:", categoryId);

  /* ========================= */
  /* PATH */
  const inputPath = path.join(INPUT_DIR, file);

  // output đổi sang jsonl
  const outputFile = file.replace(".txt", ".jsonl");

  const outputPath = path.join(OUTPUT_DIR, outputFile);

  await fsExtra.ensureDir(OUTPUT_DIR);

  /* ========================= */
  /* READ LINKS */
  const lines = fs
    .readFileSync(inputPath, "utf-8")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  console.log(`📚 TOTAL LINKS: ${lines.length}`);

  /* ========================= */
  /* GET PAGE */
  const { page } = await sessionManager.safeGetPage();

  /* ========================= */
  /* LOOP PRODUCTS */
  for (let i = 0; i < lines.length; i++) {
    const url = lines[i];

    console.log(`\n🔹 ${i + 1}/${lines.length}`);

    console.log("🔗", url);

    try {
      /* ===================== */
      /* PRODUCT DETAIL */
      const detail = await extractProductDetail(page, url);

      await simulateHuman(page);

      /* ===================== */
      /* VARIANTS */
      let variants = await getVariants(page, detail.productId);

      console.log("👉 direct variants:", variants.length);

      if (!variants.length) {
        await openVariantDropdown(page);

        for (let r = 0; r < 3; r++) {
          variants = await getVariants(page, detail.productId);

          console.log(`👉 retry ${r + 1}:`, variants.length);

          if (variants.length) break;

          await sleep(1000);
        }
      }

      variants = await attachVariantThumbnails(variants, detail.productId);

      /* ===================== */
      /* FINAL PRODUCT */
      const finalProduct = {
        categorySlug,
        categoryId,

        crawledAt: new Date().toISOString(),

        ...detail,

        variants,
      };

      /* ===================== */
      /* SAVE */
      fs.appendFileSync(outputPath, JSON.stringify(finalProduct) + "\n");

      console.log(`✅ DONE: ${detail.productId}`);

      console.log(`📦 variants: ${variants.length}`);
    } catch (err) {
      console.log("❌ ERROR:", err.message);

      /* ===================== */
      /* SAVE ERROR */
      fs.appendFileSync(
        outputPath,
        JSON.stringify({
          categorySlug,
          categoryId,

          url,

          error: err.message,

          crawledAt: new Date().toISOString(),
        }) + "\n",
      );
    }

    /* ===================== */
    /* RANDOM DELAY */
    await sleep(1500 + Math.random() * 3000);
  }

  /* ========================= */
  /* CLOSE PAGE */
  await page.close();
}

/* ===================================================== */
/* MAIN */
/* ===================================================== */

async function main() {
  console.log("🚀 START CRAWLER");

  /* ========================= */
  /* BROWSER */
  const browser = await chromium.launch({
    headless: false,

    slowMo: 50,

    args: ["--disable-blink-features=AutomationControlled"],
  });

  /* ========================= */
  /* SESSION MANAGER */
  const sessionManager = new CrawlerSessionManager(browser, {
    maxPagesPerContext: 5,
  });

  /* ========================= */
  /* INPUT CHECK */
  if (!fs.existsSync(INPUT_DIR)) {
    throw new Error(`INPUT_DIR NOT FOUND: ${INPUT_DIR}`);
  }

  /* ========================= */
  /* FILES */
  const files = fs.readdirSync(INPUT_DIR).filter((f) => f.endsWith(".txt"));

  console.log("📂 FILES:", files.length);

  /* ========================= */
  /* PROCESS FILES */
  for (const file of files) {
    try {
      await processFile(sessionManager, file);
    } catch (e) {
      console.log("❌ FILE ERROR:", file);

      console.log(e.message);
    }
  }

  /* ========================= */
  /* CLEANUP */
  await sessionManager.close();

  await browser.close();

  console.log("\n🎉 ALL DONE");
}

/* ===================================================== */

main().catch((err) => {
  console.error("💥 FATAL:", err);
});
