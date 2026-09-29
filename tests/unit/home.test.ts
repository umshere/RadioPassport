import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { readAppCss } from "./appCss";

const read = (path: string) => readFileSync(resolve(__dirname, "../..", path), "utf8");
const homeCss = () => read("app/styles/14-home.css");

/** The body of every rule whose selector list names `selector` exactly. */
function rulesFor(css: string, selector: string): string[] {
  const out: string[] = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const match of plain.matchAll(pattern)) {
    const selectors = match[1]!.split(",").map((part) => part.trim());
    if (selectors.includes(selector)) out.push(match[2]!);
  }
  return out;
}

describe("home: the departures hall stylesheet", () => {
  it("is appended last in the cascade", () => {
    const entry = read("app/tailwind.css").trim().split("\n");
    expect(entry[entry.length - 1]).toBe('@import "./styles/14-home.css";');
  });

  it("never lays a grid on the home's scroll containers (iOS WebKit collapses it)", () => {
    const css = homeCss();
    for (const selector of [".ew-home", ".ew-home-inner", ".ew-home-main", ".ew-home-sky-col"]) {
      for (const body of rulesFor(css, selector)) {
        expect(body).not.toMatch(/display:\s*grid/);
      }
    }
    expect(rulesFor(css, ".ew-home").join(" ")).toMatch(/overflow-y: auto/);
    expect(rulesFor(css, ".ew-home").join(" ")).toMatch(/flex-direction: column/);
    expect(css).toMatch(/\.ew-home > \* \{ flex: none; min-width: 0; \}/);
    expect(css).toContain("container: home / inline-size");
    expect(css).toContain("@container home (min-width: 700px)");
    expect(css).toContain("@container home (min-width: 1100px)");
  });

  it("moves only in steps, and stills everything under reduced motion", () => {
    const css = homeCss();
    const animations = [...css.matchAll(/animation:\s*([^;]+);/g)].map((m) => m[1]!);
    expect(animations.length).toBeGreaterThan(0);
    for (const value of animations) {
      if (/^none\b/.test(value)) continue;
      expect(value).toContain("steps(");
    }
    expect(css).toMatch(
      /prefers-reduced-motion: reduce\) \{\s*\.ew-home \*, \.ew-home \*::before, \.ew-home \*::after \{ animation: none !important; transition: none !important; \}\s*\.ew-home \{ scroll-behavior: auto; \}/,
    );
    const motion = css.slice(css.indexOf("prefers-reduced-motion: no-preference"));
    expect(motion.indexOf("@keyframes")).toBeGreaterThan(-1);
    // Keyframes live inside the no-preference block only.
    expect(css.slice(0, css.indexOf("prefers-reduced-motion: no-preference"))).not.toContain("@keyframes");
  });

  it("stays square and token-coloured: no pills, no shadows, no hex", () => {
    const css = homeCss();
    expect(css).not.toMatch(/border-radius:(?!\s*0;)/);
    expect(css).not.toMatch(/box-shadow/);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });

  it("keeps the gates sticky, 48px and square", () => {
    const css = homeCss();
    expect(css).toMatch(/\.ew-gates \{[^}]*position: sticky;[^}]*top: 0;/);
    expect(css).toContain(".ew-gates .ew-hours { display: flex;");
    expect(css).toMatch(/\.ew-gates-atlas \{[^}]*min-height: 48px/);
    // The field is the desk's shared always-on square field.
    expect(readAppCss()).toContain(".ew-gate-field .ew-seek { width: 100%;");
  });
});

describe("home: the sheet is gone", () => {
  it("leaves no rp-board-sheet anywhere", () => {
    expect(readAppCss()).not.toContain("rp-board-sheet");
    expect(readAppCss()).not.toContain("rp-board-grip");
    for (const path of [
      "app/routes/_index.tsx",
      "app/components/keeper/KeeperFloat.tsx",
      "app/components/keeper/KeeperSheet.tsx",
      "app/components/home/HomeDepartures.tsx",
    ]) {
      expect(read(path)).not.toMatch(/rp-board-sheet|BoardSheet/);
    }
    expect(existsSync(resolve(__dirname, "../../app/components/radio-passport/BoardSheet.tsx"))).toBe(false);
    expect(existsSync(resolve(__dirname, "../../app/components/radio-passport/HomeIntro.tsx"))).toBe(false);
    expect(existsSync(resolve(__dirname, "../../app/components/radio-passport/HomeGlobeSide.tsx"))).toBe(false);
  });

  it("hides the floating keeper on the home and the desk: he stands in the sky", () => {
    const float = read("app/components/keeper/KeeperFloat.tsx");
    expect(float).toContain('pathname === "/listen" || pathname === "/"');
  });

  it("brings the board into view for a search and a keeper hop, not a sheet", () => {
    const home = read("app/routes/_index.tsx");
    expect(home).toContain("onHop: scrollToBoard");
    expect(home).toMatch(/if \(isSeeking\) scrollToBoard\(\)/);
    expect(home).toContain('getElementById("live-board")');
    expect(home).toContain("prefers-reduced-motion: reduce");
  });
});

describe("home: words and honesty", () => {
  it("keeps the keeper's home lines in his voice file and tidies station names", () => {
    const sky = read("app/components/home/HomeSky.tsx");
    const board = read("app/components/home/HomeDepartures.tsx");
    const model = read("app/components/home/homeModel.ts");
    expect(model).toContain("VOICE.homeSeeking");
    expect(model).toContain("VOICE.homeEmpty");
    expect(board).toContain("tidyStationName(station.name)");
    expect(board).toContain("VOICE.homeMore");
    expect(board).toContain("empty.actions.map");
    // The track line is only what the stream sent: the page passes the room's
    // own title, never a made-up one.
    expect(sky).toContain('phase === "aboard" && trackLine');
    for (const text of [sky, board, model]) {
      expect(text).not.toMatch(/\b(discover|explore|playlist|seamless|unlock)\b/i);
    }
  });

  it("names three tabs: Elsewhere, Atlas, Desk", () => {
    const band = read("app/components/BandNav.tsx");
    const labels = [...band.matchAll(/label: "([^"]+)"/g)].map((m) => m[1]);
    expect(labels).toEqual(["Elsewhere", "Atlas", "Desk"]);
    const css = readAppCss();
    expect(css).toContain("grid-template-columns: repeat(3, 1fr); height: calc(44px");
  });
});
