const path = require("path");
const fs = require("fs-extra");
const { downloadImage } = require("../../utils/downloadImage");

/* ========================= */
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
  if (!name || name.length < 3) name = `img_${index}.jpg`;
  return name;
}

/* ========================= */
async function saveImages(imageUrls, productId) {
  const folder = path.join(process.cwd(), "data/image", productId);
  await fs.ensureDir(folder);

  const saved = [];

  for (let i = 0; i < imageUrls.length; i++) {
    const fileName = getSafeFileName(imageUrls[i], i);
    const filePath = path.join(folder, fileName);

    try {
      await downloadImage(imageUrls[i], filePath);
      saved.push(filePath);
    } catch {}
  }

  return saved;
}

/* ========================= */
async function getImages(page) {
  await page.waitForSelector('[class*="GoodsDetailCarousel"] img', {
    timeout: 10000,
  });

  const urls = await page.$$eval('[class*="GoodsDetailCarousel"] img', (imgs) =>
    imgs.map((img) => img.currentSrc || img.src).filter(Boolean),
  );

  return [...new Set(urls)];
}

/* ========================= */
async function crawlProduct(page, url) {
  try {
    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForTimeout(5000);

    const productId = url.match(/goodsNo=([^&]+)/)?.[1];

    const name = await safeEval(page, '[class*="GoodsDetailInfo_title"]');

    const btn = page.locator('button:has-text("상품정보 제공고시")');

    console.log(await btn.count());

    if (await btn.count()) {
      const expanded = await btn.getAttribute("aria-expanded");

      if (expanded === "false") {
        await btn.click();
      }

      await page.waitForSelector('[class*="Accordion_table"] tbody tr', {
        timeout: 3000,
      });
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

    const images = await getImages(page);
    const savedImages = await saveImages(images, productId);

    await page.waitForSelector(
      '[data-qa-name="text-product-discount-price"], [data-qa-name="text-product-original-price"]',
      { timeout: 5000 },
    );

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

    return {
      productId,
      url,
      name,
      specs,
      images: savedImages,
      price: { original, sale, discount },
    };
  } catch (err) {
    console.log("❌ Fail:", url);
    return null;
  }
}

module.exports = { crawlProduct };
