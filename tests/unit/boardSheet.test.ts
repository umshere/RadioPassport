import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BOARD_SHEET_PEEK_PX,
  snapBoardSheet,
} from "~/components/radio-passport/BoardSheet";
import {
  connectionById,
  SURFACE_CONNECTIONS,
} from "~/components/radio-passport/productFlow";

describe("board sheet snap", () => {
  it("opens on an upward flick, even from a small travel", () => {
    expect(snapBoardSheet(-12, -0.6, "peek")).toBe("open");
  });
  it("settles to the peek on a downward flick", () => {
    expect(snapBoardSheet(10, 0.7, "open")).toBe("peek");
  });
  it("opens when a slow drag travels far enough up", () => {
    expect(snapBoardSheet(-60, -0.1, "peek")).toBe("open");
  });
  it("holds the peek when a slow drag stays short", () => {
    expect(snapBoardSheet(-30, -0.1, "peek")).toBe("peek");
  });
  it("closes when a slow drag travels far enough down", () => {
    expect(snapBoardSheet(60, 0.1, "open")).toBe("peek");
  });
  it("holds open when a slow drag stays short", () => {
    expect(snapBoardSheet(20, 0.1, "open")).toBe("open");
  });
});

describe("board sheet contracts", () => {
  const sheet = readFileSync(
    new URL("../../app/components/radio-passport/BoardSheet.tsx", import.meta.url),
    "utf8"
  );
  const home = readFileSync(
    new URL("../../app/routes/_index.tsx", import.meta.url),
    "utf8"
  );
  const css = readFileSync(
    new URL("../../app/tailwind.css", import.meta.url),
    "utf8"
  );

  it("keeps the drag on the grip, the state in aria, and the phone gate", () => {
    expect(sheet).toContain("rp-board-grip");
    expect(sheet).toContain("aria-expanded");
    expect(sheet).toContain("(max-width: 960px)");
    expect(sheet).toContain("setPointerCapture");
    expect(BOARD_SHEET_PEEK_PX).toBe(84);
  });

  it("mounts the board inside the sheet on home", () => {
    expect(home).toContain("<BoardSheet");
    expect(home).toContain('className="rp-intro-board"');
    expect(home).toContain("</BoardSheet>");
    expect(home).toContain("docked={Boolean(nowPlaying)}");
    // Landing a station settles the sheet back to the peek.
    expect(home).toContain('setBoardSheet("peek")');
    // A typed search raises the sheet on its own.
    expect(home).toContain('if (isSeeking) setBoardSheet("open")');
  });

  it("is contents on desktop and fixed above the dock on the phone", () => {
    expect(css).toContain(".rp-board-sheet { display: contents; }");
    expect(css).toContain(".rp-board-grip { display: none; }");
    expect(css).toMatch(/\.rp-board-sheet \{[^}]*position: fixed/);
    expect(css).toContain('.rp-board-sheet[data-state="open"] { transform: translateY(0); }');
    expect(css).toContain(".rp-board-sheet.is-docked { bottom: calc(108px + env(safe-area-inset-bottom, 0px)); }");
    expect(css).toContain(".rp-board-grip-bar");
    // The drag gesture belongs to the sheet, never to the page behind it.
    expect(css).toMatch(/\.rp-board-grip \{[\s\S]*?touch-action: none/);
    expect(css).toMatch(/\.rp-board-sheet \.rp-intro-board \{[\s\S]*?overflow: auto/);
    // The sheet never covers the Atlas veil, the dock, or the band.
    expect(css).toMatch(/\.rp-board-sheet \{[^}]*z-index: 38/);
  });

  it("declares the sheet grip so the flow audit stays complete", () => {
    const row = connectionById("board-sheet");
    expect(row).not.toBeNull();
    expect(row).toMatchObject({
      surface: "cover",
      step: "tune",
      keepsPlayback: true,
    });
    expect(row!.label.trim().length).toBeGreaterThan(0);
    // The grip never stops the room: no sheet state may flip keepsPlayback.
    expect(
      SURFACE_CONNECTIONS.filter((item) => item.id === "board-sheet").every(
        (item) => item.keepsPlayback,
      ),
    ).toBe(true);
  });

  it("gives the globe room while keeping the hour rail in the first phone screen", () => {
    expect(css).toContain("height: clamp(196px, 26svh, 290px)");
    expect(css).not.toContain("height: 174px");
    // The globe tip rides taps on the phone instead of hiding.
    expect(css).not.toContain(".ew-globe-tip { display: none; }");
  });
});
