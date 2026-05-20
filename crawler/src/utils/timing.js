// utils/timing.js
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function randomDelay(min, max) {
  return min + Math.random() * (max - min);
}

function humanDelay() {
  const r = Math.random();
  if (r < 0.5) return randomDelay(1500, 3500);
  if (r < 0.8) return randomDelay(3000, 7000);
  return randomDelay(5000, 10000);
}

module.exports = { sleep, randomDelay, humanDelay };