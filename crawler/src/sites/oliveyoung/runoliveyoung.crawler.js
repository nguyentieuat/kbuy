// sites/oliveyoung/runoliveyoung.crawler.js

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const CrawlerSessionManager = require("../../../core/sessionManager");

const INPUT_DIR = path.join(process.cwd(), "data/output_products_kr");
const OUTPUT_DIR = path.join(process.cwd(), "data/output_products_kr_updated0516");

/* ========================= */
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
  return parseInt(text.replace(/[^\d]/g, ""), 10);
}

/* ========================= */
/* simulate user */
async function simulateHuman(page) {
  try {
    await page.waitForTimeout(800 + Math.random() * 1200);

    await page.mouse.move(Math.random() * 400, Math.random() * 400);

    await page.waitForTimeout(500 + Math.random() * 1000);

    await page.mouse.wheel(0, 300 + Math.random() * 700);
  } catch {}
}

/* ========================= */
/* CLICK bằng evaluate (fix chính) */
async function openVariantDropdown(page) {
  try {
    await page.waitForTimeout(800);

    await page.evaluate(() => {
      const btn = document.querySelector(
        '[class*="OptionSelector_btn-option"]',
      );
      if (btn) btn.click();
    });

    console.log("👉 clicked variant");

    await page.waitForTimeout(1000);

    await page.waitForSelector('[data-qa-name^="text-product-option"]', {
      timeout: 5000,
    });
  } catch (err) {
    console.log("❌ open variant fail:", err.message);
  }
}

/* ========================= */
/* 📦 GET VARIANTS */
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

          // ✅ Chỉ lấy flag thường, loại trừ soldout span
          const flags = Array.from(
            el.querySelectorAll('[class*="option-item-flag"]'),
          )
            .filter((f) => !f.className.includes("soldout"))
            .map((f) => f.innerText.trim())
            .filter(Boolean);

          // ✅ Detect soldout từ class của li element
          const isSoldout = el.className.includes("is-soldout");
          console.log(isSoldout);

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
      raw: {
        priceText: v.priceText,
        discountText: v.discountText,
      },
    }));
  } catch {
    return [];
  }
}

/* ========================= */
async function processFile(browser, file) {
  const session = new CrawlerSessionManager(browser);

  const { page, context } = await session.safeGetPage();

  const inputPath = path.join(INPUT_DIR, file);
  const outputPath = path.join(OUTPUT_DIR, file);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
  }

  const lines = fs.readFileSync(inputPath, "utf-8").split("\n").filter(Boolean);

  console.log(`\n📂 Processing ${file} (${lines.length} items)`);

  for (let i = 0; i < lines.length; i++) {
    const product = JSON.parse(lines[i]);

    console.log(`\n🔹 ${i + 1}/${lines.length} - ${product.productId}`);

    // skip nếu đã có
    if (product.variants && product.variants.length > 0) {
      console.log("⏩ skip");
      fs.appendFileSync(outputPath, JSON.stringify(product) + "\n");
      continue;
    }

    try {
      await page.goto(product.url, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      await simulateHuman(page);

      let variants = [];

      // 🟢 thử lấy luôn
      variants = await getVariants(page, product.productId);
      console.log("👉 direct:", variants.length);

      // 🟡 nếu chưa có → click
      if (!variants.length) {
        await openVariantDropdown(page);

        for (let r = 0; r < 3; r++) {
          variants = await getVariants(page, product.productId);
          console.log(`👉 retry ${r + 1}:`, variants.length);

          if (variants.length) break;
          await sleep(1000);
        }
      }

      if (variants.length > 0) {
        console.log(`✅ ${variants.length} variants`);

        product.variants = variants;
        delete product.price;
      } else {
        console.log("⚠️ no variants");
      }

      fs.appendFileSync(outputPath, JSON.stringify(product) + "\n");
    } catch (err) {
      console.log("❌ fail:", err.message);
      fs.appendFileSync(outputPath, JSON.stringify(product) + "\n");
    }

    await sleep(humanDelay());
  }

  await page.close();
  await context.close();
}

/* ========================= */
async function main() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
  });

  const files = fs.readdirSync(INPUT_DIR);

  for (const file of files) {
    if (!file.endsWith(".jsonl")) continue;
    await processFile(browser, file);
  }

  await browser.close();
}

main();
