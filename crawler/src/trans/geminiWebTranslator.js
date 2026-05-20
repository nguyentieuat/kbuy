// trans/geminiWebTranslator.js

const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const CrawlerSessionManager = require("../../core/sessionManager");

/* ========================= */
/* CONFIG */
const INPUT_DIR = "./data/output_products_kr";
const OUTPUT_DIR = "./data/output_products_vi_gemini";

/* ========================= */
/* PROMPT */
function buildPrompt(product) {
  return `
Dịch JSON sau sang tiếng Việt.
                RULE:
                - Giữ nguyên id
		- Dịch luôn specs key chuyển phần dịch thàng specs_vi, giữ specs cũ trong kết quả trả về
                - Chỉ dịch field text
                - Không thêm giải thích
                - Trả về JSON ARRAY đúng format
                - Hãy giữ nguyên tên các hợp chất hóa học bằng tiếng Anh (ví dụ: Glycerin, Niacinamide) và chỉ dịch tên các chiết xuất tự nhiên sang tiếng Việt."
                - Đối với các trường có nội dung dài như 'Lưu ý khi sử dụng' và 'Hướng dẫn sử dụng':
                    Phân tích cấu trúc: Hãy tự động nhận diện các thành phần có tính liệt kê (bất kể chúng bắt đầu bằng 1, 2, 3; hoặc a, b, c; hoặc các dấu gạch đầu dòng -, •).
                    Định dạng Markdown: Trình bày lại dưới dạng danh sách Markdown có phân cấp rõ ràng:
                    Các mục lớn nhất luôn bắt đầu bằng 1., 2., 3.
                    Các mục con bổ trợ cho mục lớn phải được thụt lề và bắt đầu bằng dấu gạch ngang -.
                    Tính nhất quán: Ngay cả khi văn bản gốc dùng 'a, b, c' làm mục lớn, hãy chuyển đổi chúng về hệ thống 1, 2, 3 để toàn bộ sản phẩm có định dạng đồng nhất.
                    Ví dụ mục tiêu:
                        1. Lưu ý chung
                            - Tránh ánh nắng
                            - Để xa tầm tay
                        2. Hạn chế sử dụng trên vết thương.
Phát hiện:
- Trọng lượng 
- Thể tích 
- Kích thước
- Sản phẩm mỹ phẩm
- Sản phẩm thực phẩm
Trích xuất trọng lượng/kích thước nếu:
A. Trọng lượng rõ ràng tồn tại → sử dụng
B. Thể tích rõ ràng tồn tại VÀ Sản phẩm mỹ phẩm = true → chuyển đổi ml → g
C. Kích thước rõ ràng tồn tại → chuyển đổi
Nếu không tồn tại:

→ ước lượng khối lượng kích thước

QUAN TRỌNG:

- Các giá trị thiếu thì dự đoán và đánh giá trọng số độ chính xác vào weight_confidence 

trả về json addpend vào json data đã được dịch:
product_shipping {
  "raw_weight_grams": null,
  "raw_length_mm": null,
  "raw_width_mm": null,
  "raw_height_mm": null,

  "weight_grams": null,
  "length_mm": null,
  "width_mm": null,
  "height_mm": null,

  "is_bulky": false,

  "weight_source": "specs|text|variant|null",
  "weight_confidence": 0.0,
  "is_weight_estimated": true
}

data:
${JSON.stringify(product, null, 2)}
`;
}

// element bạn gửi
const INPUT_SELECTOR =
  ".text-input-field_textarea-inner [contenteditable='true']";

// lấy response JSON block
const RESPONSE_SELECTOR = "model-response structured-content-container";

async function sendPrompt(page, prompt) {

const input = page.locator("div.ql-editor[contenteditable='true']");
await input.waitFor({ timeout: 60000 });

  await page.click(input);

  await page.keyboard.type(prompt, { delay: 10 });

  await page.keyboard.press("Enter");

  console.log("✅ prompt sent");
}

/* ========================= */
/* GEMINI WEB WORKER */
async function sendToGemini(page, prompt) {
  await page.goto("https://gemini.google.com/app", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await page.waitForSelector("text-input-field");

  await sendPrompt(page, prompt);

  // wait response (simple version)
  await page.waitForTimeout(8000);

  const result = await page.evaluate(() => {
    const msgs = document.querySelectorAll("message-content");
    return msgs[msgs.length - 1]?.innerText || "";
  });

  return result;
}

/* ========================= */
/* SAFE JSON PARSER */
function safeParse(text) {
  try {
    return JSON.parse(text);
  } catch (e) {
    return {
      raw_response: text,
    };
  }
}

/* ========================= */
/* PROCESS FILE */
async function processFile(sessionManager, file) {
  const inputPath = path.join(INPUT_DIR, file);
  const outputPath = path.join(OUTPUT_DIR, file);

  const lines = fs.readFileSync(inputPath, "utf-8").split("\n").filter(Boolean);

  const { page } = await sessionManager.safeGetPage();

  console.log(`📂 Processing ${file} (${lines.length})`);

  for (let i = 0; i < lines.length; i++) {
    const product = JSON.parse(lines[i]);

    try {
      console.log(`🔹 ${i + 1}/${lines.length} ${product.productId}`);

      const prompt = buildPrompt(product);

      const resultText = await sendToGemini(page, prompt);

      const translated = safeParse(resultText);

      const final = {
        ...product,
        translation: translated,
      };

      fs.appendFileSync(outputPath, JSON.stringify(final) + "\n");

      console.log("✅ done");

      await page.waitForTimeout(2000); // anti spam
    } catch (err) {
      console.log("❌ error:", err.message);

      fs.appendFileSync(outputPath, JSON.stringify(product) + "\n");
    }
  }

  await page.close();
}

/* ========================= */
/* MAIN */
async function main() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 50,
  });

  const sessionManager = new CrawlerSessionManager(browser, {
    maxPagesPerContext: 3,
  });

  const files = fs.readdirSync(INPUT_DIR);

  for (const file of files) {
    if (!file.endsWith(".jsonl")) continue;

    await processFile(sessionManager, file);
  }

  await sessionManager.close();
  await browser.close();
}

main();
