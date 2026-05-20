// worker.js 

require("dotenv").config();

console.log("🚀 Starting workers...");

// ── Import tất cả workers ──
require("./workers/emailWorker");

console.log("✅ All workers started");

// ── Graceful shutdown ──
async function shutdown() {
  console.log("⏳ Shutting down workers...");
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);