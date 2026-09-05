import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  boardShift,
  COL_STAGGER_MS,
  DRUM,
  drumSteps,
  FLIP_MS,
  flapSlots,
  flipGlyph,
  flipLive,
  flipPlan,
  MAX_SPIN,
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

  it("spins the drum forward only, like hardware", () => {
    expect(drumSteps("A", "C")).toBe(2);
    expect(drumSteps(" ", "A")).toBe(1);
    expect(drumSteps("A", "A")).toBe(0);
    // Wraps around instead of spinning backward.
    expect(drumSteps("C", "A")).toBe(DRUM.length - 2);
    // Unknown glyphs park at blank.
    expect(drumSteps("é", " ")).toBe(0);
  });

  it("churns each cell through the drum with a left-to-right ripple", () => {
    const plan = flipPlan("A", "C", 0);
    expect(plan.cells).toHaveLength(1);
    expect(plan.cells[0]!.steps).toBe(2);
    expect(plan.cells[0]!.startMs).toBe(0);
    expect(plan.totalMs).toBe(2 * FLIP_MS);

    const ripple = flipPlan("AB", "AB", 0);
    // Identical text parks every drum.
    expect(ripple.totalMs).toBe(0);
    expect(ripple.cells.every((cell) => cell.steps === 0)).toBe(true);

    const stagger = flipPlan("AB", "CD", 0);
    expect(stagger.cells[1]!.startMs - stagger.cells[0]!.startMs).toBe(
      COL_STAGGER_MS,
    );

    // Glyph journey for A -> C at 80ms steps: A, B, then lands on C.
    const cell = plan.cells[0]!;
    expect(flipGlyph(cell, -1)).toBe("A");
    expect(flipGlyph(cell, 0)).toBe("B");
    expect(flipGlyph(cell, FLIP_MS)).toBe("C");
    expect(flipGlyph(cell, FLIP_MS * 4)).toBe("C");
    expect(flipLive(cell, 0)).toBe(true);
    expect(flipLive(cell, FLIP_MS * 2)).toBe(false);
  });

  it("caps long spins so the board settles fast", () => {
    // Blank to "(" is 47 drum steps — capped at MAX_SPIN from "." onward.
    const plan = flipPlan(" ", "(", 0);
    const [cell] = [plan.cells[0]!];
    expect(cell.steps).toBe(MAX_SPIN);
    expect(DRUM[cell.startIdx]).toBe(".");
    expect(flipGlyph(cell, 0)).toBe(",");
    expect(flipGlyph(cell, plan.totalMs)).toBe("(");
    expect(plan.totalMs).toBe(MAX_SPIN * FLIP_MS);
  });

  it("staggers rows on the home board and refetches the catalog", () => {
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
    expect(FLIP_MS).toBe(80);
    expect(COL_STAGGER_MS).toBe(40);
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
