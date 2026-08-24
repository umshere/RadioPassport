// Renders scripts/og-still.html to public/elsewhere-og.jpg (1200x630).
// Re-run after editing the still: node scripts/render-og.mjs
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const source = "file://" + join(here, "og-still.html");
const target = join(here, "..", "public", "elsewhere-og.jpg");

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
await page.goto(source, { waitUntil: "networkidle" });
// Settle web fonts before the shutter.
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(250);
await page.screenshot({ path: target, type: "jpeg", quality: 88 });
await browser.close();
console.log("wrote", target);
