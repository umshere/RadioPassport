import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  boardShift,
  flapSlots,
  FLAP_STEP_MS,
} from "~/components/radio-passport/FlipBoard";

describe("flip board", () => {
  it("pads slots so a longer name can land", () => {
    const slots = flapSlots("LIS", "LISBOA");
    expect(slots).toHaveLength(6);
    expect(slots.map((slot) => slot.from).join("")).toBe("LIS   ");
    expect(slots.map((slot) => slot.to).join("")).toBe("LISBOA");
  });

  it("shifts the idle board from a seed so a refresh is a new window", () => {
    const rows = ["a", "b", "c", "d"];
    expect(boardShift(rows, 0)).toEqual(["a", "b", "c", "d"]);
    expect(boardShift(rows, 1)).toEqual(["b", "c", "d", "a"]);
    expect(boardShift(rows, 5)).toEqual(boardShift(rows, 1));
    expect(boardShift(rows, -1)).toEqual(["d", "a", "b", "c"]);
  });

  it("staggers letters on the home board and refetches the catalog", () => {
    const home = readFileSync(
      new URL("../../app/routes/_index.tsx", import.meta.url),
      "utf8",
    );
    const row = readFileSync(
      new URL("../../app/components/radio-passport/StationRow.tsx", import.meta.url),
      "utf8",
    );
    const css = readFileSync(
      new URL("../../app/tailwind.css", import.meta.url),
      "utf8",
    );
    expect(FLAP_STEP_MS).toBe(32);
    expect(home).toContain("boardShift");
    expect(home).toContain("boardSeed");
    expect(home).toContain("boardShift(filtered.slice");
    expect(home).toContain('Cache-Control": "private, no-store"');
    expect(home).toContain('cache: "no-store"');
    expect(row).toContain("FlipBoard");
    expect(row).toContain("delayMs={beat}");
    expect(css).toContain(".ew-flap-line");
    expect(css).toContain("@keyframes ew-flap-in");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css.indexOf(".ew-flap-line")).toBeGreaterThan(css.indexOf("@layer components"));
  });
});
