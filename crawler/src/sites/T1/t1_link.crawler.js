const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const CrawlerSessionManager = require("../../../core/sessionManager");

/* ====================== */
// CONFIG
/* ====================== */

// Target URL (best list)
const URL = "https://shop-t1.gg/category/all/192";

// Output folder for category link files
const OUTPUT_DIR = path.join(__dirname, "../../../data/links/t1");
/* ====================== */
// CATEGORY MAP
/* ====================== */

// Map slug → categoryId (used in file naming)
const categoryIdMap = {
  // ROOT
  "my-pham": 1,
  "suc-khoe": 2,
  "thoi-trang": 3,
  "kpop-anime-gaming": 4,
  lifestyle: 5,

  // Mỹ phẩm
  "cham-soc-da": 11,
  "trang-diem": 12,
  "cham-soc-toc": 13,
  "cham-soc-co-the": 14,
  "nuoc-hoa": 15,
  "my-pham-da-lieu": 16,
  "thiet-bi-lam-dep": 17,
  "phu-kien-lam-dep": 18,

  // Chăm sóc da
  "lam-sach": 111,
  "mat-na": 112,
  "chong-nang": 113,
  toner: 114,
  "serum-treatment": 115,
  "kem-duong": 116,

  // Trang điểm
  "trang-diem-nen": 121,
  "trang-diem-mau": 122,
  "lam-mong": 123,

  // Sức khỏe
  "thuc-pham-chuc-nang": 21,
  vitamin: 22,
  "protein-eat-clean": 23,
  "cham-soc-rang-mieng": 24,
  "cham-soc-suc-khoe": 25,

  // Thời trang
  "quan-ao": 31,
  "giay-dep": 32,
  "tui-xach": 33,
  "trang-suc": 34,
  "phu-kien-thoi-trang": 35,

  // Kpop / Anime / Gaming
  "kpop-idol": 41,
  anime: 42,
  "esports-gaming": 43,
  "album-photobook": 44,
  "figure-goods": 45,
  "esports-jersey": 431,
  "esports-apparel": 432,
  "gaming-accessories": 433,
  "gaming-collectibles": 434,
  "photocard-slogan": 435,
  // Lifestyle
  "do-gia-dung": 51,
  "van-phong-pham": 52,
  "do-bep": 53,
  "phu-kien-doi-song": 54,
};

/* ====================== */
// HELPERS
/* ====================== */

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function randomDelay(min = 800, max = 2000) {
  return Math.floor(Math.random() * (max - min) + min);
}

function normalizeUrl(url) {
  if (!url) return null;

  if (url.startsWith("/")) {
    return `https://shop-t1.gg${url}`;
  }

  return url.split("?")[0];
}

/* ====================== */
// CATEGORY DETECTOR
/* ====================== */

function detectCategory(name = "") {
  const text = name.toLowerCase();

  // =====================
  // ESPORTS JERSEY
  // =====================

  if (/(jersey|uniform|player jersey|team jersey)/i.test(text)) {
    return {
      slug: "esports-jersey",
      categoryId: 431,
    };
  }

  // =====================
  // ESPORTS APPAREL
  // =====================

  if (/(hoodie|jacket|shirt|tee|pants|sweatshirt)/i.test(text)) {
    return {
      slug: "esports-apparel",
      categoryId: 432,
    };
  }

  // =====================
  // GAMING ACCESSORIES
  // =====================

  if (/(deskmat|mousepad|keyboard|gaming|mouse|keycap)/i.test(text)) {
    return {
      slug: "gaming-accessories",
      categoryId: 433,
    };
  }

  // =====================
  // PHOTOCARD / SLOGAN
  // =====================

  if (/(photocard|slogan|poster|l-holder|photo set)/i.test(text)) {
    return {
      slug: "photocard-slogan",
      categoryId: 435,
    };
  }

  // =====================
  // DEFAULT GOODS
  // =====================

  return {
    slug: "gaming-collectibles",
    categoryId: 434,
  };
}

/* ====================== */
// MAIN
/* ====================== */

async function crawlT1Links() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, {
      recursive: true,
    });
  }

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const sessionManager = new CrawlerSessionManager(browser, {
    maxPagesPerContext: 1,
  });

  const { page } = await sessionManager.safeGetPage();

  console.log("Opening T1 shop...");

  await page.goto(URL, {
    waitUntil: "domcontentloaded",
  });

  await page.waitForTimeout(3000);

  /* ====================== */
  // LOAD MORE LOOP
  /* ====================== */

  while (true) {
    const moreBtn = page.locator(".btnMore");

    const visible = await moreBtn.isVisible().catch(() => false);

    if (!visible) {
      console.log("No more button");
      break;
    }

    console.log("Click load more...");

    await moreBtn.click();

    await page.waitForTimeout(randomDelay(1500, 3000));
  }

  console.log("All products loaded");

  /* ====================== */
  // EXTRACT PRODUCTS
  /* ====================== */

  const products = await page.$$eval("li[id^='anchorBoxId_']", (items) => {
    const seen = new Set();

    return items
      .map((item) => {
        // SOLD OUT
        const isSoldout =
          item.classList.contains("is-soldout") ||
          item.querySelector(".soldout-bg[style*='flex']") ||
          item.querySelector('img[alt="품절"]');

        if (isSoldout) {
          return null;
        }

        const a = item.querySelector('a[href*="/product/"]');

        if (!a) return null;

        const spans = item.querySelectorAll(".name span");

        const name = spans.length
          ? spans[spans.length - 1].textContent.trim()
          : "";

        return {
          url: a.href,
          name,
        };
      })
      .filter(Boolean)
      .filter((item) => {
        if (seen.has(item.url)) {
          return false;
        }

        seen.add(item.url);

        return true;
      });
  });
  console.log(`Extracted ${products.length} products`);

  /* ====================== */
  // GROUP BY CATEGORY
  /* ====================== */

  const grouped = {};

  for (const product of products) {
    const cate = detectCategory(product.name);

    const key = `${cate.slug}_${cate.categoryId}`;

    if (!grouped[key]) {
      grouped[key] = [];
    }

    grouped[key].push({
      name: product.name,
      url: normalizeUrl(product.url),
      thumbnail: product.thumbnail,
      soldout: product.soldout,
    });
  }

  /* ====================== */
  // SAVE FILES
  /* ====================== */
  for (const key of Object.keys(grouped)) {
    const rows = grouped[key];

    const filePath = path.join(OUTPUT_DIR, `${key}.txt`);

    const existing = new Set();

    if (fs.existsSync(filePath)) {
      fs.readFileSync(filePath, "utf-8")
        .split("\n")
        .filter(Boolean)
        .forEach((line) => {
          existing.add(line.trim());
        });
    }

    const newLinks = rows.map((r) => r.url).filter((url) => !existing.has(url));

    if (!newLinks.length) {
      console.log(`${key}: no new links`);
      continue;
    }

    fs.appendFileSync(filePath, newLinks.join("\n") + "\n", "utf-8");

    console.log(`${key}: saved ${newLinks.length}`);
  }

  await sessionManager.close();
  await browser.close();

  console.log("DONE");
}

crawlT1Links();
