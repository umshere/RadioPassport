import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fieldDust, fieldDustTwinkle, fieldMilkyWay, fieldNebulae, fieldShootingStar, graphFromMusicBrainzRelations, hexRgb, lockSeed, mergeTriviaGraphs, normalizeTriviaGraph, theaterPhase, theaterTrackCopy, theaterWellAria } from "~/components/radio-passport/theaterLock";
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

});
