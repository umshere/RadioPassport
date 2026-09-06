import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FACT_RELEASE_CAP,
  FIELD_DEGREE_CAP,
  FIELD_STRUCTURE_MS,
  FIELD_TRIANGLE_CAP,
  GRAPH_PULSE_MS,
  TAG_RELEASE_CAP,
  fieldBirthBloom,
  fieldBirthRipple,
  fieldDensity,
  fieldDust,
  fieldDustTwinkle,
  fieldEdges,
  fieldFamiliesConnect,
  fieldGraphPulse,
  fieldKnowledgeEdges,
  fieldMilkyWay,
  fieldNebulae,
  fieldNodesFromReleases,
  fieldPoint,
  advanceFieldTraveler,
  fieldResolveFocus,
  fieldSemanticEdges,
  fieldShootingStar,
  fieldSpanEdges,
  fieldStarTwinkle,
  fieldTourRank,
  fieldTravelerInTransit,
  fieldTravelerAt,
  fieldStandingLabel,
  fieldStructureProgress,
  fieldStructureReady,
  fieldStructuredTargets,
  fieldTourSpans,
  fieldVisitLabel,
  fieldWalk,
  fieldTriangles,
  formatBearing,
  graphFromMusicBrainzRelations,
  hexRgb,
  lockFingerprint,
  lockSeed,
  longitudeHomeX,
  mergeTriviaGraphs,
  normalizeTriviaGraph,
  splitFieldTokens,
  theaterLockLineAt,
  theaterLockLines,
  theaterLockLive,
  theaterSkyLive,
  theaterBeat,
  theaterBeatSky,
  theaterPhase,
  theaterReleases,
  theaterTrackCopy,
  theaterWellAria,
  THEATER_SKY_EVIDENCE,
  THEATER_SKY_FILED,
  THEATER_SKY_LANDED,
} from "~/components/radio-passport/theaterLock";
import type { TriviaGraph } from "~/types/trivia";

describe("theater lock", () => {
  it("files the dossier only after a title and ready trivia", () => {
    expect(
      theaterPhase({
        isPlaying: true,
        hasTrack: false,
        metadataStatus: "loading",
        triviaStatus: "idle",
      }),
    ).toBe("reading");
    expect(
      theaterPhase({
        isPlaying: true,
        hasTrack: true,
        metadataStatus: "ready",
        triviaStatus: "loading",
      }),
    ).toBe("locking");
    expect(
      theaterPhase({
        isPlaying: true,
        hasTrack: true,
        metadataStatus: "ready",
        triviaStatus: "ready",
      }),
    ).toBe("filed");
    expect(
      theaterPhase({
        isPlaying: true,
        hasTrack: true,
        metadataStatus: "ready",
        triviaStatus: "empty",
      }),
    ).toBe("quiet");
    expect(
      theaterPhase({
        isPlaying: false,
        hasTrack: false,
        metadataStatus: "idle",
        triviaStatus: "idle",
      }),
    ).toBe("quiet");
  });

  it("maps Knowledge beats: 01/02 share 236, 04 only on a tapped star", () => {
    expect(
      theaterBeat({ phase: "quiet", hasTrack: false, selectedId: null }),
    ).toBe("landed");
    expect(
      theaterBeat({ phase: "reading", hasTrack: false, selectedId: null }),
    ).toBe("landed");
    expect(
      theaterBeat({ phase: "locking", hasTrack: true, selectedId: null }),
    ).toBe("reading");
    expect(
      theaterBeat({ phase: "quiet", hasTrack: true, selectedId: null }),
    ).toBe("reading");
    expect(
      theaterBeat({ phase: "filed", hasTrack: true, selectedId: null }),
    ).toBe("filed");
    expect(
      theaterBeat({
        phase: "filed",
        hasTrack: true,
        selectedId: "artist:amalia",
      }),
    ).toBe("evidence");
    expect(theaterBeatSky("landed")).toBe(THEATER_SKY_LANDED);
    expect(theaterBeatSky("reading")).toBe(THEATER_SKY_LANDED);
    expect(theaterBeatSky("filed")).toBe(THEATER_SKY_FILED);
    expect(theaterBeatSky("evidence")).toBe(THEATER_SKY_EVIDENCE);
    expect(theaterBeatSky("landed")).toBe(theaterBeatSky("reading"));
  });

  it("does not claim a silent station while the title is still being read", () => {
    expect(
      theaterTrackCopy({
        isPlaying: true,
        metadataStatus: "loading",
        trackLine: null,
      }),
    ).toBeNull();
    expect(
      theaterTrackCopy({
        isPlaying: true,
        metadataStatus: "empty",
        trackLine: null,
      }),
    ).toMatch(/no track titles/i);
    expect(
      theaterTrackCopy({
        isPlaying: true,
        metadataStatus: "ready",
        trackLine: "Chris Coco — Love Made Me Tough",
      }),
    ).toBe("Chris Coco — Love Made Me Tough");
  });

  it("emits one node per released field and never invents a title", () => {
    expect(theaterReleases({}).map((item) => item.family)).toEqual([]);
    const bare = theaterReleases({
      city: "San Francisco",
      country: "The United States Of America",
      longitude: -122.4,
      bitrate: 128,
      codec: "mp3",
      languages: splitFieldTokens("english"),
      tags: ["ambient", "downtempo", "ambient"],
    });
    expect(bare.map((item) => item.family)).toEqual([
      "place",
      "place",
      "signal",
      "signal",
      "language",
      "tag",
      "tag",
    ]);
    expect(bare.some((item) => item.family === "track")).toBe(false);
    const rich = theaterReleases({
      city: "San Francisco",
      tags: ["ambient", "downtempo"],
      artist: "Chris Coco",
      title: "Love Made Me Tough",
      facts: [
        { label: "Year", value: "2007" },
        { label: "Album", value: "Stay" },
      ],
      summary: "A 2000s downtempo track.",
    });
    expect(
      rich.filter((item) => item.family === "track").map((item) => item.label),
    ).toEqual(["Chris Coco", "Love Made Me Tough"]);
    expect(rich.filter((item) => item.family === "fact")).toHaveLength(2);
    expect(
      rich.filter((item) => item.family === "fact").map((item) => item.label),
    ).toEqual(["2007", "Stay"]);
    expect(rich.some((item) => item.family === "cover")).toBe(true);
    const manyTags = theaterReleases({
      tags: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"],
    });
    expect(manyTags.filter((item) => item.family === "tag")).toHaveLength(
      TAG_RELEASE_CAP,
    );
    const manyFacts = theaterReleases({
      facts: [
        { label: "A", value: "1" },
        { label: "B", value: "2" },
        { label: "C", value: "3" },
        { label: "D", value: "4" },
        { label: "E", value: "5" },
        { label: "F", value: "6" },
        { label: "G", value: "7" },
        { label: "H", value: "8" },
      ],
    });
    expect(manyFacts.filter((item) => item.family === "fact")).toHaveLength(
      FACT_RELEASE_CAP,
    );
  });

  it("places the field from released metadata so two stations draw different skies", () => {
    const seed = lockSeed(["station-1", "San Francisco"]);
    const west = fieldNodesFromReleases(
      theaterReleases({
        city: "San Francisco",
        longitude: -122.4,
        tags: ["ambient", "downtempo"],
      }),
      seed,
      -122.4,
    );
    const east = fieldNodesFromReleases(
      theaterReleases({
        city: "Lisbon",
        longitude: -9.1,
        tags: ["fado", "folk"],
      }),
      lockSeed(["station-2", "Lisbon"]),
      -9.1,
    );
    expect(west).toHaveLength(3);
    expect(east).toHaveLength(3);
    expect(west[0]!.x).toBeCloseTo(longitudeHomeX(-122.4), 5);
    expect(east[0]!.x).not.toBeCloseTo(west[0]!.x, 2);
    const afterTrack = fieldNodesFromReleases(
      theaterReleases({
        city: "San Francisco",
        longitude: -122.4,
        tags: ["ambient", "downtempo"],
        artist: "Chris Coco",
        title: "Love Made Me Tough",
      }),
      seed,
      -122.4,
    );
    const city = west.find((node) => node.key === "place:san francisco");
    const cityLater = afterTrack.find(
      (node) => node.key === "place:san francisco",
    );
    expect(city?.x).toBe(cityLater?.x);
    expect(city?.y).toBe(cityLater?.y);
    expect(fieldPoint(west[0]!, 0, 0)).toEqual(fieldPoint(west[0]!, 1.25, 0));
    expect(fieldPoint(west[0]!, 1.25, 1).x).not.toBe(west[0]!.x);
    expect(fieldFamiliesConnect("tag", "fact")).toBe(true);
    expect(fieldFamiliesConnect("place", "fact")).toBe(false);
    expect(fieldDensity("filed").glow).toBeLessThan(
      fieldDensity("locking").glow,
    );
    expect(fieldDensity("filed").glow).toBeGreaterThan(
      fieldDensity("reading").glow,
    );
    expect(fieldDensity("filed").drift).toBeGreaterThan(0.2);
    const cluster = [
      { x: 0.2, y: 0.2 },
      { x: 0.22, y: 0.21 },
      { x: 0.21, y: 0.23 },
      { x: 0.8, y: 0.8 },
    ];
    expect(fieldEdges(cluster, 0.06).length).toBe(3);
    expect(fieldTriangles(cluster, 0.06)).toHaveLength(1);
    // A rich sky must not stack into crumpled foil.
    const swarm = Array.from({ length: 14 }, (_, index) => ({
      x: 0.4 + (index % 4) * 0.02,
      y: 0.4 + Math.floor(index / 4) * 0.02,
    }));
    const capped = fieldTriangles(swarm, 0.4);
    expect(capped.length).toBe(FIELD_TRIANGLE_CAP);
    expect(fieldTriangles(swarm, 0.4, 1, 4)).toHaveLength(4);
    expect(capped[0]!.strength).toBeGreaterThanOrEqual(
      capped[capped.length - 1]!.strength,
    );
    expect(
      fieldSemanticEdges(
        west,
        west.map((node) => ({ x: node.x, y: node.y })),
        0.4,
      ).length,
    ).toBeGreaterThan(0);
    // A filed sky must stay a figure, not a web: every star keeps a few threads.
    const crowd = Array.from(
      { length: 12 },
      (_, index) =>
        fieldNodesFromReleases(
          [{ key: `tag:t${index}`, family: "tag", label: `t${index}` }],
          lockSeed(["crowd", index]),
        )[0]!,
    );
    const crowdPoints = crowd.map((_, index) => ({
      x: 0.45 + (index % 4) * 0.015,
      y: 0.45 + Math.floor(index / 4) * 0.015,
    }));
    const thinned = fieldSemanticEdges(crowd, crowdPoints, 0.4);
    const degree = new Map<number, number>();
    thinned.forEach((edge) => {
      degree.set(edge.i, (degree.get(edge.i) ?? 0) + 1);
      degree.set(edge.j, (degree.get(edge.j) ?? 0) + 1);
    });
    expect(
      [...degree.values()].every((count) => count <= FIELD_DEGREE_CAP),
    ).toBe(true);
    expect(
      fieldSemanticEdges(crowd, crowdPoints, 0.4, 1, 0).length,
    ).toBeGreaterThan(thinned.length);
    const split = [
      { family: "language" as const, x: 0.12, y: 0.4 },
      { family: "track" as const, x: 0.88, y: 0.28 },
      { family: "place" as const, x: 0.84, y: 0.18 },
    ];
    const splitPoints = split.map((node) => ({ x: node.x, y: node.y }));
    const splitLocal = fieldSemanticEdges(
      split.map((node, index) => ({
        key: `${node.family}:${index}`,
        family: node.family,
        label: node.family,
        x: node.x,
        y: node.y,
        ampX: 0,
        ampY: 0,
        freq: 0,
        phase: 0,
        kind: "foil" as const,
        size: 1,
      })),
      splitPoints,
      0.24,
    );
    const spans = fieldSpanEdges(split, splitPoints, splitLocal);
    expect(spans.length).toBeGreaterThan(0);
    expect(
      fieldTravelerInTransit({
        from: "a",
        to: "b",
        progress: 0.4,
        dwelling: 0,
      }),
    ).toBe(true);
    expect(
      fieldTravelerInTransit({
        from: "a",
        to: "a",
        progress: 0,
        dwelling: 0.4,
      }),
    ).toBe(false);
    expect(hexRgb("#C6A56A")).toEqual([198, 165, 106]);
  });

  it("walks the mesh with the lacquer mark and names the star it is on", () => {
    const nodes = [
      { key: "place:lisbon", family: "place" as const, label: "Lisbon" },
      { key: "tag:fado", family: "tag" as const, label: "fado" },
      { key: "tag:folk", family: "tag" as const, label: "folk" },
      { key: "cover:cover", family: "cover" as const, label: "cover" },
    ];
    const walk = fieldWalk(nodes, [
      ["tag:fado", "tag:folk"],
      ["tag:folk", "place:lisbon"],
    ]);
    expect(walk[0]).toBe("tag:fado");
    expect(new Set(walk)).toEqual(
      new Set(["tag:fado", "tag:folk", "place:lisbon", "cover:cover"]),
    );
    expect(fieldTourRank("tag")).toBeLessThan(fieldTourRank("place"));
    const dwell = fieldTravelerAt(walk, 0.2, 1, 0.5);
    expect(dwell?.visiting).toBe("tag:fado");
    const mid = fieldTravelerAt(walk, 0.9, 1, 0.5);
    expect(mid?.from).toBe("tag:fado");
    expect(mid?.to).toBe("tag:folk");
    expect(mid?.visiting).toBeNull();
    expect(fieldVisitLabel("tag", "fado")).toBe("fado");
    expect(fieldVisitLabel("cover", "cover")).toBeNull();
    expect(fieldVisitLabel("dispatch", "dispatch")).toBeNull();
    expect(
      fieldVisitLabel("fact", "This is a lofi cover of a Malayalam song"),
    ).toBeNull();
    expect(fieldVisitLabel("fact", "1958")).toBe("1958");
    expect(
      fieldWalk(
        nodes,
        [["tag:fado", "tag:folk"]],
        [["tag:fado", "ghost:star"]],
      ),
    ).not.toContain("ghost:star");
    expect(fieldStandingLabel("place", "Kerala")).toBe("Kerala");
    expect(fieldStandingLabel("track", "K.J. Yesudas")).toBe("K.J. Yesudas");
    expect(fieldStandingLabel("tag", "kollywood")).toBeNull();
    const moving = advanceFieldTraveler(
      { from: "tag:fado", to: "tag:folk", progress: 0.2, dwelling: 0 },
      walk,
      0.2,
      1,
      0.5,
    );
    expect(moving.from).toBe("tag:fado");
    expect(moving.to).toBe("tag:folk");
    expect(moving.progress).toBeGreaterThan(0.2);
  });

  it("writes lock lines from the live station, never an invented title", () => {
    const reading = theaterLockLines({
      city: "San Francisco",
      longitude: -122.4,
      bitrate: 128,
      codec: "mp3",
      phase: "reading",
    });
    expect(reading.join(" ")).toMatch(/122\.4°W/);
    expect(reading.join(" ")).toMatch(/128k · mp3/);
    expect(reading.join(" ")).toMatch(/live · in|cover · now/);
    expect(reading.join(" ")).not.toMatch(/Love Made Me Tough/);
    expect(reading.join(" ").toLowerCase()).not.toContain("icy");
    const locking = theaterLockLines({
      city: "San Francisco",
      longitude: -122.4,
      bitrate: 128,
      codec: "mp3",
      artist: "Chris Coco",
      title: "Love Made Me Tough",
      phase: "locking",
    });
    expect(locking.join(" ")).toMatch(/coco · tough/i);
    expect(locking).toContain(
      lockFingerprint(["Chris Coco", "Love Made Me Tough", "San Francisco"]),
    );
    expect(theaterLockLineAt(locking, 0)).toBe(locking[0]);
    expect(theaterLockLineAt(locking, 1800)).toBe(locking[1]);
    expect(theaterLockLive("locking")).toBe(true);
    expect(theaterLockLive("filed")).toBe(false);
    expect(theaterSkyLive("filed")).toBe(true);
    expect(theaterSkyLive("quiet")).toBe(false);
    expect(theaterWellAria("locking")).toMatch(/filing/i);
    expect(theaterWellAria("filed")).toBeUndefined();
    expect(formatBearing(0)).toBe("0°");
    expect(formatBearing(77.2)).toBe("77.2°E");
  });

  it("normalizes a knowledge graph and drops orphans, dangling edges, and extras", () => {
    const graph = normalizeTriviaGraph({
      nodes: [
        { id: "Raj Shekhar", label: "Raj Shekhar", kind: "person" },
        { id: "raj-shekhar", label: "Duplicate", kind: "person" },
        { id: "tum-ho-toh", label: "Tum Ho Toh", kind: "work" },
        { id: "orphan", label: "Lonely", kind: "place" },
        { id: "bad", label: "Vibe", kind: "mood" },
        { id: "azhar", label: "Azhar", kind: "film" },
      ],
      edges: [
        { from: "raj-shekhar", to: "tum-ho-toh", relation: "wrote" },
        { from: "tum-ho-toh", to: "missing", relation: "featured in" },
        { from: "raj-shekhar", to: "tum-ho-toh", relation: "wrote" },
        { from: "tum-ho-toh", to: "azhar", relation: "influenced the scene" },
        { from: "tum-ho-toh", to: "azhar", relation: "featured in" },
      ],
    });
    expect(graph.nodes.map((node) => node.id).sort()).toEqual([
      "azhar",
      "raj-shekhar",
      "tum-ho-toh",
    ]);
    expect(graph.edges).toEqual([
      {
        from: "raj-shekhar",
        to: "tum-ho-toh",
        relation: "wrote",
        verified: false,
      },
      {
        from: "tum-ho-toh",
        to: "azhar",
        relation: "featured in",
        verified: false,
      },
    ]);
    const flooded = normalizeTriviaGraph({
      nodes: Array.from({ length: 16 }, (_, index) => ({
        id: `n${index}`,
        label: `Node ${index}`,
        kind: "person",
      })),
      edges: Array.from({ length: 20 }, (_, index) => ({
        from: `n${index % 16}`,
        to: `n${(index + 1) % 16}`,
        relation: "wrote",
      })),
    });
    expect(flooded.nodes.length).toBeLessThanOrEqual(10);
    expect(flooded.edges.length).toBeLessThanOrEqual(14);
  });

  it("connects knowledge edges by identity, not proximity", () => {
    const nodes = [
      {
        key: "track:tum ho toh",
        refId: "tum-ho-toh",
        label: "Tum Ho Toh",
        x: 0.1,
        y: 0.1,
      },
      {
        key: "track:raj shekhar",
        refId: "raj-shekhar",
        label: "Raj Shekhar",
        x: 0.9,
        y: 0.9,
      },
      { key: "place:mumbai", refId: "mumbai", label: "Mumbai", x: 0.5, y: 0.5 },
    ];
    const edges = fieldKnowledgeEdges(nodes, [
      { from: "raj-shekhar", to: "tum-ho-toh", relation: "wrote" },
    ]);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({ i: 0, j: 1, relation: "wrote" });
    expect(edges[0]!.strength).toBeGreaterThan(0.8);
    expect(
      fieldKnowledgeEdges(nodes, [
        { from: "raj-shekhar", to: "missing-title", relation: "wrote" },
      ]),
    ).toEqual([]);
  });

  it("never walks a hop that has no knowledge, semantic, or span thread", () => {
    const stub = (
      key: string,
      family: "language" | "track" | "place" | "cover",
      x: number,
      y: number,
    ) => ({
      key,
      family,
      label: key.split(":")[1] ?? key,
      x,
      y,
      ampX: 0,
      ampY: 0,
      freq: 0,
      phase: 0,
      kind: "foil" as const,
      size: 1,
      refId: key.split(":")[1],
    });
    const nodes = [
      stub("language:hindi", "language", 0.12, 0.4),
      stub("track:mirchi", "track", 0.88, 0.28),
      stub("place:india", "place", 0.84, 0.18),
      stub("cover:cover", "cover", 0.2, 0.82),
    ];
    const points = nodes.map((node) => ({ x: node.x, y: node.y }));
    const local = fieldSemanticEdges(nodes, points, 0.24);
    const knowledge = fieldKnowledgeEdges(nodes, [
      { from: "ghost", to: "nobody", relation: "wrote" },
    ]);
    expect(knowledge).toHaveLength(0);
    const spans = fieldSpanEdges(nodes, points, local);
    const pairs = [...local, ...spans].map(
      (edge) => [nodes[edge.i]!.key, nodes[edge.j]!.key] as [string, string],
    );
    const preferred = knowledge.map(
      (edge) => [nodes[edge.i]!.key, nodes[edge.j]!.key] as [string, string],
    );
    const walk = fieldWalk(nodes, pairs, preferred);
    const tour = fieldTourSpans(walk, nodes, [...pairs, ...preferred]);
    const drawn = new Set(
      [
        ...pairs,
        ...preferred,
        ...tour.map(
          (edge) =>
            [nodes[edge.i]!.key, nodes[edge.j]!.key] as [string, string],
        ),
      ].map(([left, right]) => [left, right].sort().join("\0")),
    );
    expect(walk.length).toBeGreaterThan(1);
    expect(new Set(walk)).toEqual(new Set(nodes.map((node) => node.key)));
    for (let index = 0; index < walk.length - 1; index += 1) {
      const left = walk[index]!;
      const right = walk[index + 1]!;
      if (left === right) continue;
      expect(drawn.has([left, right].sort().join("\0"))).toBe(true);
    }
  });

  it("keeps existing homes when a deepening ring adds stars", () => {
    const seed = lockSeed(["mirchi", "Mumbai"]);
    const firstGraph = {
      nodes: [
        { id: "tum-ho-toh", label: "Tum Ho Toh", kind: "work" as const },
        { id: "raj-shekhar", label: "Raj Shekhar", kind: "person" as const },
      ],
      edges: [{ from: "raj-shekhar", to: "tum-ho-toh", relation: "wrote" }],
    };
    const first = theaterReleases({
      city: "Mumbai",
      title: "Tum Ho Toh",
      graph: firstGraph,
    });
    const firstHomes = fieldNodesFromReleases(first, seed);
    const city = firstHomes.find((node) => node.key === "place:mumbai");
    const writer = firstHomes.find((node) => node.key === "track:raj shekhar");
    const second = theaterReleases({
      city: "Mumbai",
      title: "Tum Ho Toh",
      graph: mergeTriviaGraphs(firstGraph, {
        nodes: [
          { id: "azhar", label: "Azhar", kind: "film" },
          { id: "tum-ho-toh", label: "Tum Ho Toh", kind: "work" },
        ],
        edges: [{ from: "tum-ho-toh", to: "azhar", relation: "featured in" }],
      }),
    });
    const later = fieldNodesFromReleases(second, seed);
    expect(later.find((node) => node.key === "place:mumbai")?.x).toBe(city?.x);
    expect(later.find((node) => node.key === "track:raj shekhar")?.y).toBe(
      writer?.y,
    );
    expect(later.some((node) => node.label === "Azhar")).toBe(true);
  });

  it("turns MusicBrainz relations into verified edges and never invents", () => {
    const graph = graphFromMusicBrainzRelations({
      title: "Tum Ho Toh",
      artist: "Palak Muchhal",
      relations: [
        { type: "lyricist", artist: { name: "Raj Shekhar" } },
        { type: "composer", artist: { name: "Amaal Mallik" } },
        { type: "vibe", artist: { name: "Someone" } },
      ],
    });
    expect(graph.edges.every((edge) => edge.verified)).toBe(true);
    expect(graph.edges.some((edge) => edge.relation === "wrote")).toBe(true);
    expect(graph.edges.some((edge) => edge.relation === "composed")).toBe(true);
    expect(graph.nodes.some((node) => node.label === "Someone")).toBe(false);
  });

  it("seeds the same dust, nebula, and meteor for a station", () => {
    const seed = lockSeed(["station-sky", "Lisbon"]);
    expect(fieldDust(seed)).toEqual(fieldDust(seed));
    expect(fieldDust(seed).length).toBeGreaterThanOrEqual(170);
    expect(fieldDust(seed).length).toBeLessThanOrEqual(230);
    expect(
      fieldDust(seed).every((grain) =>
        ["bone", "foil", "ether"].includes(grain.tint),
      ),
    ).toBe(true);
    expect(fieldMilkyWay(seed)).toEqual(fieldMilkyWay(seed));
    expect(fieldMilkyWay(seed)).not.toEqual(fieldMilkyWay(seed + 1));
    expect(fieldDust(seed)).not.toEqual(fieldDust(seed + 1));
    expect(fieldNebulae(seed)).toEqual(fieldNebulae(seed));
    expect(fieldShootingStar(seed, 12)).toEqual(fieldShootingStar(seed, 12));
    expect(fieldShootingStar(seed, 200, { reduced: true })).toBeNull();
    expect(fieldShootingStar(seed, 200, { live: false })).toBeNull();
    expect(fieldStarTwinkle(1, 0.5, 0, true)).toBe(1);
    expect(fieldDustTwinkle(1, 0.5, 0, true)).toBe(1);
    expect(fieldBirthRipple(120, true)).toBeNull();
    expect(fieldBirthBloom(0, false)).toBeCloseTo(1.6);
    expect(fieldBirthBloom(600, false)).toBe(1);
  });

  it("pulses the knowledge edges once when the graph lands, then settles", () => {
    expect(fieldGraphPulse(null, false)).toBe(0);
    expect(fieldGraphPulse(-5, false)).toBe(0);
    expect(fieldGraphPulse(0, false)).toBe(0);
    // Quick attack to full foil at ~18% of the window...
    expect(fieldGraphPulse(GRAPH_PULSE_MS * 0.18, false)).toBeCloseTo(1);
    // ...then a long quadratic settle back to rest.
    expect(fieldGraphPulse(GRAPH_PULSE_MS * 0.5, false)).toBeGreaterThan(0);
    expect(fieldGraphPulse(GRAPH_PULSE_MS * 0.5, false)).toBeLessThan(1);
    expect(fieldGraphPulse(GRAPH_PULSE_MS, false)).toBe(0);
    // Reduced motion never pulses.
    expect(fieldGraphPulse(GRAPH_PULSE_MS * 0.18, true)).toBe(0);
  });

  it("keeps the theater back link out of the growing room and reads the dock poller", () => {
    const listen = readFileSync(
      new URL("../../app/routes/listen.tsx", import.meta.url),
      "utf8",
    );
    const dock = readFileSync(
      new URL("../../app/components/PlayerDock.tsx", import.meta.url),
      "utf8",
    );
    const siteBar = readFileSync(
      new URL("../../app/components/SiteBar.tsx", import.meta.url),
      "utf8",
    );
    const home = readFileSync(
      new URL("../../app/routes/_index.tsx", import.meta.url),
      "utf8",
    );
    expect(listen).not.toContain("TheaterSeek");
    expect(listen).not.toContain("ew-theater-back");
    expect(siteBar).toContain("TheaterSeek");
    expect(siteBar).not.toContain("SiteSeekRail");
    expect(home).toContain("SiteSeekRail");
    const siteSeek = readFileSync(
      new URL("../../app/components/radio-passport/SiteSeek.tsx", import.meta.url),
      "utf8",
    );
    expect(siteSeek).toContain("useSyncExternalStore");
    expect(siteSeek).not.toMatch(/from "react-dom"/);
    expect(listen).toContain("ew-theater-sky");
    expect(listen).toContain("ew-theater-folio");
    expect(listen).toContain("TheaterField");
    expect(listen).toContain("theaterReleases");
    const well = readFileSync(
      new URL(
        "../../app/components/radio-passport/TheaterWell.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    expect(well).toContain("const showCover = icy || showPlate");
    expect(well).toContain("theaterSkyLive");
    expect(well).toContain(
      "drawBoardSky(context, width, height, palette, dustRef.current)",
    );
    expect(well).not.toContain('matchMedia("(max-width: 960px)")');
    expect(well).toContain("wakingIds");
    expect(well).toContain("fieldStandingLabel");
    const nodes = readFileSync(
      new URL(
        "../../app/components/radio-passport/knowledge/TheaterNodes.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    expect(nodes).toContain("wakingIds");
    expect(nodes).toContain('data-motion={reducedMotion || !waking ? "still" : "wake"}');
    expect(well).toContain("fieldSpanEdges");
    expect(well).toContain("fieldTourSpans");
    expect(well).toContain("fieldTravelerInTransit");
    expect(well).toContain("fieldShootingStar");
    expect(well).toContain("fieldMilkyWay");
    expect(listen).toContain('from "~/components/radio-passport/TheaterWell"');
    expect(listen).not.toContain("useNowPlayingMetadata(");
    expect(listen).toContain("useRoomStore");
    expect(listen).not.toContain("useTrackTrivia(");
    expect(listen).toContain("graph:");
    expect(dock).toContain("useRoom(");
    const roomHook = readFileSync(
      new URL("../../app/hooks/useRoom.ts", import.meta.url),
      "utf8",
    );
    // The enrichment pipeline is exactly two requests: free, then one
    // evidence-grounded ai call. No deepen pass exists anywhere client-side.
    expect(roomHook).not.toContain("ai-deepen");
    expect(roomHook).not.toContain("DEEPEN_AFTER_MS");
    expect(roomHook).toContain('source: "free"');
    expect(roomHook).toContain('source: "ai"');
    expect(roomHook).toContain("links:");
    expect(well).toContain("fieldKnowledgeEdges");
    expect(well).toContain("fieldDust");
    expect(listen).toContain("focusId");
    expect(listen).toContain("Follow this star");
    expect(listen).toContain("catalog=");
    expect(listen).toContain("TheaterTransport");
    expect(listen).toContain("UpNextRow");
    const transport = readFileSync(
      new URL(
        "../../app/components/radio-passport/TheaterTransport.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    // Both stamped rings are the emblem: thin foil ring, lacquer heart.
    expect(transport).toContain("ew-theater-ring-dot");
    expect(transport).not.toContain('"EW"');
    expect(dock).toContain("ew-stamp-ring-dot");
    // Pause must freeze the folio on the last aired title, never collapse it.
    expect(listen).toContain("lastTrackRef");
    expect(listen).toContain("displayTrack");
    expect(listen).toContain("lastTrackByStation");
    expect(listen).toContain("LAST_TRACK_FRESH_MS");
    expect(listen).toContain('"Paused"');
    expect(listen).toContain("TheaterQueue");
    expect(well).toContain("No title on the air yet");
    expect(well).toContain("Reading the live title");
    expect(well).toContain("MusicBrainz · verified relations");
    expect(well).toContain("meridianDomain");
    expect(well).not.toContain("skeleton");
    expect(well).not.toContain("spinner");
    expect(well).toContain("fieldBirthRipple");
    expect(home).not.toContain("useNowPlayingMetadata(");
    expect(home).toContain("useRoomStore");
    expect(home).not.toContain("useTrackTrivia(");
    expect(home).toContain("GalaxyBackdrop");
    expect(listen).not.toContain("theaterSkyShrink");
    expect(listen).toContain("data-beat");
    expect(listen).toContain("theaterBeat");
    expect(listen).not.toContain("key={trackLine}");
    const stylesheet = readFileSync(
      new URL("../../app/tailwind.css", import.meta.url),
      "utf8",
    );
    expect(stylesheet).toContain(".ew-galaxy");
    expect(stylesheet).toContain("--ew-theater-sky");
    expect(stylesheet).toContain("grid-template-rows: var(--ew-theater-sky, 236px) minmax(0, 1fr)");
    expect(stylesheet).toContain(".ew-plate-caption");
    expect(stylesheet).toContain(".ew-theater-folio.is-star .ew-letter-phone");
    expect(stylesheet).toContain(".ew-known.is-collapsed");
    expect(stylesheet).toContain(".ew-stamp-ring-dot");
    expect(stylesheet).toContain(".ew-theater-ring-dot");
    expect(stylesheet).not.toMatch(/\.ew-known,\s*\.ew-waiting/);
    expect(listen).toContain("deskSigned");
    expect(well).toContain("The desk found");
    expect(stylesheet).not.toContain('.ew-theater[data-beat="filed"]');
    expect(stylesheet).not.toContain('--ew-theater-sky: 96px');
    expect(stylesheet).not.toContain("--ew-sky-shrink");
    expect(stylesheet).not.toContain("--ew-sky-fold");
    expect(stylesheet).toContain(".ew-letter-more");
    expect(stylesheet).toMatch(
      /\.ew-letter:not\(\.is-open\) \.ew-caption[\s\S]*?-webkit-line-clamp:\s*4/,
    );
    expect(well).toContain("TheaterLetter");
    expect(well).toContain('"more"');
  });
});

describe("semantic figure", () => {
  const FIGURE_GRAPH: TriviaGraph = {
    nodes: [
      { id: "tum-ho-toh", label: "Tum Ho Toh", kind: "work" },
      { id: "raj", label: "Raj", kind: "person" },
      { id: "asha", label: "Asha", kind: "person" },
      { id: "goa", label: "Goa", kind: "place" },
      { id: "monsoon", label: "Monsoon", kind: "event" },
      { id: "downtempo", label: "Downtempo", kind: "genre" },
    ],
    edges: [
      {
        from: "raj",
        to: "tum-ho-toh",
        relation: "wrote",
        verified: true,
        provenance: "musicbrainz",
      },
      {
        from: "asha",
        to: "tum-ho-toh",
        relation: "sang",
        verified: true,
        provenance: "musicbrainz",
      },
      {
        from: "downtempo",
        to: "tum-ho-toh",
        relation: "genre of",
        verified: true,
        provenance: "musicbrainz",
      },
      {
        from: "tum-ho-toh",
        to: "goa",
        relation: "recorded in",
        sourceUrl: "https://en.wikipedia.org/wiki/Tum_Ho_Toh",
        provenance: "web",
      },
      {
        from: "monsoon",
        to: "goa",
        relation: "flooded",
        sourceUrl: "https://en.wikipedia.org/wiki/Tum_Ho_Toh",
        provenance: "web",
      },
    ],
  };

  const SPARSE_GRAPH = {
    nodes: [{ id: "lonely", label: "Lonely", kind: "place" as const }],
    edges: [],
  } satisfies TriviaGraph;

  function figureNodes(seed = 4242) {
    return fieldNodesFromReleases(
      theaterReleases({
        city: "Goa",
        country: "India",
        languages: ["Hindi"],
        tags: ["Downtempo", "Bollywood"],
        artist: "Raj",
        title: "Tum Ho Toh",
        facts: [{ label: "Year", value: "2007" }],
        graph: FIGURE_GRAPH,
      }),
      seed,
      longitudeHomeX(74),
    );
  }

  function nodeFor(nodes: ReturnType<typeof figureNodes>, refId: string) {
    const node = nodes.find((entry) => entry.refId === refId);
    expect(node, `expected a figure star for ${refId}`).toBeTruthy();
    return node!;
  }

  it("exports a single structure duration constant inside one breath", () => {
    expect(FIELD_STRUCTURE_MS).toBeGreaterThan(600);
    expect(FIELD_STRUCTURE_MS).toBeLessThanOrEqual(1600);
  });

  it("resolves the exact focus star first, then the busiest survivor, then nothing", () => {
    const nodes = figureNodes();
    expect(fieldResolveFocus(nodes, FIGURE_GRAPH, null)).toBe(
      nodeFor(nodes, "tum-ho-toh").key,
    );
    // An explicit focusId wins when it names a visible graph star.
    expect(fieldResolveFocus(nodes, FIGURE_GRAPH, "tum-ho-toh")).toBe(
      nodeFor(nodes, "tum-ho-toh").key,
    );

    const fallbackGraph: TriviaGraph = {
      nodes: [
        { id: "asha", label: "Asha", kind: "person" },
        { id: "goa", label: "Goa", kind: "place" },
        { id: "monsoon", label: "Monsoon", kind: "event" },
      ],
      edges: [
        { from: "asha", to: "goa", relation: "sang in", verified: true },
        { from: "monsoon", to: "goa", relation: "flooded", provenance: "web" },
      ],
    };
    expect(fieldResolveFocus(nodes, fallbackGraph, null)).toBe(
      nodeFor(nodes, "goa").key,
    );
    // Same inputs, same answer — no ambient wobble in the choice.
    expect(fieldResolveFocus(nodes, fallbackGraph, null)).toBe(
      fieldResolveFocus(nodes, fallbackGraph, null),
    );

    expect(fieldResolveFocus(nodes, SPARSE_GRAPH, null)).toBeNull();
    expect(fieldResolveFocus([], SPARSE_GRAPH, null)).toBeNull();
  });

  it("refuses to structure sparse graphs but accepts the connected figure", () => {
    const nodes = figureNodes();
    expect(fieldStructureReady(nodes, SPARSE_GRAPH)).toBe(false);
    expect(fieldStructureReady(nodes, null)).toBe(false);
    expect(fieldStructuredTargets(nodes, SPARSE_GRAPH)).toEqual(new Map());
    expect(fieldStructuredTargets(nodes, FIGURE_GRAPH).size).toBeGreaterThan(0);
    expect(fieldStructureReady(nodes, FIGURE_GRAPH)).toBe(true);
  });

  it("accepts any connected component of three stars with two drawable edges", () => {
    // A minimal honest figure: track — artist, track — year. Under the old
    // focus-neighbour rule this refused to morph; the contract says it must.
    const trio: TriviaGraph = {
      nodes: [
        { id: "song", label: "Song", kind: "work" },
        { id: "singer", label: "Singer", kind: "person" },
        { id: "1999", label: "1999", kind: "year" },
      ],
      edges: [
        { from: "singer", to: "song", relation: "sang", verified: true },
        { from: "song", to: "1999", relation: "released in", verified: true },
      ],
    };
    const trioNodes = fieldNodesFromReleases(
      theaterReleases({
        city: "Goa",
        country: "India",
        languages: ["Hindi"],
        tags: [],
        artist: "Singer",
        title: "Song",
        facts: [{ label: "Year", value: "1999" }],
        graph: trio,
      }),
      4242,
      longitudeHomeX(74),
    );
    expect(fieldStructureReady(trioNodes, trio)).toBe(true);
    expect(fieldStructuredTargets(trioNodes, trio).size).toBe(3);

    // Two stars one edge is still just a pair, not a figure.
    const duo: TriviaGraph = {
      nodes: [
        { id: "song", label: "Song", kind: "work" },
        { id: "singer", label: "Singer", kind: "person" },
      ],
      edges: [
        { from: "singer", to: "song", relation: "sang", verified: true },
      ],
    };
    const duoNodes = fieldNodesFromReleases(
      theaterReleases({
        city: "Goa",
        country: "India",
        languages: ["Hindi"],
        tags: [],
        artist: "Singer",
        title: "Song",
        facts: [],
        graph: duo,
      }),
      4242,
      longitudeHomeX(74),
    );
    expect(fieldStructureReady(duoNodes, duo)).toBe(false);

    // Three stars but a dangling single edge never forms a figure either.
    const dangler: TriviaGraph = {
      nodes: [
        { id: "a", label: "A", kind: "work" },
        { id: "b", label: "B", kind: "person" },
        { id: "c", label: "C", kind: "place" },
      ],
      edges: [{ from: "b", to: "a", relation: "sang", verified: true }],
    };
    expect(
      fieldStructureReady(
        fieldNodesFromReleases(
          theaterReleases({
            city: "Goa",
            country: "India",
            languages: ["Hindi"],
            tags: [],
            artist: "B",
            title: "A",
            facts: [],
            graph: dangler,
          }),
          4242,
          longitudeHomeX(74),
        ),
        dangler,
      ),
    ).toBe(false);
  });

  it("builds verified nodes from MusicBrainz catalog facts", () => {
    const graph = graphFromMusicBrainzRelations({
      title: "Un Tipo Como Yo",
      artist: "Sergio Esquivel",
      catalog: {
        album: "16 Grandes Exitos",
        year: "1979",
        origin: "Venezuela",
        styles: ["balada"],
      },
      relations: [],
    });
    const ids = new Set(graph.nodes.map((node) => node.id));
    expect(ids).toContain("un-tipo-como-yo");
    expect(ids).toContain("sergio-esquivel");
    expect(ids).toContain("1979");
    expect(ids).toContain("venezuela");
    expect(ids).toContain("balada");
    for (const edge of graph.edges) {
      expect(edge.verified).toBe(true);
    }
    const relations = graph.edges.map((edge) => edge.relation);
    expect(relations).toContain("performed");
    expect(relations).toContain("appears on");
    expect(relations).toContain("released in");
    expect(relations).toContain("from");
    expect(relations).toContain("tagged");

    // A self-titled single is one star, not an edge to itself.
    const selfTitled = graphFromMusicBrainzRelations({
      title: "Saree",
      artist: "Sanju Rathod",
      catalog: { album: "Saree", year: "2025", origin: null, styles: [] },
      relations: [],
    });
    expect(
      selfTitled.edges.some((edge) => edge.relation === "appears on"),
    ).toBe(false);
  });

  it("centers the focus and rings first hops inside second hops by kind sectors", () => {
    const nodes = figureNodes();
    const targets = fieldStructuredTargets(nodes, FIGURE_GRAPH);

    const trackTarget = targets.get(nodeFor(nodes, "tum-ho-toh").key)!;
    expect(trackTarget.x).toBeCloseTo(0.5, 5);
    expect(trackTarget.y).toBeCloseTo(0.5, 5);

    const radiusOf = (refId: string) => {
      const point = targets.get(nodeFor(nodes, refId).key)!;
      return Math.hypot(point.x - 0.5, (point.y - 0.5) / 0.62);
    };
    for (const hopOne of ["raj", "asha", "downtempo", "goa"]) {
      expect(radiusOf(hopOne)).toBeGreaterThan(0.1);
      expect(radiusOf(hopOne)).toBeLessThan(0.24);
    }
    expect(radiusOf("monsoon")).toBeGreaterThan(0.26);

    const sectorOf = (refId: string) => {
      const point = targets.get(nodeFor(nodes, refId).key)!;
      return { dx: point.x - 0.5, dy: point.y - 0.5 };
    };
    // People sit left of centre; genres and events lower-right;
    // places lower-left. Jitter never flips a sector.
    expect(sectorOf("raj").dx).toBeLessThan(0);
    expect(sectorOf("raj").dy).toBeLessThan(0);
    expect(sectorOf("asha").dx).toBeLessThan(0);
    expect(sectorOf("asha").dy).toBeLessThan(0);
    expect(sectorOf("downtempo").dx).toBeGreaterThan(0);
    expect(sectorOf("downtempo").dy).toBeGreaterThanOrEqual(0);
    expect(sectorOf("monsoon").dx).toBeGreaterThan(0);
    expect(sectorOf("monsoon").dy).toBeGreaterThan(0);
    expect(sectorOf("goa").dx).toBeLessThan(0);
    expect(sectorOf("goa").dy).toBeGreaterThan(0);
  });

  it("is deterministic and addition-stable through the previous map", () => {
    const nodes = figureNodes();
    const first = fieldStructuredTargets(nodes, FIGURE_GRAPH);
    const second = fieldStructuredTargets(nodes, FIGURE_GRAPH);
    expect([...first.entries()]).toEqual([...second.entries()]);

    const extended: TriviaGraph = {
      nodes: [
        ...FIGURE_GRAPH.nodes,
        { id: "monsoon-two", label: "Monsoon Two", kind: "event" },
      ],
      edges: [
        ...FIGURE_GRAPH.edges,
        {
          from: "monsoon-two",
          to: "goa",
          relation: "soaked",
          provenance: "web",
        },
      ],
    };
    const extendedNodes = fieldNodesFromReleases(
      theaterReleases({
        city: "Goa",
        country: "India",
        languages: ["Hindi"],
        tags: ["Downtempo", "Bollywood"],
        artist: "Raj",
        title: "Tum Ho Toh",
        facts: [{ label: "Year", value: "2007" }],
        graph: extended,
      }),
      4242,
      longitudeHomeX(74),
    );
    const stable = fieldStructuredTargets(extendedNodes, extended, first);
    for (const [key, point] of first) {
      expect(stable.get(key)).toEqual(point);
    }
    expect(stable.size).toBe(first.size + 1);
  });

  it("leaves unconnected metadata stars at their seeded homes", () => {
    const nodes = figureNodes();
    const homes = new Map(nodes.map((node) => [node.key, node]));
    const targets = fieldStructuredTargets(nodes, FIGURE_GRAPH);
    const untouched = nodes.filter((node) => !targets.has(node.key));
    expect(untouched.length).toBeGreaterThan(3);
    for (const node of untouched) {
      expect(targets.has(node.key)).toBe(false);
      expect(homes.get(node.key)?.x).toBe(node.x);
    }
  });

  it("clamps progress between zero and one and finishes instantly under reduced motion", () => {
    expect(fieldStructureProgress(-5000, false)).toBe(0);
    expect(fieldStructureProgress(FIELD_STRUCTURE_MS / 2, false)).toBeGreaterThan(0);
    expect(fieldStructureProgress(FIELD_STRUCTURE_MS / 2, false)).toBeLessThan(1);
    expect(fieldStructureProgress(FIELD_STRUCTURE_MS * 10, false)).toBe(1);
    expect(fieldStructureProgress(123, true)).toBe(1);
    expect(fieldStructureProgress(-123, true)).toBe(1);
  });

  it("ranks verified knowledge threads above web threads and carries provenance", () => {
    const nodes = figureNodes();
    const edges = fieldKnowledgeEdges(nodes, FIGURE_GRAPH.edges);
    expect(edges.length).toBe(FIGURE_GRAPH.edges.length);
    for (const edge of edges) {
      expect(edge.strength).toBeGreaterThan(0.6);
    }
    const verified = edges.filter((edge) => edge.provenance === "musicbrainz");
    const web = edges.filter((edge) => edge.provenance === "web");
    expect(verified).toHaveLength(3);
    expect(web).toHaveLength(2);
    for (const edge of verified) {
      expect(edge.strength).toBeGreaterThan(0.8);
    }
    for (const edge of web) {
      expect(edge.sourceUrl).toMatch(/^https:\/\/en\.wikipedia\.org\//);
      expect(edge.strength).toBeLessThan(
        Math.min(...verified.map((entry) => entry.strength)),
      );
    }
  });
});
