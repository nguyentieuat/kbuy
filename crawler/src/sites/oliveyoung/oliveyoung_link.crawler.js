const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const CrawlerSessionManager = require("../../../core/sessionManager");

/* ====================== */
// CONFIG
/* ====================== */

// Target URL (Olive Young best list)
const URL =
  "https://www.oliveyoung.co.kr/store/main/getBestList.do?t_page=%EC%83%81%ED%92%88%EC%83%81%EC%84%B8&t_click=GNB&t_swiping_type=N&t_gnb_type=%EB%9E%AD%ED%82%B9";

// Output folder for category link files
const OUTPUT_DIR = path.join(__dirname, "../../../data/links");
/* ====================== */
// CATEGORY MAP
/* ====================== */

// New category slug -> id
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

  // Lifestyle
  "do-gia-dung": 51,
  "van-phong-pham": 52,
  "do-bep": 53,
  "phu-kien-doi-song": 54,
};

// Korean category -> NEW slug
const categoryMap = {
  // skincare
  스킨케어: "cham-soc-da",
  클렌징: "lam-sach",
  "클렌징/필링": "lam-sach",
  마스크팩: "mat-na",
  선케어: "chong-nang",

  // makeup
  메이크업: "trang-diem",
  베이스메이크업: "trang-diem-nen",
  립메이크업: "trang-diem-mau",
  아이메이크업: "trang-diem-mau",
  네일: "lam-mong",

  // hair/body
  헤어케어: "cham-soc-toc",
  바디케어: "cham-soc-co-the",

  // fragrance
  프레그런스: "nuoc-hoa",
  "향수/디퓨저": "nuoc-hoa",

  // dermo
  "더모 코스메틱": "my-pham-da-lieu",

  // beauty devices/accessories
  미용소품: "phu-kien-lam-dep",
  "뷰티 디바이스/소품": "thiet-bi-lam-dep",
  "메이크업 툴": "phu-kien-lam-dep",

  // men
  맨즈에딧: "cham-soc-co-the",

  // health
  건강식품: "thuc-pham-chuc-nang",
  푸드: "thuc-pham-chuc-nang",
  "헬스/푸드": "thuc-pham-chuc-nang",

  구강용품: "cham-soc-rang-mieng",
  "헬스/건강용품": "cham-soc-suc-khoe",

  // fashion
  패션: "quan-ao",

  // fandom / hobby
  "취미/팬시": "figure-goods",

  // kpop/anime
  아이돌: "kpop-idol",
  애니메이션: "anime",
  esports: "esports-gaming",
};

// Skip categories
const skipCategories = ["전체", "위생용품", "홈리빙/가전"];

/* ====================== */
// UTILS
/* ====================== */

// Sleep helper
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Random delay to simulate human behavior
function randomDelay(min = 1000, max = 3000) {
  return Math.floor(Math.random() * (max - min) + min);
}

function normalizeProductUrl(url) {
  try {
    const u = new URL(url);

    // chỉ giữ goodsNo
    const goodsNo = u.searchParams.get("goodsNo");

    if (!goodsNo) return url;

    return `https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=${goodsNo}`;
  } catch {
    return url;
  }
}

/* ====================== */
// MAIN CRAWLER
/* ====================== */

async function crawlOliveBestList() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
  }

  // Launch browser
  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const sessionManager = new CrawlerSessionManager(browser, {
    maxPagesPerContext: 5,
  });

  const { page } = await sessionManager.safeGetPage();

  // Navigate to best list page
  await page.goto(URL, { waitUntil: "domcontentloaded" });

  // Wait for category buttons to appear
  await page.waitForSelector(".common-menu button[data-ref-dispcatno]");

  // Extract category names from menu
  const categories = await page.$$eval(
    ".common-menu button[data-ref-dispcatno]",
    (items) => [
      ...new Set(items.map((el) => el.innerText.trim()).filter(Boolean)),
    ],
  );

  console.log("Categories:", categories);

  // Loop through categories
  for (let i = 0; i < categories.length; i++) {
    const categoryName = categories[i];

    // Skip unwanted categories
    if (skipCategories.includes(categoryName)) {
      console.log("Skip:", categoryName);
      continue;
    }

    // Map Korean name to slug
    const slug = categoryMap[categoryName];

    if (!slug) {
      console.log("No mapping:", categoryName);
      continue;
    }

    // Get categoryId
    const categoryId = categoryIdMap[slug];

    console.log(`Processing ${categoryName} -> ${slug}_${categoryId}`);

    // Locate category button
    const btn = page
      .locator(`.common-menu button:has-text("${categoryName}")`)
      .first();

    // Get first product link before clicking (for change detection)
    let prevFirstLink = null;
    try {
      prevFirstLink = await page.$eval(
        ".cate_prd_list li .prd_thumb",
        (el) => el.href,
      );
    } catch {}

    // Click category
    await btn.click();

    // Wait until product list updates
    await page.waitForFunction((prev) => {
      const el = document.querySelector(".cate_prd_list li .prd_thumb");
      return el && el.href !== prev;
    }, prevFirstLink);

    // Extract product links
    const links = [
      ...new Set(
        (
          await page.$$eval(".cate_prd_list li .prd_thumb", (as) =>
            as.map((a) => a.href),
          )
        ).map((url) => normalizeProductUrl(url)),
      ),
    ];

    console.log(`${categoryName}: ${links.length} links`);

    /* ====================== */
    // SAVE LINKS TO FILE
    /* ====================== */

    const fileName = `${slug}_${categoryId}.txt`;
    const filePath = path.join(OUTPUT_DIR, fileName);

    let existing = new Set();

    // Load existing links (for deduplication)
    if (fs.existsSync(filePath)) {
      existing = new Set(
        fs
          .readFileSync(filePath, "utf-8")
          .split("\n")
          .filter(Boolean)
          .map(normalizeProductUrl),
      );
    }

    // Filter only new links
    const newLinks = links.filter((l) => !existing.has(l));

    // Append new links to file
    if (newLinks.length > 0) {
      fs.appendFileSync(filePath, newLinks.join("\n") + "\n", "utf-8");
      console.log(`Saved ${newLinks.length} new links to ${fileName}`);
    } else {
      console.log("No new links");
    }

    // Small delay between categories
    await sleep(randomDelay());

    // Longer rest every 5 categories
    if ((i + 1) % 5 === 0) {
      const rest = randomDelay(30000, 60000);
      console.log(`Resting ${Math.floor(rest / 1000)} seconds`);
      await sleep(rest);
    }
  }

  await sessionManager.close();
  await browser.close();
  console.log("Done");
}

module.exports = { crawlOliveBestList };

crawlOliveBestList();
