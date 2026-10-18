import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Station } from "../../app/types/radio";
import {
  buildHourShelf,
  buildLabelShelves,
  hourCounts,
  pickAnchor,
  pickForShelf,
  pickLine,
  shelfFromSpec,
  shelfHour,
  tourStops,
  type ShelfCard,
  type StationLabelFacts,
} from "../../app/components/home/homeShelves";
import {
  addTrip,
  cleanTripName,
  parseTrips,
  removeTrip,
  toggleInTrip,
  TRIP_CAP,
} from "../../app/state/tripsStore";

const NOW = new Date("2026-10-18T03:00:00Z");

function station(uuid: string, longitude: number | null, name = `Station ${uuid}`): Station {
  return {
    uuid,
    name,
    url: `https://x.test/${uuid}`,
    streamUrl: `https://x.test/${uuid}.mp3`,
    favicon: "",
    country: "Nowhere",
    countryCode: null,
    state: null,
    city: `City ${uuid}`,
    latitude: longitude === null ? null : 10,
    longitude,
    language: null,
    tags: null,
    bitrate: 0,
    codec: null,
  } as unknown as Station;
}

const ids = (n: number, prefix = "s") => Array.from({ length: n }, (_, i) => ({ uuid: `${prefix}${i}` }));

describe("buildLabelShelves", () => {
  const facts: Record<string, StationLabelFacts> = {};
  for (let i = 0; i < 5; i += 1) facts[`m${i}`] = { format: "mostly_music", family: "rock", label: "Classic rock" };
  for (let i = 0; i < 4; i += 1) facts[`t${i}`] = { format: "mostly_talk_or_news", family: "none", label: "News" };
  for (let i = 0; i < 3; i += 1) facts[`j${i}`] = { format: "mostly_music", family: "jazz", label: null };
  const pool = [...Object.keys(facts), "unlabelled"].map((uuid) => ({ uuid }));

  it("builds music, voices and genre shelves in that order", () => {
    const shelves = buildLabelShelves(pool, (id) => facts[id] ?? null);
    expect(shelves.map((s) => s.id)).toEqual(["music", "voices", "genre-rock"]);
    expect(shelves[0]!.uuids).toHaveLength(8);
  });

  it("hides any shelf with fewer than four stations and skips unlabelled ones", () => {
    const shelves = buildLabelShelves(pool, (id) => facts[id] ?? null);
    expect(shelves.find((s) => s.id === "genre-jazz")).toBeUndefined();
    for (const shelf of shelves) expect(shelf.uuids).not.toContain("unlabelled");
    expect(buildLabelShelves(ids(3), () => ({ format: "mostly_music", family: null, label: null }))).toEqual([]);
  });

  it("never puts talk stations on a genre shelf and keeps at most two genres", () => {
    const many: Record<string, StationLabelFacts> = {};
    for (const family of ["pop", "rock", "jazz"]) {
      for (let i = 0; i < 4; i += 1) many[`${family}${i}`] = { format: "mostly_music", family, label: null };
    }
    for (let i = 0; i < 4; i += 1) many[`talk${i}`] = { format: "mostly_talk_or_news", family: "pop", label: null };
    const shelves = buildLabelShelves(Object.keys(many).map((uuid) => ({ uuid })), (id) => many[id] ?? null);
    const genres = shelves.filter((s) => s.kind === "genre");
    expect(genres).toHaveLength(2);
    for (const g of genres) expect(g.uuids.every((u) => !u.startsWith("talk"))).toBe(true);
  });
});

describe("shelfFromSpec", () => {
  it("drops stations that left the live pool and hides the shelf under four", () => {
    const stations = ids(6).map((s, i) => station(s.uuid, i * 10));
    const byId = new Map(stations.map((s) => [s.uuid, s]));
    const spec = { id: "music", kind: "music" as const, uuids: stations.map((s) => s.uuid) };
    expect(shelfFromSpec(spec, byId, {}, NOW)?.count).toBe(6);
    byId.delete("s0");
    byId.delete("s1");
    byId.delete("s2");
    expect(shelfFromSpec(spec, byId, {}, NOW)).toBeNull();
  });

  it("states nothing about this minute", () => {
    const stations = ids(4).map((s, i) => station(s.uuid, i));
    const shelf = shelfFromSpec(
      { id: "voices", kind: "voices", uuids: stations.map((s) => s.uuid) },
      new Map(stations.map((s) => [s.uuid, s])),
      {},
      NOW,
    )!;
    expect(`${shelf.title} ${shelf.why}`).not.toMatch(/on air|playing now|right now|this minute is/i);
  });
});

describe("hour shelf", () => {
  // 03:00 UTC: longitude 0 is the small hours, 90E is 09:00 (midday bucket), 150E is 13:00.
  const pool = [station("a", 0), station("b", 5), station("c", 90), station("d", null)];
  it("takes stations by their real local clock and leaves out clockless ones", () => {
    const night = buildHourShelf(pool, "Night", {}, NOW)!;
    expect(night.cards.map((c) => c.station.uuid)).toEqual(["a", "b"]);
    expect(night.cards.every((c) => c.clock)).toBe(true);
    expect(buildHourShelf(pool, "Dusk", {}, NOW)).toBeNull();
  });

  it("picks the gate, else an hour away from the listener's own, else the fullest", () => {
    const counts = hourCounts(pool, NOW);
    expect(shelfHour({ gate: "Dusk", listenerHour: "Night", counts })).toBe("Dusk");
    expect(shelfHour({ gate: null, listenerHour: null, counts })).toBe("Night");
    expect(shelfHour({ gate: null, listenerHour: "Night", counts: { Dawn: 0, Midday: 1, Dusk: 0, Night: 3 } })).toBe("Night");
    expect(shelfHour({ gate: null, listenerHour: "Night", counts: { Dawn: 2, Midday: 1, Dusk: 0, Night: 3 } })).toBe("Dawn");
  });
});

function card(uuid: string, clock: string | null, label: string | null): ShelfCard {
  return { station: station(uuid, 0, `Name ${uuid}`), clock, solar: clock ? "Night" : null, label } as ShelfCard;
}

describe("pick selection", () => {
  it("prefers a clocked, labelled card that is not playing", () => {
    const cards = [card("a", null, "News"), card("b", "03:00", null), card("c", "03:00", "News"), card("d", "03:00", "News")];
    expect(pickForShelf(cards)?.station.uuid).toBe("c");
    expect(pickForShelf(cards, "c")?.station.uuid).toBe("d");
    expect(pickForShelf([card("a", null, "News")])).toBeNull();
    expect(pickForShelf([card("b", "03:00", null)])?.station.uuid).toBe("b");
  });

  it("makes one stop per shelf and skips shelves with no pick", () => {
    const stops = tourStops([
      { id: "yours", cards: [], saved: true },
      { id: "hour", cards: [card("b", "03:00", null)] },
      { id: "music", cards: [card("c", "03:00", "Classic rock")] },
    ]);
    expect(stops.map((s) => s.shelfId)).toEqual(["hour", "music"]);
    expect(stops[1]!.anchor).toBe(pickAnchor("music", "c"));
  });

  it("words a pick only from place, clock and the station's own label", () => {
    const words = pickLine(card("c", "03:00", "Classic rock"), { saved: true });
    expect(words.line).toContain("Name c");
    expect(words.sub).toContain("03:00 there");
    expect(words.sub).toContain("Classic rock");
    expect(words.sub).toContain("One of yours");
    expect(pickLine(card("x", null, null)).sub).toBeNull();
  });
});

describe("trips store rules", () => {
  const slim = { uuid: "u1", name: "Radio One", streamUrl: "https://x.test/1.mp3", country: "Nowhere" };

  it("makes, names and removes trips", () => {
    let trips = addTrip([], "  Rainy   Tuesdays ", "t1", 1);
    expect(trips).toEqual([{ id: "t1", name: "Rainy Tuesdays", createdAt: 1, stations: [] }]);
    expect(addTrip(trips, "   ", "t2", 2)).toBe(trips);
    expect(cleanTripName("x".repeat(80))).toHaveLength(40);
    trips = removeTrip(trips, "t1");
    expect(trips).toEqual([]);
  });

  it("caps the number of trips", () => {
    let trips = [] as ReturnType<typeof addTrip>;
    for (let i = 0; i < TRIP_CAP + 3; i += 1) trips = addTrip(trips, `Trip ${i}`, `t${i}`, i);
    expect(trips).toHaveLength(TRIP_CAP);
  });

  it("adds a station once and takes it out on the second toggle", () => {
    const base = addTrip([], "Mine", "t1", 1);
    const added = toggleInTrip(base, "t1", slim);
    expect(added[0]!.stations.map((s) => s.uuid)).toEqual(["u1"]);
    expect(toggleInTrip(added, "t1", slim)[0]!.stations).toEqual([]);
    expect(toggleInTrip(base, "t1", { name: "no id" })).toBe(base);
  });

  it("parses stored trips defensively", () => {
    const parsed = parseTrips([
      { id: "a", name: "Good", createdAt: 5, stations: [slim, { junk: true }] },
      { id: "a", name: "Dupe" },
      { id: "", name: "No id" },
      "nope",
    ]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]!.stations).toHaveLength(1);
    expect(parseTrips("garbage")).toEqual([]);
  });
});

describe("labels stay on the server", () => {
  const read = (p: string) => readFileSync(resolve(__dirname, "../..", p), "utf8");
  it("only .server modules import the labels file", () => {
    for (const path of [
      "app/routes/_index.tsx",
      "app/components/home/homeShelves.ts",
      "app/components/home/HomeCard.tsx",
      "app/components/home/HomeShelfRows.tsx",
      "app/hooks/home/useHomeGuide.ts",
    ]) {
      expect(read(path)).not.toMatch(/stationLabels(\.server)?"|stationLabels\.json|stationLabelVocab/);
    }
    expect(read("app/routes/_index.tsx")).toContain("homeShelves.server");
  });
});
