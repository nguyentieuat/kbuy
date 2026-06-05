const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const CrawlerSessionManager = require("../../../core/sessionManager");
const { categoryIdMap } = require("../category_root/category.map");

/* ====================== */
// CONFIG
/* ====================== */

const URL = "https://www.musinsa.com/main/boutique/recommend?gf=A";
const OUTPUT_DIR = path.join(__dirname, "../../../data/links/musinsa");

// Selector chuẩn hóa dùng xuyên suốt hệ thống
const CATEGORY_SELECTOR = 'a[data-section-name="main_quickmenu"][data-content-name]';

/* ====================== */
// CATEGORY MAP
/* ====================== */
const musinsaLabelToSlug = {
  "T-SHIRTS": "ao-thun",
  "SHIRTS": "ao-so-mi",
  "OUTER": "ao-khoac",
  "PANTS&SKIRTS": "quan-vay",
  "SHORTS": "quan-short",
  "HOODIE": "ao-hoodie",
  "SWEATSHIRTS": "ao-sweatshirt",
  "CARDIGAN": "ao-cardigan",
  "SHOES": "giay-sneaker-boots",
  "BAGS": "tui-xach-bags",
  "WALLETS": "vi-bop",
  "JEWELRY": "phu-kien-trang-suc",
  "CAP": "mu-non",
  "EYEWEAR": "kinh-mat",
  "LIFE": "life-goods"
};

const skipCategories = ["ALL", "전체"];

/* ====================== */
// UTILS
/* ====================== */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelay(min = 1000, max = 3000) {
  return Math.floor(Math.random() * (max - min) + min);
}

function normalizeProductUrl(url) {
  try {
    const u = new URL(url);
    const productId = u.searchParams.get("productId");
    if (!productId) return url.split("?")[0]; 
    return `https://www.musinsa.com/products/${productId}`;
  } catch {
    return url;
  }
}

/* ====================== */
// MAIN CRAWLER
/* ====================== */

async function crawlMusinsaBestList() {
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

  // Fake User-Agent xịn né Cloudflare
  await page.context().setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7'
  });

  console.log("🚀 Đang tải trang Musinsa Best List...");
  await page.goto(URL, { waitUntil: "load", timeout: 60000 });

  try {
    await page.waitForSelector(CATEGORY_SELECTOR, { state: "visible", timeout: 15000 });
  } catch (err) {
    console.error("❌ Không tìm thấy menu danh mục ban đầu.");
    throw err;
  }

  // Thu thập danh mục ban đầu
  const categories = await page.$$eval(CATEGORY_SELECTOR, (items) => {
    return [...new Set(
      items
        .map(el => el.getAttribute("data-content-name"))
        .filter(Boolean)
    )];
  });
  console.log("Danh sách danh mục tìm thấy:", categories);

  // Vòng lặp quét qua từng Category
  for (let i = 0; i < categories.length; i++) {
    const categoryName = categories[i];

    if (skipCategories.includes(categoryName)) {
      console.log(`⏩ Bỏ qua danh mục cấu hình: ${categoryName}`);
      continue;
    }

    const slug = musinsaLabelToSlug[categoryName];
    if (!slug) {
      console.log(`⚠️ Không tìm thấy map slug cho: ${categoryName}`);
      continue;
    }

    // --- CƠ CHẾ SỬA LỖI (AUTO-FALLBACK BACK TO ROOT) ---
    // Kiểm tra xem nút bấm của category hiện tại có thực sự tồn tại và click được không
    const targetBtnSelector = `a[data-section-name="main_quickmenu"][data-content-name="${categoryName}"]`;
    const isBtnReady = await page.locator(targetBtnSelector).first().isVisible().catch(() => false);

    if (!isBtnReady) {
      console.log(`🔄 [DOM Changed] Không tìm thấy nút danh mục do trang đã chuyển hướng. Tiến hành quay lại trang gốc...`);
      await page.goto(URL, { waitUntil: "load", timeout: 40000 });
      // Đợi menu tái render hoàn toàn
      await page.waitForSelector(CATEGORY_SELECTOR, { state: "visible", timeout: 15000 });
    }
    // ----------------------------------------------------

    const categoryId = categoryIdMap[slug];
    console.log(`\n=== [${i + 1}/${categories.length}] Xử lý: ${categoryName} -> ${slug}_${categoryId} ===`);

    // Định vị lại chính xác button sau khi DOM ổn định
    const btn = page.locator(targetBtnSelector).first();
    
    const prevFirstLink = await page
      .locator('a[href*="/products/"]')
      .first()
      .getAttribute("href")
      .then(url => url ? normalizeProductUrl(url) : null)
      .catch(() => null);

    // Tiến hành click chuyển tab danh mục
    await btn.click();

    // Chờ danh sách sản phẩm thay đổi hoàn toàn
    try {
      await page.waitForFunction((prev) => {
        const el = document.querySelector('a[href*="/products/"]');
        if (!el || !el.href) return false;
        const currentUrl = el.href.split('?')[0];
        const prevUrl = prev ? prev.split('?')[0] : '';
        return currentUrl !== prevUrl;
      }, prevFirstLink, { timeout: 8000 });
    } catch {
      console.log(`[Thông báo] Danh sách sản phẩm giữ nguyên hoặc render bất đồng bộ.`);
    }

    await page.waitForTimeout(1500);

    const rawLinks = await page.$$eval('a[href*="/products/"]', (items) => {
      return items.map(el => el.href).filter(Boolean);
    });

    const normalizedLinks = [...new Set(rawLinks.map(normalizeProductUrl))];
    console.log(`-> Tìm thấy ${normalizedLinks.length} đường dẫn sản phẩm.`);

    /* ====================== */
    // ĐỐI CHIẾU & LƯU FILE
    /* ====================== */
    const fileName = `${slug}_${categoryId}.txt`;
    const filePath = path.join(OUTPUT_DIR, fileName);

    let existing = new Set();
    if (fs.existsSync(filePath)) {
      existing = new Set(
        fs
          .readFileSync(filePath, "utf-8")
          .split("\n")
          .filter(Boolean)
          .map(normalizeProductUrl)
      );
    }

    const newLinks = normalizedLinks.filter((l) => !existing.has(l));

    if (newLinks.length > 0) {
      fs.appendFileSync(filePath, newLinks.join("\n") + "\n", "utf-8");
      console.log(`✅ Đã lưu thêm ${newLinks.length} link mới vào file: ${fileName}`);
    } else {
      console.log("✨ Không có đường dẫn nào mới.");
    }

    // Nghỉ ngắn giữa các category nhỏ
    await sleep(randomDelay());

    // Anti-scraping nghỉ dài
    if ((i + 1) % 5 === 0 && (i + 1) < categories.length) {
      const rest = randomDelay(20000, 35000);
      console.log(`🛑 Kích hoạt chế độ nghỉ ngơi: Dừng ${Math.floor(rest / 1000)} giây...`);
      await sleep(rest);
    }
  }

  await sessionManager.close();
  await browser.close();
  console.log("\n🎉 HOÀN THÀNH TIẾN TRÌNH CÀO LINK!");
}

module.exports = { crawlMusinsaBestList };

if (require.main === module) {
  crawlMusinsaBestList();
}