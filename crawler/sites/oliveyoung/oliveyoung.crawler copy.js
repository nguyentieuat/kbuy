const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs-extra");
const { downloadImage } = require("../../utils/downloadImage");

/* =========================
   SAFE HELPERS
========================= */

async function safeEval(page, selector) {
  try {
    return await page.$eval(selector, (el) => el.innerText.trim());
  } catch {
    return null;
  }
}

function getSafeFileName(url, index) {
  const clean = url.split("?")[0];
  let name = path.basename(clean);

  if (!name || name.length < 3) {
    name = `img_${index}.jpg`;
  }

  return name;
}

/* =========================
   DOWNLOAD IMAGES
========================= */

async function saveImages(imageUrls, productId) {
  if (!productId) throw new Error("Missing productId");

  const folder = path.join(__dirname, `../data/imgs/${productId}`);
  await fs.ensureDir(folder);

  const savedPaths = [];

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];

    const fileName = getSafeFileName(url, i);
    const filePath = path.join(folder, fileName);

    try {
      await downloadImage(url, filePath);
      savedPaths.push(filePath);
    } catch (err) {
      console.error("Download fail:", url);
    }
  }

  return savedPaths;
}

/* =========================
   EXTRACT IMAGES
========================= */
async function getImages(page) {
  await page.waitForSelector('[class*="GoodsDetailCarousel"] .swiper-slide img', { timeout: 10000 });

  const urls = await page.$$eval('[class*="GoodsDetailCarousel"] .swiper-slide img', (imgs) => {
    return imgs
      .map(img => img.currentSrc || img.src)
      .filter(Boolean)
      .filter(src =>
        src.includes("image.oliveyoung") ||
        src.includes("oliveyoung.co.kr")
      );
  });

  return [...new Set(urls)];
}
/* =========================
   MAIN CRAWLER
========================= */

async function crawlProduct(url, productId) {
  let browser;

  try {
    browser = await chromium.launch({
      headless: false,
      slowMo: 50,
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
    });

    const page = await context.newPage();

    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(3000);

    /* =========================
       PRODUCT NAME
    ========================= */
    const name = await safeEval(page, '[class*="GoodsDetailInfo_title"]');

    /* =========================
       SPEC TABLE
    ========================= */
    await page.click('button[aria-expanded="false"]');
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

    /* =========================
       IMAGES
    ========================= */
    const images = await getImages(page);

    if (!productId) {
      productId = url.match(/goodsNo=([^&]+)/)?.[1];
    }
    const savedImages = await saveImages(images, productId);

    /* =========================
       PRICE INFO
    ========================= */
    const original = await safeEval(
      page,
      '[data-qa-name="text-product-original-price"]',
    );

    const sale = await safeEval(
      page,
      '[data-qa-name="text-product-discount-price"]',
    );

    const discount =
      (await safeEval(page, '[class*="GoodsDetailInfo_rate"]')) ||
      (await safeEval(page, ".GoodsDetailInfo_rate__TsYCQ"));

    /* =========================
       RETURN RESULT
    ========================= */

    return {
      url,
      name,
      specs,
      images: savedImages,
      price: {
        original,
        sale,
        discount,
      },
    };
  } catch (err) {
    console.error("Crawler error:", url, err.message);
    throw err;
  } finally {
    if (browser) await browser.close();
  }
}

/* =========================
   EXPORT
========================= */

module.exports = { crawlProduct };
