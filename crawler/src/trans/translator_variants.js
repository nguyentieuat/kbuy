const fs = require("fs");
const path = require("path");
const readline = require("readline");
const fetch = require("node-fetch");
require("dotenv").config();

// ================= CONFIG =================
const KR_DIR = "data/output_products_kr_updated";
const VI_DIR = "data/output_products_vi";
const DICT_PATH = "data/dict_vi.json";

const BATCH_SIZE = 80;
const DELAY = 800;
const IMAGE_CONCURRENCY = 5;

// ================= LOAD DICT =================
let dict = {};
if (fs.existsSync(DICT_PATH)) {
  dict = JSON.parse(fs.readFileSync(DICT_PATH, "utf-8"));
}

// ================= API KEYS =================
const API_KEYS = process.env.GEMINI_KEYS.split(",");
let keyIndex = 0;

function getNextKey() {
  const key = API_KEYS[keyIndex % API_KEYS.length];
  keyIndex++;
  return key;
}

// ================= UTILS =================
function normalize(text) {
  return text?.trim().toLowerCase().replace(/\s+/g, " ");
}

function shouldSkip(text) {
  return /^[a-z0-9\s\(\)\+\-]+$/i.test(text);
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ================= LIMIT =================
function createLimiter(limit) {
  let active = 0;
  const queue = [];

  const next = () => {
    if (queue.length && active < limit) {
      active++;
      const fn = queue.shift();
      fn();
    }
  };

  return (fn) =>
    new Promise((resolve, reject) => {
      queue.push(() => {
        fn()
          .then(resolve)
          .catch(reject)
          .finally(() => {
            active--;
            next();
          });
      });
      next();
    });
}

const limitDownload = createLimiter(IMAGE_CONCURRENCY);

// ================= GEMINI =================
async function translateBatch(items) {
  const apiKey = getNextKey();

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `
Dịch JSON sang tiếng Việt.

RULE:
- Giữ nguyên id
- Chỉ dịch text
- Ngắn gọn ecommerce
- Trả về JSON ARRAY

DATA:
${JSON.stringify(items)}
`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  return JSON.parse(text);
}

// ================= READ JSONL =================
async function readJSONL(filePath) {
  const stream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: stream });

  const data = [];
  for await (const line of rl) {
    if (line.trim()) data.push(JSON.parse(line));
  }
  return data;
}

// ================= SAFE EXT =================
function getExt(url) {
  try {
    const clean = url.split("?")[0];
    const match = clean.match(/\.([a-zA-Z0-9]+)$/);
    return match ? match[1] : "jpg";
  } catch {
    return "jpg";
  }
}

// ================= DOWNLOAD IMAGE =================
async function downloadImage(url, savePath, retry = 0) {
  try {
    if (!url) return null;
    if (fs.existsSync(savePath)) return savePath;

    const res = await fetch(url);
    if (!res.ok) throw new Error("fail");

    const buffer = Buffer.from(await res.arrayBuffer());

    fs.mkdirSync(path.dirname(savePath), { recursive: true });
    fs.writeFileSync(savePath, buffer);

    console.log("🖼️ saved:", savePath);

    return savePath;
  } catch (err) {
    if (retry < 2) {
      await delay(500);
      return downloadImage(url, savePath, retry + 1);
    }

    console.log("❌ image fail:", url);
    return url;
  }
}

// ================= MAIN =================
async function main() {
  const files = fs.readdirSync(KR_DIR);

  for (const file of files) {
    console.log("\n==============================");
    console.log("📂 Processing:", file);

    const krPath = path.join(KR_DIR, file);
    const viPath = path.join(VI_DIR, file.replace(".jsonl", "_vi.jsonl"));

    if (!fs.existsSync(viPath)) {
      console.log("⚠️ skip (no vi file)");
      continue;
    }

    const krData = await readJSONL(krPath);
    const viData = await readJSONL(viPath);

    const viMap = new Map();
    viData.forEach((item) => {
      viMap.set(item.productId, item);
    });

    // ================= COLLECT =================
    const textSet = new Set();

    for (const krItem of krData) {
      if (!krItem.variants) continue;

      for (const v of krItem.variants) {
        const key = normalize(v.name_kr);
        if (!dict[key] && !shouldSkip(key)) {
          textSet.add(key);
        }
      }
    }

    console.log("📊 Need translate:", textSet.size);

    // ================= TRANSLATE =================
    const texts = Array.from(textSet);

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const chunk = texts.slice(i, i + BATCH_SIZE);

      const items = chunk.map((t, idx) => ({
        id: idx,
        text: t,
      }));

      try {
        const result = await translateBatch(items);

        result.forEach((r, idx) => {
          dict[chunk[idx]] = r.text;
        });

        fs.writeFileSync(DICT_PATH, JSON.stringify(dict, null, 2));

        console.log(`✔ ${i + chunk.length}/${texts.length}`);
      } catch {
        console.log("❌ batch fail");
      }

      await delay(DELAY);
    }

    // ================= APPLY + DOWNLOAD =================
    for (const krItem of krData) {
      const viItem = viMap.get(krItem.productId);
      if (!viItem || !krItem.variants) continue;

      const variants = await Promise.all(
        krItem.variants.map((v, idx) =>
          limitDownload(async () => {
            const key = normalize(v.name_kr);
            const name_vi = dict[key] || v.name_kr;

            const cleanId = String(v.variantId || key)
              .replace(/[^\w\-]/g, "_");

            const thumb = typeof v.thumbnail === "string" ? v.thumbnail : null;

            const ext = thumb ? getExt(thumb) : "jpg";

            const localPath = path.join(
              "data/image",
              krItem.productId,
              "thumb",
              `${cleanId}.${ext}`,
            );

            let savedPath = thumb;

            if (thumb) {
              savedPath = await downloadImage(thumb, localPath);
            }

            return {
              variantId: v.variantId,
              name: name_vi,
              name_kr: v.name_kr,
              thumbnail: savedPath,
              price: v.price,
            };
          }),
        ),
      );

      viMap.set(krItem.productId, {
        ...viItem,
        variants,
      });
    }

    // ================= SAVE =================
    const output = Array.from(viMap.values())
      .map((i) => JSON.stringify(i))
      .join("\n");

    fs.writeFileSync(viPath, output);

    console.log("💾 saved:", file);
  }

  console.log("\n🎉 DONE");
}

main();