import { describe, expect, it } from "vitest";
import {
  buildTheaterKnowledge,
  seatTheaterKnowledge,
  toExpandedNeighborhood,
  wakeTheaterKnowledge,
} from "~/components/radio-passport/knowledge/theaterKnowledge";
import type { TriviaGraphLike } from "~/types/knowledge";
import type { ExpandedNeighborhood } from "~/types/knowledge";
import type { Station } from "~/types/radio";

/**
 * Pure fixtures only — no network, no clock, no randomness outside the
 * seeded jitter the model itself controls.
 */

function makeStation(overrides: Partial<Station> = {}): Station {
  return {
    uuid: "st-1",
    name: "Radio Dusk",
    url: "https://dusk.example/stream",
    streamUrl: null,
    favicon: "https://img.example/dusk.png",
    country: "India",
    countryCode: "IN",
    state: null,
    city: "Mumbai",
    latitude: null,
    longitude: null,
    language: "Hindi",
    languageCodes: ["hi"],
    tags: null,
    bitrate: 128,
    codec: "AAC",
    ...overrides,
  };
}

/** One MusicBrainz spine (performed / appears on / released in / tagged /
 * adapted from) plus one properly cited web claim and one uncited web claim
 * that must never survive the merge. */
function makeRoomGraph(): TriviaGraphLike {
  return {
    nodes: [
      { id: "ravi-kale", label: "Ravi Kale", kind: "person" },
      { id: "night-ferry", label: "Night Ferry", kind: "work" },
      { id: "harbour-lights", label: "Harbour Lights", kind: "work" },
      { id: "1979", label: "1979", kind: "year" },
      { id: "dusk-pop", label: "Dusk Pop", kind: "genre" },
      { id: "kumari", label: "Kumari", kind: "film" },
      { id: "goa", label: "Goa", kind: "place" },
    ],
    edges: [
      {
        from: "ravi-kale",
        to: "night-ferry",
        relation: "performed",
        verified: true,
      },
      {
        from: "night-ferry",
        to: "harbour-lights",
        relation: "appears on",
        verified: true,
      },
      {
        from: "night-ferry",
        to: "1979",
        relation: "released in",
        verified: true,
      },
      { from: "night-ferry", to: "dusk-pop", relation: "tagged", verified: true },
      {
        from: "kumari",
        to: "night-ferry",
        relation: "adapted from",
        verified: true,
      },
      {
        from: "ravi-kale",
        to: "goa",
        relation: "recorded at",
        provenance: "web",
        sourceUrl: "https://press.example/goa-session",
      },
      // Should not exist upstream; the model fails closed anyway.
      { from: "goa", to: "night-ferry", relation: "vibes with", provenance: "web" },
    ],
  };
}

const TRACK_ID = "track:ravi-kale-night-ferry";
const CATALOG_IDS = ["country:IN", "city:mumbai", "language:hi", "station:st-1"];

function makeExpansion(): ExpandedNeighborhood {
  return {
    focusId: "country:IN",
    nodes: [
      {
        id: "station:st-2",
        kind: "station",
        label: "Radio Monsoon",
        provenance: "catalog",
      },
      {
        id: "station:st-3",
        kind: "station",
        label: "Radio Koel",
        provenance: "catalog",
      },
    ],
    edges: [
      { from: "country:IN", to: "station:st-2", relation: "stations here" },
      { from: "country:IN", to: "station:st-3", relation: "stations here" },
    ],
  };
}

const LANDED = { landed: true, icy: false, enrichment: false, evidence: false };

/** Maps do not JSON.stringify by entries — flatten deterministically. */
function serializeSeats(seats: Map<string, { x: number; y: number }>): string {
  return JSON.stringify(
    [...seats].sort(([left], [right]) => left.localeCompare(right)),
  );
}

describe("toExpandedNeighborhood", () => {
  it("namespaces raw Atlas ids so stations never collide with countries", () => {
    const neighborhood = toExpandedNeighborhood("country:IN", {
      graph: {
        nodes: [
          { id: "IN", label: "India", kind: "country", count: 40 },
          { id: "hi", label: "Hindi", kind: "language", count: 12 },
          {
            id: "st-9",
            label: "Radio Koel",
            kind: "station",
            favicon: "https://img.example/koel.png",
          },
        ],
        edges: [
          { from: "IN", to: "hi", relation: "broadcasts in" },
          { from: "hi", to: "st-9", relation: "stations here" },
        ],
      },
    });
    expect(neighborhood.nodes.map((node) => node.id)).toEqual([
      "country:IN",
      "language:hi",
      "station:st-9",
    ]);
    expect(neighborhood.edges).toEqual([
      { from: "country:IN", to: "language:hi", relation: "broadcasts in" },
      { from: "language:hi", to: "station:st-9", relation: "stations here" },
    ]);
    expect(neighborhood.nodes[2]?.imagery).toMatchObject({
      type: "favicon",
      url: "https://img.example/koel.png",
    });
  });
});

describe("buildTheaterKnowledge", () => {
  it("files the catalog quartet from the Station alone, with catalog edges", () => {
    const graph = buildTheaterKnowledge({ station: makeStation() });

    expect(graph.nodes.map((node) => node.id)).toEqual(CATALOG_IDS);
    expect(
      graph.nodes.map((node) => [node.kind, node.label, node.provenance]),
    ).toEqual([
      ["country", "India", "catalog"],
      ["city", "Mumbai", "catalog"],
      ["language", "Hindi", "catalog"],
      ["station", "Radio Dusk", "catalog"],
    ]);

    expect(graph.edges).toEqual([
      {
        from: "country:IN",
        to: "language:hi",
        relation: "broadcasts in",
        provenance: "catalog",
      },
      {
        from: "country:IN",
        to: "station:st-1",
        relation: "stations here",
        provenance: "catalog",
      },
      {
        from: "language:hi",
        to: "station:st-1",
        relation: "stations here",
        provenance: "catalog",
      },
      {
        from: "station:st-1",
        to: "city:mumbai",
        relation: "in city",
        provenance: "catalog",
      },
    ]);
  });

  it("keeps earlier node ids and array positions forever as sources grow", () => {
    const before = buildTheaterKnowledge({ station: makeStation() });
    const grown = buildTheaterKnowledge({
      station: makeStation(),
      roomGraph: makeRoomGraph(),
      expansions: [makeExpansion()],
    });

    expect(before.nodes.map((node) => node.id)).toEqual(CATALOG_IDS);
    grown.nodes.slice(0, before.nodes.length).forEach((node, index) => {
      expect(node.id).toBe(before.nodes[index]!.id);
      expect(node.kind).toBe(before.nodes[index]!.kind);
      expect(node.provenance).toBe(before.nodes[index]!.provenance);
    });
    // Addition-only reaches edges too: the catalog prefix is untouched.
    expect(grown.edges.slice(0, before.edges.length)).toEqual(before.edges);

    // New sources append in fixed order behind the catalog: room nodes file
    // in dossier array order, expansions behind them.
    expect(grown.nodes.map((node) => node.id)).toEqual([
      ...CATALOG_IDS,
      "artist:ravi-kale",
      TRACK_ID,
      "album:harbour-lights",
      "year:1979",
      "genre:dusk-pop",
      "event:kumari",
      "place:goa",
      "station:st-2",
      "station:st-3",
    ]);
    // Identical inputs rebuild byte-identical graphs — deterministic always.
    const again = buildTheaterKnowledge({
      station: makeStation(),
      roomGraph: makeRoomGraph(),
      expansions: [makeExpansion()],
    });
    const serializeGraph = (built: typeof grown) =>
      JSON.stringify([built.nodes, built.edges]);
    expect(serializeGraph(again)).toBe(serializeGraph(grown));
  });

  it("namespaces room kinds: centre work is the track, appears-on is an album, film reads as an event", () => {
    const graph = buildTheaterKnowledge({
      station: makeStation(),
      roomGraph: makeRoomGraph(),
    });
    const kinds = new Map(graph.nodes.map((node) => [node.id, node.kind]));

    expect(kinds.get(TRACK_ID)).toBe("track");
    expect(kinds.get("artist:ravi-kale")).toBe("artist");
    expect(kinds.get("album:harbour-lights")).toBe("album");
    expect(kinds.get("year:1979")).toBe("year");
    expect(kinds.get("genre:dusk-pop")).toBe("genre");
    expect(kinds.get("event:kumari")).toBe("event");
    expect(kinds.get("place:goa")).toBe("place");

    // The dossier's centre work bridges to the tuned station…
    expect(graph.edges).toContainEqual({
      from: "station:st-1",
      to: TRACK_ID,
      relation: "currently airing",
      provenance: "musicbrainz",
    });
    // …and the uncited web claim never existed.
    expect(
      graph.edges.some((edge) => edge.relation === "vibes with"),
    ).toBe(false);
  });

  it("fails closed: uncited web edges, unverified musicbrainz flags and ghost endpoints drop out", () => {
    const shaky: TriviaGraphLike = {
      nodes: [
        { id: "a-work", label: "A Work", kind: "work" },
        { id: "ghost-person", label: "Ghost Person", kind: "person" },
      ],
      edges: [
        // Claims musicbrainz but arrives flagged unverified.
        {
          from: "ghost-person",
          to: "a-work",
          relation: "performed",
          provenance: "musicbrainz",
          verified: false,
        },
        // Endpoint was refused above, so this verified edge dangles.
        {
          from: "ravi-kale",
          to: "a-work",
          relation: "covers",
          verified: true,
        },
      ],
    };
    const stationless = buildTheaterKnowledge({
      station: null,
      roomGraph: makeRoomGraph(),
    });
    // No station node, so no "currently airing" bridge can be claimed either.
    expect(
      stationless.edges.some((edge) => edge.relation === "currently airing"),
    ).toBe(false);
    expect(stationless.nodes.some((node) => node.kind === "station")).toBe(false);

    const graph = buildTheaterKnowledge({
      station: makeStation(),
      roomGraph: shaky,
    });
    // The verified "covers" edge files its work end (a-work reads as the
    // track); its performer end was refused, so the edge itself dangles out.
    // Nothing else from the dossier survives.
    expect(graph.nodes.map((node) => node.id)).toEqual([
      ...CATALOG_IDS,
      "track:a-work",
    ]);
    expect(
      graph.nodes.some((node) => node.id.includes("ghost-person")),
    ).toBe(false);
    expect(
      graph.edges.some((edge) => edge.relation === "covers"),
    ).toBe(false);
    // Catalog four + the airing bridge to the one work that did file.
    expect(graph.edges).toHaveLength(5);
    expect(graph.edges).toContainEqual({
      from: "station:st-1",
      to: "track:a-work",
      relation: "currently airing",
      provenance: "musicbrainz",
    });
  });
});

describe("wakeTheaterKnowledge", () => {
  const graph = buildTheaterKnowledge({
    station: makeStation(),
    roomGraph: makeRoomGraph(),
  });

  it("landing lights the four catalog anchors and their catalog edges fire", () => {
    const model = wakeTheaterKnowledge({
      graph,
      seats: new Map(),
      awake: new Set(),
      events: LANDED,
      focusId: null,
      cap: 18,
    });

    expect([...model.awake].sort()).toEqual([...CATALOG_IDS].sort());
    expect(model.firing.map((pulse) => [pulse.from, pulse.to])).toEqual([
      ["country:IN", "language:hi"],
      ["country:IN", "station:st-1"],
      ["language:hi", "station:st-1"],
      ["station:st-1", "city:mumbai"],
    ]);
    expect(model.awake.has(TRACK_ID)).toBe(false);
  });

  it("icy wakes only the track tier; the second identical call fires nothing", () => {
    const landed = wakeTheaterKnowledge({
      graph,
      seats: new Map(),
      awake: new Set(),
      events: LANDED,
      focusId: null,
      cap: 18,
    });
    const icy = wakeTheaterKnowledge({
      graph,
      seats: new Map(),
      awake: landed.awake,
      events: { ...LANDED, icy: true },
      focusId: null,
      cap: 18,
    });

    expect([...icy.awake].filter((id) => !landed.awake.has(id))).toEqual([
      TRACK_ID,
    ]);
    expect(icy.firing).toEqual([{ from: "station:st-1", to: TRACK_ID }]);

    const repeat = wakeTheaterKnowledge({
      graph,
      seats: new Map(),
      awake: icy.awake,
      events: { ...LANDED, icy: true },
      focusId: null,
      cap: 18,
    });
    expect(repeat.firing).toEqual([]);
    expect(repeat.awake.size).toBe(icy.awake.size);
  });

  it("enrichment wakes the track's musicbrainz neighbours — never the web-only branch", () => {
    const landed = wakeTheaterKnowledge({
      graph,
      seats: new Map(),
      awake: new Set(),
      events: LANDED,
      focusId: null,
      cap: 18,
    });
    const icy = wakeTheaterKnowledge({
      graph,
      seats: new Map(),
      awake: landed.awake,
      events: { ...LANDED, icy: true },
      focusId: null,
      cap: 18,
    });
    const enriched = wakeTheaterKnowledge({
      graph,
      seats: new Map(),
      awake: icy.awake,
      events: { landed: false, icy: false, enrichment: true, evidence: false },
      focusId: null,
      cap: 18,
    });

    const newcomers = [...enriched.awake].filter((id) => !icy.awake.has(id));
    expect(newcomers.sort()).toEqual(
      [
        "artist:ravi-kale",
        "album:harbour-lights",
        "year:1979",
        "genre:dusk-pop",
        "event:kumari",
      ].sort(),
    );
    expect(enriched.awake.has("place:goa")).toBe(false);

    // Exactly the edges the new neurons just joined — no more, no fewer.
    expect(enriched.firing.map((pulse) => [pulse.from, pulse.to]).sort()).toEqual(
      (
        [
          ["artist:ravi-kale", TRACK_ID],
          [TRACK_ID, "album:harbour-lights"],
          [TRACK_ID, "year:1979"],
          [TRACK_ID, "genre:dusk-pop"],
          ["event:kumari", TRACK_ID],
        ] as Array<[string, string]>
      ).sort(),
    );
  });

  it("evidence wakes cited web neighbours of awake nodes only", () => {
    const landed = wakeTheaterKnowledge({
      graph,
      seats: new Map(),
      awake: new Set(),
      events: LANDED,
      focusId: null,
      cap: 18,
    });
    const enriched = wakeTheaterKnowledge({
      graph,
      seats: new Map(),
      awake: (() => {
        let current = landed.awake;
        for (const events of [
          { landed: false, icy: true, enrichment: false, evidence: false },
          { landed: false, icy: false, enrichment: true, evidence: false },
        ]) {
          current = wakeTheaterKnowledge({
            graph,
            seats: new Map(),
            awake: current,
            events,
            focusId: null,
            cap: 18,
          }).awake;
        }
        return current;
      })(),
      events: { landed: false, icy: false, enrichment: false, evidence: true },
      focusId: null,
      cap: 18,
    });

    expect(enriched.awake.has("place:goa")).toBe(true);
    expect(enriched.firing).toContainEqual({
      from: "artist:ravi-kale",
      to: "place:goa",
    });
  });

  it("web nodes with no path into the awake set stay asleep", () => {
    const island: TriviaGraphLike = {
      nodes: [
        { id: "monsoon-legends", label: "Monsoon Legends", kind: "event" },
        { id: "koel-festival", label: "Koel Festival", kind: "event" },
      ],
      edges: [
        {
          from: "monsoon-legends",
          to: "koel-festival",
          relation: "part of",
          provenance: "web",
          sourceUrl: "https://press.example/koel",
        },
      ],
    };
    const graph = buildTheaterKnowledge({
      station: makeStation(),
      roomGraph: island,
    });
    // The pair did file (they carry a citation), but nothing connects them
    // to anything lit.
    expect(graph.nodes.map((node) => node.id)).toContain("event:monsoon-legends");
    expect(graph.edges).toContainEqual({
      from: "event:monsoon-legends",
      to: "event:koel-festival",
      relation: "part of",
      provenance: "web",
      sourceUrl: "https://press.example/koel",
    });

    const model = wakeTheaterKnowledge({
      graph,
      seats: new Map(),
      awake: new Set(),
      events: { landed: true, icy: false, enrichment: false, evidence: true },
      focusId: null,
      cap: 18,
    });
    // Only the landing quartet lit; the island pair never had a path in.
    expect([...model.awake].sort()).toEqual([...CATALOG_IDS].sort());
    expect(
      model.firing.filter(
        (pulse) =>
          pulse.from.startsWith("event:") || pulse.to.startsWith("event:"),
      ),
    ).toEqual([]);
  });

  it("respects the density cap, prefers the focus neighbourhood and counts honest darkness", () => {
    const dense = buildTheaterKnowledge({
      station: makeStation(),
      roomGraph: makeRoomGraph(),
      expansions: [makeExpansion()],
    });
    const model = wakeTheaterKnowledge({
      graph: dense,
      seats: new Map(),
      awake: new Set(),
      events: LANDED,
      focusId: null,
      cap: 5,
    });

    // Focus first, then breadth: country, its hop-1 ring, and the cap stops
    // there. Six anchors are awake; exactly one stays honestly dark.
    expect(model.visible).toEqual([
      "country:IN",
      "language:hi",
      "station:st-1",
      "station:st-2",
      "station:st-3",
    ]);
    expect(model.visible.length).toBeLessThanOrEqual(5);
    expect(model.darkCount).toBe(1);

    const wide = wakeTheaterKnowledge({
      graph: dense,
      seats: new Map(),
      awake: new Set(),
      events: LANDED,
      focusId: null,
      cap: 18,
    });
    expect(wide.darkCount).toBe(0);
  });

  it("keeps stations visible when a country hop is crowded with languages", () => {
    const languages = Array.from({ length: 8 }, (_, index) => ({
      id: `language:l${index}`,
      kind: "language" as const,
      label: `Lang ${index}`,
      provenance: "catalog" as const,
    }));
    const stations = Array.from({ length: 8 }, (_, index) => ({
      id: `station:s${index}`,
      kind: "station" as const,
      label: `Station ${index}`,
      provenance: "catalog" as const,
    }));
    const crowded: ExpandedNeighborhood = {
      focusId: "country:IN",
      nodes: [...languages, ...stations],
      edges: [
        ...languages.map((node) => ({
          from: "country:IN",
          to: node.id,
          relation: "broadcasts in",
        })),
        ...stations.map((node) => ({
          from: "country:IN",
          to: node.id,
          relation: "stations here",
        })),
      ],
    };
    const graph = buildTheaterKnowledge({
      station: makeStation(),
      expansions: [crowded],
    });
    const model = wakeTheaterKnowledge({
      graph,
      seats: new Map(),
      awake: new Set(),
      events: LANDED,
      focusId: "country:IN",
      cap: 10,
    });
    const visibleStations = model.visible.filter((id) =>
      id.startsWith("station:"),
    );
    const visibleLanguages = model.visible.filter((id) =>
      id.startsWith("language:"),
    );
    expect(visibleStations.length).toBeGreaterThanOrEqual(4);
    expect(visibleLanguages.length).toBeGreaterThanOrEqual(1);
    expect(visibleLanguages.length).toBeLessThanOrEqual(3);
  });

  it("never lists an asleep node, even a structural neighbour of the focus", () => {
    const model = wakeTheaterKnowledge({
      graph,
      seats: new Map(),
      awake: new Set(),
      events: LANDED,
      focusId: null,
      cap: 18,
    });
    // The track hangs one hop off the station but has not been woken by any
    // real event — it must not appear however sparse the sky is.
    expect(model.visible).not.toContain(TRACK_ID);
    for (const id of model.visible) {
      expect(model.awake.has(id)).toBe(true);
    }
  });
});

describe("seatTheaterKnowledge", () => {
  const graph = buildTheaterKnowledge({
    station: makeStation(),
    roomGraph: makeRoomGraph(),
    expansions: [makeExpansion()],
  });

  it("centres the default focus and keeps every seat inside the sky", () => {
    const seats = seatTheaterKnowledge({
      graph,
      seats: new Map(),
      focusId: null,
      seed: 7,
    });

    expect(seats.get("country:IN")).toEqual({ x: 0.5, y: 0.5 });
    expect(seats.size).toBe(graph.nodes.length);
    for (const seat of seats.values()) {
      expect(seat.x).toBeGreaterThanOrEqual(0.06);
      expect(seat.x).toBeLessThanOrEqual(0.94);
      expect(seat.y).toBeGreaterThanOrEqual(0.06);
      expect(seat.y).toBeLessThanOrEqual(0.94);
    }
  });

  it("is deterministic per seed and keyed by identity, not arrival order", () => {
    const first = seatTheaterKnowledge({
      graph,
      seats: new Map(),
      focusId: null,
      seed: 7,
    });
    const replay = seatTheaterKnowledge({
      graph,
      seats: new Map(),
      focusId: null,
      seed: 7,
    });
    const otherSeed = seatTheaterKnowledge({
      graph,
      seats: new Map(),
      focusId: null,
      seed: 8,
    });

    expect(serializeSeats(first)).toBe(serializeSeats(replay));
    expect(serializeSeats(first)).not.toBe(serializeSeats(otherSeed));
  });

  it("pins existing seats byte-equal while growth only adds newcomers", () => {
    const before = seatTheaterKnowledge({
      graph,
      seats: new Map(),
      focusId: null,
      seed: 7,
    });
    const grownGraph = buildTheaterKnowledge({
      station: makeStation(),
      roomGraph: makeRoomGraph(),
      expansions: [
        makeExpansion(),
        {
          focusId: "country:IN",
          nodes: [
            {
              id: "station:st-4",
              kind: "station",
              label: "Radio Banyan",
              provenance: "catalog",
            },
          ],
          edges: [
            { from: "country:IN", to: "station:st-4", relation: "stations here" },
          ],
        },
      ],
    });
    const after = seatTheaterKnowledge({
      graph: grownGraph,
      seats: before,
      focusId: null,
      seed: 7,
    });

    for (const [id, seat] of before) {
      expect(after.get(id)).toEqual(seat);
    }
    expect(after.get("station:st-4")).toBeDefined();
    expect(after.size).toBe(grownGraph.nodes.length);
  });

  it("recentres only the focus on focus change; every other pinned seat holds", () => {
    const seated = seatTheaterKnowledge({
      graph,
      seats: new Map(),
      focusId: null,
      seed: 7,
    });
    const refocused = seatTheaterKnowledge({
      graph,
      seats: seated,
      focusId: "artist:ravi-kale",
      seed: 7,
    });

    expect(refocused.get("artist:ravi-kale")).toEqual({ x: 0.5, y: 0.5 });
    for (const [id, seat] of seated) {
      if (id === "artist:ravi-kale") continue;
      expect(refocused.get(id)).toEqual(seat);
    }

    // Refocusing back leaves the artist pinned where the focus left it —
    // addition-stability beats tidying up.
    const backAgain = seatTheaterKnowledge({
      graph,
      seats: refocused,
      focusId: null,
      seed: 7,
    });
    expect(backAgain.get("artist:ravi-kale")).toEqual({ x: 0.5, y: 0.5 });
    expect(backAgain.get("country:IN")).toEqual(seated.get("country:IN"));
  });

  it("seats newcomers on kind-sector rings around the focus", () => {
    const bare = buildTheaterKnowledge({ station: makeStation() });
    const grown = buildTheaterKnowledge({
      station: makeStation(),
      roomGraph: makeRoomGraph(),
    });
    const before = seatTheaterKnowledge({
      graph: bare,
      seats: new Map(),
      focusId: null,
      seed: 3,
    });
    const after = seatTheaterKnowledge({
      graph: grown,
      seats: before,
      focusId: null,
      seed: 3,
    });

    const ringDistance = (seat: { x: number; y: number }) =>
      Math.hypot(seat.x - 0.5, (seat.y - 0.5) / 0.72);

    // Hop-1 off the default country focus takes the inner ring…
    expect(ringDistance(after.get("language:hi")!)).toBeCloseTo(0.26, 5);
    expect(ringDistance(after.get("station:st-1")!)).toBeCloseTo(0.26, 5);
    // …the track hangs off the station — hop two — the outer ring, and so
    // does everything deeper (the album rides beyond the track).
    expect(ringDistance(after.get(TRACK_ID)!)).toBeCloseTo(0.42, 5);
    expect(ringDistance(after.get("city:mumbai")!)).toBeCloseTo(0.42, 5);
    expect(ringDistance(after.get("album:harbour-lights")!)).toBeCloseTo(
      0.42,
      5,
    );

    // Pinned quartet untouched by the dossier's arrival.
    for (const [id, seat] of before) {
      expect(after.get(id)).toEqual(seat);
    }
  });

  it("keeps sibling seats far enough that labels do not stack", () => {
    const crowded = buildTheaterKnowledge({
      station: makeStation(),
      expansions: [
        {
          focusId: "country:IN",
          nodes: Array.from({ length: 8 }, (_, index) => ({
            id: `station:st-${index + 10}`,
            kind: "station" as const,
            label: `Station ${index}`,
            provenance: "catalog" as const,
          })),
          edges: Array.from({ length: 8 }, (_, index) => ({
            from: "country:IN",
            to: `station:st-${index + 10}`,
            relation: "stations here",
          })),
        },
      ],
    });
    const seats = seatTheaterKnowledge({
      graph: crowded,
      seats: new Map(),
      focusId: null,
      seed: 3,
    });
    const ids = crowded.nodes.map((node) => node.id);
    for (let i = 0; i < ids.length; i += 1) {
      for (let j = i + 1; j < ids.length; j += 1) {
        const a = seats.get(ids[i]!)!;
        const b = seats.get(ids[j]!)!;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(
          0.12 - 1e-9,
        );
      }
    }
  });
});

describe("knowledge imagery", () => {
  it("gives the country node a flag from countryCode and the station a favicon/monogram", () => {
    const graph = buildTheaterKnowledge({ station: makeStation() });
    const byId = new Map(graph.nodes.map((node) => [node.id, node]));

    expect(byId.get("country:IN")?.imagery).toEqual({
      type: "flag",
      code: "IN",
    });
    expect(byId.get("station:st-1")?.imagery).toEqual({
      type: "favicon",
      url: "https://img.example/dusk.png",
      monogram: "R",
    });
    // Typographic kinds carry no invented art.
    expect(byId.get("language:hi")?.imagery).toBeUndefined();
    expect(byId.get("city:mumbai")?.imagery).toBeUndefined();
  });

  it("falls back to a monogram when the favicon is unusable and never invents a flag", () => {
    const unusableFavicon = buildTheaterKnowledge({
      station: makeStation({
        uuid: "st-2",
        name: "Koel",
        favicon: "javascript:alert(1)",
      }),
    });
    const koel = unusableFavicon.nodes.find(
      (node) => node.id === "station:st-2",
    );
    expect(koel?.imagery).toEqual({
      type: "favicon",
      url: null,
      monogram: "K",
    });

    const noCode = buildTheaterKnowledge({
      station: makeStation({ countryCode: null }),
    });
    const country = noCode.nodes.find((node) => node.kind === "country");
    expect(country?.id).toBe("country:india");
    expect(country?.imagery).toBeUndefined();
  });
});
