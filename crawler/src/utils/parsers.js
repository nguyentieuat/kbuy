// utils/parsers.js

function parsePrice(text) {
  if (!text) return null;
  return parseInt(text.replace(/[^\d]/g, ""), 10);
}

function parseIntSafe(val) {
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

module.exports = { parsePrice, parseIntSafe };