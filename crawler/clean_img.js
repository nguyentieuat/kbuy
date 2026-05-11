const fs = require("fs");
const path = require("path");

// ================= CONFIG =================
const IMAGE_DIR = "data/image";

// chỉ giữ các đuôi hợp lệ
const VALID_EXT = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif"
]);

let deleted = 0;
let scanned = 0;

// ================= CHECK EXT =================
function getExt(file) {
  const parts = file.split(".");
  if (parts.length === 1) return ""; // không có đuôi
  return parts.pop().toLowerCase();
}

// ================= WALK FOLDER =================
function walk(dir) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);

    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      walk(fullPath);
      continue;
    }

    scanned++;

    const ext = getExt(file);

    // ❌ case 1: không có extension
    const noExt = ext === "";

    // ❌ case 2: extension không hợp lệ
    const invalidExt = ext && !VALID_EXT.has(ext);

    // ❌ case 3: file kiểu "A000123.5" hoặc rác từ thumbnail bug
    const weirdDotNumber = /\.\d+$/.test(file);

    if (noExt || invalidExt || weirdDotNumber) {
      try {
        fs.unlinkSync(fullPath);
        deleted++;
        console.log("🗑️ deleted:", fullPath);
      } catch (err) {
        console.log("❌ fail delete:", fullPath);
      }
    }
  }
}

// ================= RUN =================
console.log("🚀 Start cleaning:", IMAGE_DIR);

walk(IMAGE_DIR);

console.log("\n======================");
console.log("📊 scanned:", scanned);
console.log("🗑️ deleted:", deleted);
console.log("🎉 DONE");