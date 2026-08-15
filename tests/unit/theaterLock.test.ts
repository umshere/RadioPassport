import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  TAG_RELEASE_CAP,
  fieldDensity,
  fieldEdges,
  fieldFamiliesConnect,
  fieldNodesFromReleases,
  fieldPoint,
  advanceFieldTraveler,
  fieldSemanticEdges,
  fieldSpanEdges,
  fieldTourRank,
  fieldTravelerInTransit,
  fieldTravelerAt,
  fieldStandingLabel,
  fieldVisitLabel,
  fieldWalk,
  fieldTriangles,
  formatBearing,
  hexRgb,
  lockFingerprint,
  lockSeed,
  longitudeHomeX,
  splitFieldTokens,
  theaterLockLineAt,
  theaterLockLines,
  theaterLockLive,
  theaterSkyLive,
  theaterPhase,
  theaterReleases,
  theaterTrackCopy,
  theaterWellAria,
} from "~/components/radio-passport/theaterLock";

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
    expect(rich.filter((item) => item.family === "track").map((item) => item.label)).toEqual([
      "Chris Coco",
      "Love Made Me Tough",
    ]);
    expect(rich.filter((item) => item.family === "fact")).toHaveLength(2);
    expect(
      rich.filter((item) => item.family === "fact").map((item) => item.label),
    ).toEqual(["2007", "Stay"]);
    expect(rich.some((item) => item.family === "cover")).toBe(true);
    const manyTags = theaterReleases({
      tags: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"],
    });
    expect(manyTags.filter((item) => item.family === "tag")).toHaveLength(TAG_RELEASE_CAP);
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
    const cityLater = afterTrack.find((node) => node.key === "place:san francisco");
    expect(city?.x).toBe(cityLater?.x);
    expect(city?.y).toBe(cityLater?.y);
    expect(fieldPoint(west[0]!, 0, 0)).toEqual(fieldPoint(west[0]!, 1.25, 0));
    expect(fieldPoint(west[0]!, 1.25, 1).x).not.toBe(west[0]!.x);
    expect(fieldFamiliesConnect("tag", "fact")).toBe(true);
    expect(fieldFamiliesConnect("place", "fact")).toBe(false);
    expect(fieldDensity("filed").glow).toBeLessThan(fieldDensity("locking").glow);
    expect(fieldDensity("filed").glow).toBeGreaterThan(fieldDensity("reading").glow);
    expect(fieldDensity("filed").drift).toBeGreaterThan(0.2);
    const cluster = [
      { x: 0.2, y: 0.2 },
      { x: 0.22, y: 0.21 },
      { x: 0.21, y: 0.23 },
      { x: 0.8, y: 0.8 },
    ];
    expect(fieldEdges(cluster, 0.06).length).toBe(3);
    expect(fieldTriangles(cluster, 0.06)).toHaveLength(1);
    expect(
      fieldSemanticEdges(west, west.map((node) => ({ x: node.x, y: node.y })), 0.4).length,
    ).toBeGreaterThan(0);
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
    expect(fieldTravelerInTransit({ from: "a", to: "b", progress: 0.4, dwelling: 0 })).toBe(
      true,
    );
    expect(fieldTravelerInTransit({ from: "a", to: "a", progress: 0, dwelling: 0.4 })).toBe(
      false,
    );
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
    expect(new Set(walk)).toEqual(new Set(["tag:fado", "tag:folk", "place:lisbon", "cover:cover"]));
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
    expect(fieldVisitLabel("fact", "This is a lofi cover of a Malayalam song")).toBeNull();
    expect(fieldVisitLabel("fact", "1958")).toBe("1958");
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
    expect(locking).toContain(lockFingerprint(["Chris Coco", "Love Made Me Tough", "San Francisco"]));
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

  it("keeps the theater back link out of the growing room and reads the dock poller", () => {
    const listen = readFileSync(
      new URL("../../app/routes/listen.tsx", import.meta.url),
      "utf8",
    );
    const dock = readFileSync(
      new URL("../../app/components/PlayerDock.tsx", import.meta.url),
      "utf8",
    );
    expect(listen).toContain("ew-theater-back");
    expect(listen).toContain("ew-theater-sky");
    expect(listen).toContain("ew-theater-folio");
    expect(listen).toContain("TheaterField");
    expect(listen).toContain("theaterReleases");
    const well = readFileSync(
      new URL("../../app/components/radio-passport/TheaterWell.tsx", import.meta.url),
      "utf8",
    );
    expect(well).toContain("theaterSkyLive");
    expect(well).toContain("fieldStandingLabel");
    expect(well).toContain("fieldSpanEdges");
    expect(well).toContain("fieldTravelerInTransit");
    expect(listen).toContain('from "~/components/radio-passport/TheaterWell"');
    expect(listen).not.toContain("useNowPlayingMetadata(");
    expect(listen).toContain("useRoomStore");
    expect(listen).not.toContain("useTrackTrivia(");
    expect(dock).toContain("useRoom(");
    const home = readFileSync(
      new URL("../../app/routes/_index.tsx", import.meta.url),
      "utf8",
    );
    expect(home).not.toContain("useNowPlayingMetadata(");
    expect(home).toContain("useRoomStore");
    expect(home).not.toContain("useTrackTrivia(");
  });
});
