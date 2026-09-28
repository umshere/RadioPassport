import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button, buttonClass, Chip } from "~/components/ui/Button";

describe("ui Button / Chip", () => {
  it("maps each variant to the design-system class", () => {
    expect(buttonClass({ variant: "land" })).toBe("ew-land");
    expect(buttonClass({ variant: "mono" })).toBe("rp-surprise");
    expect(buttonClass({ variant: "frame" })).toBe("rp-passport-button");
    expect(buttonClass({ variant: "text" })).toBe("rp-text-button");
    expect(buttonClass({ variant: "atlas" })).toBe("ew-atlas");
    expect(buttonClass({ variant: "chip" })).toBe("rp-chip");
    expect(buttonClass({ variant: "keeper" })).toBe("ew-keeper-button");
  });

  it("adds state classes and keeps caller classes last", () => {
    expect(
      buttonClass({ variant: "chip", selected: true, busy: true, className: "mt-2" }),
    ).toBe("rp-chip active is-busy mt-2");
  });

  it("defaults to type=button and only sets aria-pressed when selection is meaningful", () => {
    const plain = renderToStaticMarkup(createElement(Button, { variant: "text" }, "Go"));
    expect(plain).toContain('type="button"');
    expect(plain).not.toContain("aria-pressed");
    const chip = renderToStaticMarkup(createElement(Chip, { selected: false }, "Hindi"));
    expect(chip).toContain('aria-pressed="false"');
    const on = renderToStaticMarkup(createElement(Chip, { selected: true }, "Hindi"));
    expect(on).toContain('aria-pressed="true"');
    expect(on).toContain("rp-chip active");
  });

  it("marks busy with aria-busy and lays out the Land kicker", () => {
    const land = renderToStaticMarkup(
      createElement(Button, { variant: "land", kicker: "EW · Arrival", busy: true }, "Land here"),
    );
    expect(land).toContain('aria-busy="true"');
    expect(land).toContain('<span class="ew-land-kicker">EW · Arrival</span>');
    expect(land).toContain('<span class="ew-land-city">Land here</span>');
  });
});

describe("ui layer is scanned by Tailwind", () => {
  it("keeps the ui glob in tailwind.config.ts, or @layer component classes get purged", async () => {
    const { readFileSync } = await import("node:fs");
    const config = readFileSync(new URL("../../tailwind.config.ts", import.meta.url), "utf8");
    expect(config).toContain("./app/components/ui/**/*.{ts,tsx}");
  });
});
