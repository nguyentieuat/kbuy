// utils/humanBehavior.js
async function simulateHuman(page) {
  try {
    await page.waitForTimeout(800 + Math.random() * 1200);

    await page.mouse.move(
      Math.random() * 400,
      Math.random() * 400
    );

    await page.waitForTimeout(500 + Math.random() * 1000);

    await page.mouse.wheel(0, 300 + Math.random() * 700);
  } catch {}
}

module.exports = { simulateHuman };