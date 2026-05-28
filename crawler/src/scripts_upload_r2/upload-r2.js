// scripts_upload_r2/upload-r2.js

"use strict";

const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");
const pLimit = require("p-limit");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
require("dotenv").config();

// ─────────────────────────────
// CONFIG
// ─────────────────────────────
const INPUT_DIR = path.join(process.cwd(), "data/translate/geng/success");
const CONCURRENCY = 5;
const WORKERS = 3;

const R2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET;
const PUBLIC_BASE_URL = process.env.R2_PUBLIC_URL;

// ─────────────────────────────
// LOG
// ─────────────────────────────

const log = {
  info: (...a) => console.log("ℹ️", ...a),
  ok: (...a) => console.log("✅", ...a),
  warn: (...a) => console.log("⚠️", ...a),
};

// ─────────────────────────────
// CACHE (avoid duplicate upload)
// ─────────────────────────────

const cache = new Map();

// ─────────────────────────────
// FETCH
// ─────────────────────────────

async function fetchBuffer(url) {
  try {
    const res = await fetch(url, { timeout: 15000 });
    if (!res.ok) throw new Error(res.status);
    return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    return null;
  }
}

// ─────────────────────────────
// UPLOAD SAFE (FALLBACK GUARANTEE)
// ─────────────────────────────

function buildKey(
  url,
  productId,
  { type = "product", variantId = null, index = 0, source = "unknown" } = {},
) {
  const u = new URL(url);
  const ext = path.extname(u.pathname) || ".jpg";

  const base = `images/products/${source}/${productId}`;

  if (type === "product") {
    return `${base}/main_${index}${ext}`;
  }

  if (type === "variant") {
    return `${base}/variants/${variantId}/img_${index}${ext}`;
  }

  return `${base}/misc/${index}${ext}`;
}

async function uploadToR2(url, productId, options = {}) {
  if (!url) return url;

  // SKIP nếu đã là R2
  if (url.startsWith(PUBLIC_BASE_URL)) {
    return url;
  }

  const cacheKey = `${productId}:${url}`;

  if (cache.has(cacheKey)) return cache.get(cacheKey);

  try {
    const buffer = await fetchBuffer(url);
    if (!buffer) return url;

    const key = buildKey(url, productId, options);

    await R2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: "image/jpeg",
      }),
    );

    const publicUrl = `${PUBLIC_BASE_URL}/${key}`;

    cache.set(cacheKey, publicUrl);

    return publicUrl;
  } catch (err) {
    return url;
  }
}

// ─────────────────────────────
// TRANSFORM (NO HASH TOUCH)
// ─────────────────────────────

async function transformProduct(product) {
  const limit = pLimit(CONCURRENCY);

  const result = JSON.parse(JSON.stringify(product)); // 🔥 isolate object
  const source = result.source;

  // images
  result.images = await Promise.all(
    result.images.map((url, idx) =>
      limit(() =>
        uploadToR2(url, result.productId, {
          type: "product",
          index: idx,
          source,
        }),
      ),
    ),
  );

  // variants
  if (Array.isArray(result.variants)) {
    result.variants = await Promise.all(
      result.variants.map(async (v) => {
        const variant = { ...v };

        variant.thumbnail = await uploadToR2(
          variant.thumbnail,
          result.productId,
          {
            type: "variant",
            variantId: variant.variantId,
            index: 0,
          },
        );

        variant.variant_detail_images = await Promise.all(
          variant.variant_detail_images.map((img, idx) =>
            uploadToR2(url, result.productId, {
              type: "variant",
              variantId: variant.variantId,
              index: idx,
            }),
          ),
        );

        return variant;
      }),
    );
  }

  return result;
}

// ─────────────────────────────
// PROCESS FILE (MULTI WORKER)
// ─────────────────────────────

async function processFile(file) {
  const filePath = path.join(INPUT_DIR, file);

  const lines = fs.readFileSync(filePath, "utf-8").split("\n").filter(Boolean);

  let index = 0;

  const results = [];

  async function worker(workerId) {
    while (true) {
      const i = index++;
      if (i >= lines.length) break;

      const product = JSON.parse(lines[i]);

      try {
        const updated = await transformProduct(product);

        // ❗ NO HASH CHANGE, NO LOGIC CHANGE

        results[i] = JSON.stringify(updated);
      } catch (err) {
        log.warn(
          `worker ${workerId} failed product | index=${i} | err=${err.message}`,
        );
        results[i] = lines[i]; // fallback raw
      }
    }

    log.info(`worker ${workerId} done`);
  }

  const workers = [];

  for (let i = 0; i < WORKERS; i++) {
    workers.push(worker(i + 1));
  }

  await Promise.all(workers);

  const temp = filePath + ".tmp";

  await fs.writeFile(temp, results.filter(Boolean).join("\n"));

  await fs.move(temp, filePath, { overwrite: true });

  log.ok(`updated in-place: ${file}`);
  log.ok(`done ${file}`);
}

// ─────────────────────────────
// MAIN
// ─────────────────────────────

async function main() {
  const files = fs.readdirSync(INPUT_DIR).filter((f) => f.endsWith(".jsonl"));

  log.info(`files: ${files.length}`);

  for (const f of files) {
    await processFile(f);
  }

  log.ok("ALL DONE");
}

main().catch(console.error);
