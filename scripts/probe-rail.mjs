import { chromium, devices } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ ...devices["iPhone 13"] });
await page.goto("http://localhost:5199", { waitUntil: "networkidle", timeout: 45000 });
await page.waitForTimeout(2500);
for (const sel of [".ew-horizon", ".ew-hours", ".rp-land-slot", ".rp-home-invitation", ".rp-board-sheet", ".rp-intro"]) {
  const el = page.locator(sel).first();
  const box = await el.boundingBox().catch(() => null);
  const visible = await el.isVisible().catch(() => false);
  console.log(sel, "visible:", visible, "box:", JSON.stringify(box));
}
console.log("viewport:", JSON.stringify(page.viewportSize()));
await browser.close();
