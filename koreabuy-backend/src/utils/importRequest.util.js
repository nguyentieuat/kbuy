// utils/importRequest.util.js

const crypto = require("crypto");

function hashUrl(url) {
  return crypto.createHash("sha256").update(url.trim()).digest("hex");
}

function generateRequestCode() {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `MH${ts}${rand}`;
}

function detectSource(url) {
  if (url.includes("oliveyoung.co.kr")) return "oliveyoung";
  if (url.includes("coupang.com")) return "coupang";
  if (url.includes("musinsa.com")) return "musinsa";
  if (url.includes("gmarket.co.kr")) return "gmarket";
  return "other";
}

module.exports = {
  hashUrl,
  generateRequestCode,
  detectSource,
};
