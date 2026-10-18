import { describe, expect, it } from "vitest";
import {
  DESK_ANCHORS,
  deskExchangeMove,
  deskGreeting,
  deskRoamStops,
  stampJustLanded,
} from "~/components/desk/deskKeeper";
import { deskPlays, deskShelf, nextNoteIndex, stampSecondsLeft, type Departure } from "~/components/desk/deskModel";
import { ROAM_POSES } from "~/components/keeper/keeperRoamModel";
import type { Station } from "~/types/radio";

function station(overrides: Partial<Station> = {}): Station {
  return {
    uuid: "s1",
    name: "Radio One",
    url: "",
    streamUrl: null,
    favicon: "",
    country: "Italy",
    state: "",
    language: "italian",
    tagList: [],
    ...overrides,
  } as Station;
}

const base = { place: "Italy", clock: "03:46", stationName: "Radio Armisa", stamped: false };

describe("desk keeper: what he says and where he goes", () => {
  it("greets on landing with the station's clock and name, never a track", () => {
    const line = deskGreeting(base);
    expect(line.pose).toBe("speaking");
    expect(line.line).toBe("Landed. It’s 03:46 in Italy.");
    expect(line.sub).toContain("Radio Armisa");
    expect(line.sub).toContain("stamp");
    expect(deskGreeting({ ...base, clock: null }).line).toBe("Landed. Italy.");
    expect(deskGreeting({ ...base, stamped: true }).sub).toContain("already in your passport");
  });

  it("wanders to On air first, listening while it plays, and skips cards not shown", () => {
    const stops = deskRoamStops({ ...base, playing: true, hasNote: false, hasShelf: false });
    expect(stops[0]).toMatchObject({ anchor: DESK_ANCHORS.onair, pose: "listening" });
    expect(stops.map((stop) => stop.anchor)).toEqual(["onair", "plays", "place", "ask"]);
    const all = deskRoamStops({ ...base, playing: false, hasNote: true, hasShelf: true });
    expect(all[0]!.pose).toBe("idle");
    expect(all.map((stop) => stop.anchor)).toEqual(["onair", "plays", "note", "next", "place", "ask"]);
    // The notebook stop is marked as his, not the station's.
    expect(all.find((stop) => stop.anchor === "note")!.source).toBe("notebook");
    for (const stop of all) expect(ROAM_POSES).toContain(stop.pose);
  });

  it("walks to Ask to look it up, then talks, with the answer left in the card", () => {
    expect(deskExchangeMove("none", "thinking")).toEqual({ kind: "goTo", anchor: "ask", pose: "searching" });
    expect(deskExchangeMove("thinking", "speaking")).toEqual({ kind: "pose", pose: "speaking" });
    expect(deskExchangeMove("speaking", "none")).toBeNull();
    expect(deskExchangeMove("thinking", "thinking")).toBeNull();
  });

  it("runs to the passport only when the stamp lands while you watch", () => {
    expect(stampJustLanded(false, true)).toBe(true);
    expect(stampJustLanded(null, true)).toBe(false);
    expect(stampJustLanded(true, true)).toBe(false);
    expect(stampJustLanded(false, false)).toBe(false);
  });
});

describe("desk cards", () => {
  it("puts the similar picks first on the shelf, then the queue, no repeats", () => {
    const now = new Date(Date.UTC(2026, 9, 17, 2, 0));
    const current = station({ uuid: "a" });
    const b = station({ uuid: "b", longitude: 2.35 });
    const c = station({ uuid: "c" });
    const row = (s: Station): Departure => ({ station: s, clock: null, solar: null, shared: [] });
    const shelf = deskShelf(current, [b, current], [row(b), row(c)], now);
    expect(shelf.map((card) => [card.station.uuid, card.similar])).toEqual([
      ["b", true],
      ["c", false],
    ]);
    expect(shelf[0]!.clock).toMatch(/^\d\d:\d\d$/);
    expect(deskShelf(current, [], [row(b), row(c)], now, 1)).toHaveLength(1);
  });

  it("counts the stamp's seconds down from the dock's ink", () => {
    expect(stampSecondsLeft(null)).toBeNull();
    expect(stampSecondsLeft(Number.NaN)).toBeNull();
    expect(stampSecondsLeft(0)).toBe(60);
    expect(stampSecondsLeft(0.5)).toBe(30);
    expect(stampSecondsLeft(0.99)).toBe(1);
    expect(stampSecondsLeft(1)).toBe(0);
    expect(stampSecondsLeft(3)).toBe(0);
  });

  it("shows readable labels with the raw tags behind them, or the raw tags alone", () => {
    expect(deskPlays(["Italian oldies", "Mostly music"], ["anni 80", "balera", "anni 80"])).toEqual({
      labels: ["Italian oldies", "Mostly music"],
      raw: ["anni 80", "balera"],
      rawOnly: false,
    });
    expect(deskPlays(null, ["jazz"])).toEqual({ labels: [], raw: ["jazz"], rawOnly: true });
    expect(deskPlays(["a", "b", "c", "d"], []).labels).toHaveLength(3);
  });

  it("turns to the next note and round again", () => {
    expect(nextNoteIndex(0, 3)).toBe(1);
    expect(nextNoteIndex(2, 3)).toBe(0);
    expect(nextNoteIndex(0, 0)).toBe(0);
  });
});
