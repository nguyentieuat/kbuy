const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const CrawlerSessionManager = require("../../../core/sessionManager");
const { categoryIdMap } = require("../category_root/category.map");

/* ====================== */
// CONFIG
/* ====================== */

const URL =
  "https://www.kgcshop.co.kr/shop/goodsList?ctgryId=50#page1";

const OUTPUT_DIR = path.join(__dirname, "../../../data/output_products/kgc");

/* ====================== */
// CATEGORY MAP (KGC → SYSTEM SLUG)
// ========================= */

const categoryMap = {
  건강: "thuc-pham-chuc-nang",
  홍삼: "thuc-pham-chuc-nang",
  천녹: "thuc-pham-chuc-nang",
  기다림: "thuc-pham-chuc-nang",
  침향: "thuc-pham-chuc-nang",
  GLPro: "thuc-pham-chuc-nang",
  알파프로젝트: "thuc-pham-chuc-nang",
  굿베이스: "thuc-pham-chuc-nang",
  관절닥터: "thuc-pham-chuc-nang",
  타마본: "thuc-pham-chuc-nang",
  가든오브라이프: "thuc-pham-chuc-nang",

  화장품: "my-pham",

  기호: "thuc-pham-chuc-nang",
};

/* ====================== */
// UTILS
/* ====================== */

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function randomDelay(min = 1000, max = 3000) {
  return Math.floor(Math.random() * (max - min) + min);
}

function writeJsonl(filePath, rows) {
  fs.writeFileSync(
    filePath,
    rows
      .map(row => JSON.stringify(row))
      .join("\n"),
    "utf8"
  );
}

function readJsonl(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .split("\n")
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

/* ====================== */
// MAIN
/* ====================== */

async function crawlKGCBestList() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const sessionManager = new CrawlerSessionManager(browser, {
    maxPagesPerContext: 5,
  });

  const { page } = await sessionManager.safeGetPage();

  // =========================
  // LOAD BASE PAGE ONCE TO GET CATEGORY LIST
  // =========================
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".menu-category a.link");

  const categories = await page.$$eval(".menu-category a.link", (items) =>
    items
      .map((el) => ({
        name: el.innerText.trim(),
      }))
      .filter((c) => c.name)
  );

  console.log("Categories:", categories);

  // =========================
  // LOOP CATEGORY
  // =========================

  for (let i = 0; i < categories.length; i++) {
    const { name: categoryName } = categories[i];

    const slug = categoryMap[categoryName];

    if (!slug) {
      console.log("No mapping:", categoryName);
      continue;
    }

    const categoryId = categoryIdMap[slug];

    console.log(`\n============================`);
    console.log(`Processing: ${categoryName}`);
    console.log(`=> ${slug}_${categoryId}`);

    // =========================
    // IMPORTANT: RESET PAGE STATE
    // =========================
    await page.goto(URL, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".menu-category a.link");

    // CLICK CATEGORY
    const btn = page
      .locator(`.menu-category a:has-text("${categoryName}")`)
      .first();

    await btn.click();

    // WAIT PRODUCT LIST
    await page.waitForFunction(() => {
      const price = document.querySelector(
        "li[data_il_item_id] .price-red2"
      );

      return price && price.textContent.trim().length > 0;
    });

    // =========================
    // EXTRACT PRODUCTS
    // =========================
    const items = await page.$$eval("li[data_il_item_id]", (els) =>
      els.map((el) => {
        const id = el.getAttribute("data_il_item_id");

        const names = [
          ...el.querySelectorAll(".information .pname")
        ]
          .map(x => x.textContent.trim())
          .filter(Boolean);

        const name = names.join(" ");

        const image =
          el.querySelector(".thumb img")?.getAttribute("src") || "";

        const ratingText =
          el.querySelector(".text-color-gray-400")?.textContent?.trim() || "0";

        const reviewText =
          el.querySelector(".txt-score")?.textContent?.trim() || "(0)";

        const priceText =
          el.querySelector(".price-red2")?.textContent?.trim() || "0";

        const reviewCount = Number(
          reviewText.replace(/[^\d]/g, "")
        );

        const rating = parseFloat(ratingText) || 0;

        const purchaseCount = Number(
          (
            el.querySelector(".wrap-review dd")?.textContent || ""
          ).replace(/[^\d]/g, "")
        );

        const price = Number(
          priceText.replace(/[^\d]/g, "")
        );

        return {
          productId: id,
          source: "kgc",
          url: `https://www.kgcshop.co.kr/shop/goodsView?itemId=${id}`,

          name,

          brand:
            el.getAttribute("data_brand_name") || "",

          category1:
            el.getAttribute("data_ctgry_name1") || "",

          category2:
            el.getAttribute("data_ctgry_name2") || "",

          category3:
            el.getAttribute("data_ctgry_name3") || "",

          category4:
            el.getAttribute("data_ctgry_name4") || "",

          thumbnail: image,

          source_rating_avg: rating,
          source_rating_count: reviewCount,
          source_purchase_count: purchaseCount,

          price: {
            originalPrice: price,
            salePrice: price,
            discount: 0,
          },

          crawledAt: new Date().toISOString(),
        };
      })
    );
    console.log(`${categoryName}: ${items.length} items`);

    // =========================
    // SAVE FILE
    // =========================

    const fileName = `${slug}_${categoryId}.jsonl`;
    const filePath = path.join(OUTPUT_DIR, fileName);

    let existingItems = [];

    if (fs.existsSync(filePath)) {
      try {
        existingItems = readJsonl(filePath);
      } catch {
        existingItems = [];
      }
    }
    const map = new Map();

    // dữ liệu cũ
    for (const item of existingItems) {
      map.set(String(item.productId), item);
    }

    // dữ liệu mới ghi đè
    for (const item of items) {
      map.set(String(item.productId), item);
    }

    const merged = [...map.values()];

    writeJsonl(
      filePath,
      merged
    );

    console.log(
      `Saved ${merged.length} products to ${fileName}`
    );
    // =========================
    // DELAY CONTROL
    // =========================
    await sleep(randomDelay());

    if ((i + 1) % 5 === 0) {
      const rest = randomDelay(30000, 60000);
      console.log(`Resting ${Math.floor(rest / 1000)}s`);
      await sleep(rest);
    }
  }

  await sessionManager.close();
  await browser.close();

  console.log("\nDONE");
}

module.exports = { crawlKGCBestList };

crawlKGCBestList();