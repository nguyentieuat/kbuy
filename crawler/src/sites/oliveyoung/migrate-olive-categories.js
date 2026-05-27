const fs = require("fs");
const path = require("path");
const readline = require("readline");

/* =========================
   PATHS
========================= */

const LINKS_DIR = path.join(
  process.cwd(),
  "./data/links",
);
const OLD_PRODUCTS_DIR = path.join(
  process.cwd(),
  "./data/translate/success",
);

const OUTPUT_DIR = path.join(
  process.cwd(),
  "./data/translate/oliveyoung/success",
);

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/* =========================
   HELPERS
========================= */

function getGoodsNo(url = "") {
  try {
    const u = new URL(url);
    return u.searchParams.get("goodsNo");
  } catch {
    return null;
  }
}

function appendJsonl(filePath, obj) {
  fs.appendFileSync(filePath, JSON.stringify(obj) + "\n", "utf-8");
}

/* =========================
   STEP 1:
   BUILD productId -> newCategoryFile map
========================= */

async function buildProductCategoryMap() {
  const map = new Map();

  const files = fs
    .readdirSync(LINKS_DIR)
    .filter((f) => f.endsWith(".txt"));

  for (const file of files) {
    const filePath = path.join(LINKS_DIR, file);

    const lines = fs
      .readFileSync(filePath, "utf-8")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    for (const line of lines) {
      const goodsNo = getGoodsNo(line);

      if (!goodsNo) continue;

      // map product -> new category filename
      map.set(goodsNo, file.replace(".txt", ".jsonl"));
    }

    console.log(`Loaded links from ${file}`);
  }

  console.log(`Total mapped products: ${map.size}`);

  return map;
}

/* =========================
   STEP 2:
   READ OLD JSONL FILES
   AND MOVE TO NEW CATEGORY
========================= */

async function migrateProducts() {
  const productCategoryMap = await buildProductCategoryMap();

  const oldFiles = fs
    .readdirSync(OLD_PRODUCTS_DIR)
    .filter((f) => f.endsWith(".jsonl"));

  let moved = 0;
  let skipped = 0;

  for (const oldFile of oldFiles) {
    const oldPath = path.join(OLD_PRODUCTS_DIR, oldFile);

    console.log(`\nProcessing ${oldFile}`);

    const rl = readline.createInterface({
      input: fs.createReadStream(oldPath),
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      if (!line.trim()) continue;

      try {
        const product = JSON.parse(line);

        const productId = product.productId;

        if (!productId) {
          skipped++;
          continue;
        }

        // find new category
        const newFile = productCategoryMap.get(productId);

        if (!newFile) {
          skipped++;
          console.log(`No new category for ${productId}`);
          continue;
        }

        const outputPath = path.join(OUTPUT_DIR, newFile);

        appendJsonl(outputPath, product);

        moved++;
      } catch (err) {
        console.error("Parse error:", err.message);
      }
    }
  }

  console.log("\n====================");
  console.log("DONE");
  console.log("====================");
  console.log("Moved:", moved);
  console.log("Skipped:", skipped);
}

migrateProducts();