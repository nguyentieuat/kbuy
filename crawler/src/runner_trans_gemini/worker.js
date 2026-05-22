// src/runner/worker.js

const axios = require("axios");

const WORKER_ID = `worker_${Math.random().toString(36).slice(2, 8)}`;

const SERVER = "http://localhost:3100";

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function getJob() {
  const res = await axios.get(`${SERVER}/job/${WORKER_ID}`);
  return res.data;
}

async function sendDone(id, result) {
  await axios.post(`${SERVER}/done`, {
    id,
    result,
  });
}

/* ========================= */
/* MAIN LOOP */
async function run() {
  console.log("🚀 Worker started:", WORKER_ID);

  while (true) {
    try {
      const job = await getJob();

      if (!job) {
        await sleep(2000);
        continue;
      }

      console.log("📦 got job:", job.id);

      // ======================================
      // TODO: CALL GEMINI HERE
      // ======================================

      const result = await fakeGemini(job.prompt);

      await sendDone(job.id, result);

      console.log("✅ done:", job.id);
    } catch (err) {
      console.log("❌ worker error:", err.message);
      await sleep(3000);
    }
  }
}

/* ========================= */
/* MOCK GEMINI (replace bằng API thật) */
async function fakeGemini(prompt) {
  await sleep(1000);

  return {
    name_vi: "demo",
    specs_vi: {},
    product_shipping: {
      weight_grams: 500,
      is_bulky: false,
    },
    variants_vi: [],
  };
}

run();