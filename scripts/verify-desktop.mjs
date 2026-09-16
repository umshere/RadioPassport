// Desktop-only re-verification on a clean server (the shared 5173 server
// served a stale transform error from mid-edit; this run must be clean).
import { chromium } from "playwright";

const [baseUrl = "http://localhost:5199", outDir = "/tmp/elsewhere-verify"] =
  process.argv.slice(2);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (err) => errors.push(String(err)));
await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(2500);
const overlay = await page.locator("vite-error-overlay").count();
const gripVisible = await page
  .locator(".rp-board-grip")
  .isVisible()
  .catch(() => false);
const boardBox = await page.locator(".rp-intro-board").boundingBox();
const rows = await page.locator(".rp-intro-board .rp-station").count();
console.log("error overlay present:", overlay > 0);
console.log("page errors:", errors.length ? errors : "none");
console.log("desktop grip visible:", gripVisible);
console.log("desktop board box:", JSON.stringify(boardBox), "| rows:", rows);
await page.screenshot({ path: `${outDir}/desktop-clean.png` });
await browser.close();
console.log("done");
