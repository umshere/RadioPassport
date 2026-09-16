// One-shot visual verification for the board sheet: desktop + phone.
// Usage: node scripts/verify-board-sheet.mjs <baseUrl> <outDir>
import { chromium, devices } from "playwright";

const [baseUrl = "http://localhost:5173", outDir = "/tmp/elsewhere-verify"] =
  process.argv.slice(2);

const shots = [];
const browser = await chromium.launch();

// Desktop: the board stays inline in the intro column, no grip anywhere.
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2500);
  const gripVisible = await page.locator(".rp-board-grip").isVisible().catch(() => false);
  const sheetBox = await page.locator(".rp-intro-board").boundingBox();
  console.log("desktop grip visible:", gripVisible);
  console.log("desktop board box:", JSON.stringify(sheetBox));
  await page.screenshot({ path: `${outDir}/desktop-home.png` });
  shots.push("desktop-home.png");
  await page.close();
}

// Phone: globe is taller, the sheet peeks above the band, grip opens it.
{
  const page = await browser.newPage({ ...devices["iPhone 13"] });
  await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2500);
  const globe = await page.locator(".rp-globe-wrap").boundingBox();
  const gripVisible = await page.locator(".rp-board-grip").isVisible();
  const state0 = await page.locator(".rp-board-sheet").getAttribute("data-state");
  console.log("phone globe height:", globe?.height);
  console.log("phone grip visible:", gripVisible, "| sheet state:", state0);
  await page.screenshot({ path: `${outDir}/phone-peek.png` });
  shots.push("phone-peek.png");

  // Tap the grip: the sheet opens over the globe.
  await page.locator(".rp-board-grip").tap();
  await page.waitForTimeout(700);
  const state1 = await page.locator(".rp-board-sheet").getAttribute("data-state");
  const rows = await page.locator(".rp-board-sheet .rp-station").count();
  console.log("after grip tap state:", state1, "| rows in sheet:", rows);
  await page.screenshot({ path: `${outDir}/phone-open.png` });
  shots.push("phone-open.png");

  // Play the first row: the sheet settles back to the peek on its own.
  if (rows > 0) {
    await page.locator(".rp-board-sheet .rp-station").first().tap();
    await page.waitForTimeout(1200);
    const state2 = await page.locator(".rp-board-sheet").getAttribute("data-state");
    const docked = await page.locator(".rp-board-sheet").getAttribute("class");
    console.log("after play state:", state2, "| sheet class:", docked);
    await page.screenshot({ path: `${outDir}/phone-landed.png` });
    shots.push("phone-landed.png");
  }
  await page.close();
}

await browser.close();
console.log("shots:", shots.join(", "));
