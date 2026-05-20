const fs = require("fs");
const path = require("path");

/* ========================= */
/* CONFIG */
const INPUT_DIR = path.resolve(
  __dirname,
  "../../data/output_products_newest"
);

const PRIORITY_DIR = path.resolve(
  __dirname,
  "../../data/split/priority"
);

const REST_DIR = path.resolve(
  __dirname,
  "../../data/split/rest"
);

/* ========================= */
function ensureDirs() {
  fs.mkdirSync(PRIORITY_DIR, { recursive: true });
  fs.mkdirSync(REST_DIR, { recursive: true });
}

/* ========================= */
function getPriority(item) {
  const flags = item.source_flags || [];
  const discount = item.price?.discount || 0;

  const isBest = flags.includes("BEST");

  if (isBest) return true;
  if (discount >= 30) return true;

  return false;
}

/* ========================= */
function processFile(file) {
  const inputPath = path.join(INPUT_DIR, file);

  const priorityPath = path.join(PRIORITY_DIR, file);
  const restPath = path.join(REST_DIR, file);

  const lines = fs
    .readFileSync(inputPath, "utf-8")
    .split("\n")
    .filter(Boolean);

  const priorityList = [];
  const restList = [];

  for (const line of lines) {
    try {
      const item = JSON.parse(line);

      if (getPriority(item)) {
        priorityList.push(item);
      } else {
        restList.push(item);
      }
    } catch (err) {
      console.log("❌ BAD JSON:", file);
    }
  }

  fs.writeFileSync(
    priorityPath,
    priorityList.map((x) => JSON.stringify(x)).join("\n")
  );

  fs.writeFileSync(
    restPath,
    restList.map((x) => JSON.stringify(x)).join("\n")
  );

  console.log(
    `📁 ${file} → priority:${priorityList.length} | rest:${restList.length}`
  );
}

/* ========================= */
function run() {
  ensureDirs();

  const files = fs
    .readdirSync(INPUT_DIR)
    .filter((f) => f.endsWith(".jsonl"));

  console.log("🚀 TOTAL FILES:", files.length);

  for (const file of files) {
    processFile(file);
  }

  console.log("✅ DONE SPLIT ALL FILES");
}

/* ========================= */
run();