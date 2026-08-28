import { describe, expect, it, vi } from "vitest";
import {
  ATLAS_MAX_NODES,
  buildAtlasView,
} from "~/services/atlas/atlasGraph.server";
import type { RadioBrowserCatalogSnapshot } from "~/services/radioBrowser/catalogSnapshot";
import type { AtlasView } from "~/types/atlas";
import type { Country, Station } from "~/types/radio";

/**
 * Atlas slice-1 data gate (docs/ATLAS_HANDOFF.md): snapshot derivation only —
 * the catalog snapshot module is the single network seam and is mocked out;
 * everything under test is pure derivation over that fixture.
 */

function pad(index: number): string {
  return String(index).padStart(2, "0");
}

function makeStation(
  overrides: Partial<Station> & Pick<Station, "uuid" | "name">
): Station {
  return {
    url: `https://stream.example/${overrides.uuid}`,
    streamUrl: `https://stream.example/${overrides.uuid}`,
    favicon: "",
    country: "India",
    countryCode: "IN",
    state: null,
    language: null,
    tags: null,
    bitrate: 0,
    codec: "AAC",
    ...overrides,
  };
}

const HINDI_STATION_COUNT = 65;

function buildFixtureSnapshot(): RadioBrowserCatalogSnapshot {
  const hindiStations = Array.from({ length: HINDI_STATION_COUNT }, (_, i) =>
    makeStation({
      uuid: `in-hindi-${pad(i)}`,
      name: `Hindi FM ${pad(i)}`,
      // Strictly descending bitrate → busiest order is the index order.
      bitrate: 200 - i,
      language: "Hindi",
      languageCodes: ["hi"],
      ...(i === 0
        ? {
            favicon: "https://cdn.example/hindi00.png",
            tags: "Bollywood, bollywood, Pop Music, , news",
            tagList: [
              "Bollywood",
              "bollywood", // duplicate of the first, different case
              "Pop Music",
              "", // empty entries never become nodes
              "news",
              "talk",
              "classical",
              "ghazal",
              "seventh", // past the six-tag cap
            ],
          }
        : {}),
    })
  );

  const tamilStations = [0, 1, 2, 3].map((i) =>
    makeStation({
      uuid: `in-tamil-${i}`,
      name: `Tamil One ${i}`,
      bitrate: 110 - i,
      language: "Tamil",
      languageCodes: ["ta"],
    })
  );

  // No languageCodes: proves the slug-of-language fallback path.
  const sanskritStation = makeStation({
    uuid: "in-sanskrit-a",
    name: "Sanskrit Radio",
    bitrate: 90,
    language: "Sanskrit",
  });

  const spanishStations = [0, 1, 2].map((i) =>
    makeStation({
      uuid: `es-spanish-${i}`,
      name: `Radio Español ${i}`,
      country: "Spain",
      countryCode: "ES",
      bitrate: 120 - i,
      language: "Spanish",
      languageCodes: ["es"],
    })
  );

  return {
    fetchedAt: "2026-07-14T05:00:00.000Z",
    stations: [...hindiStations, ...tamilStations, sanskritStation, ...spanishStations],
    countries: [
      { name: "India", iso_3166_1: "IN", stationcount: 70 },
      { name: "Spain", iso_3166_1: "ES", stationcount: 3 },
    ],
    languages: [
      { name: "Hindi", stationcount: 65 },
      { name: "Tamil", stationcount: 4 },
      { name: "Spanish", stationcount: 3 },
      { name: "Sanskrit", stationcount: 1 },
    ],
    tags: [],
  };
}

// The "mock" prefix is what lets the hoisted factory read this binding.
const mockSnapshot = buildFixtureSnapshot();

vi.mock("~/services/radioBrowser/catalogSnapshot", () => ({
  fetchRadioBrowserCatalogSnapshot: vi.fn(async () => mockSnapshot),
}));

async function loadRoute() {
  vi.resetModules();
  const route = await import("~/routes/api.atlas.expand");
  return route.loader;
}

function atlasRequest(kind?: string | null, id?: string | null): Request {
  const params = new URLSearchParams();
  if (kind != null) params.set("kind", kind);
  if (id != null) params.set("id", id);
  const query = params.toString();
  return new Request(
    `http://localhost/api/atlas/expand${query ? `?${query}` : ""}`
  );
}

async function expand(
  kind?: string | null,
  id?: string | null
): Promise<Response> {
  const loader = await loadRoute();
  return loader({ request: atlasRequest(kind, id), context: {}, params: {} });
}

async function viewOf(
  kind?: string | null,
  id?: string | null
): Promise<AtlasView> {
  const response = await expand(kind, id);
  expect(response.status).toBe(200);
  return (await response.json()) as AtlasView;
}

function nodeIds(view: AtlasView): Set<string> {
  return new Set(view.graph.nodes.map((node) => node.id));
}

/** Every edge must land on nodes the client can actually see. */
function edgesLandOnVisibleNodes(view: AtlasView): boolean {
  const ids = nodeIds(view);
  return view.graph.edges.every((edge) => ids.has(edge.from) && ids.has(edge.to));
}

describe("atlas expand route", () => {
  it("centres a country with its language clusters in honest order", async () => {
    const view = await viewOf("country", "IN");

    expect(view.center).toEqual({
      id: "IN",
      kind: "country",
      label: "India",
      count: 70,
    });
    // Count desc, then label asc: Hindi 65, Tamil 4, Sanskrit 1.
    expect(view.clusters.map((cluster) => cluster.label)).toEqual([
      "Hindi",
      "Tamil",
      "Sanskrit",
    ]);
    expect(view.totalMembers).toBe(70);
    expect(view.fetchedAt).toBe(mockSnapshot.fetchedAt);
    expect(edgesLandOnVisibleNodes(view)).toBe(true);
    expect(view.graph.edges.filter((edge) => edge.relation === "broadcasts in"))
      .toEqual([
        { from: "IN", to: "hi", relation: "broadcasts in", provenance: "catalog" },
        { from: "IN", to: "ta", relation: "broadcasts in", provenance: "catalog" },
        {
          from: "IN",
          to: "sanskrit",
          relation: "broadcasts in",
          provenance: "catalog",
        },
      ]);
  });

  it("caps the view at ATLAS_MAX_NODES server-side while totalMembers stays honest", async () => {
    const view = await viewOf("country", "IN");

    expect(view.graph.nodes).toHaveLength(ATLAS_MAX_NODES);
    const stationNodes = view.graph.nodes.filter(
      (node) => node.kind === "station"
    );
    // 1 centre + 3 cluster heads claim their seats first; 56 stations fill.
    expect(stationNodes).toHaveLength(56);
    // The honest uncapped count survives the cap.
    expect(view.totalMembers).toBe(70);

    // Round-robin seating: no visible head orbits empty.
    for (const cluster of view.clusters) {
      expect(cluster.memberIds.length).toBeGreaterThan(0);
      for (const memberId of cluster.memberIds) {
        expect(nodeIds(view).has(memberId)).toBe(true);
      }
    }

    // The busiest station in the land takes the first seat…
    expect(stationNodes[0]?.id).toBe("in-hindi-00");
    // …and Hindi's dominance is respected within the shared budget.
    const hindiMembers = view.clusters.find((c) => c.id === "hi")?.memberIds;
    expect(hindiMembers?.[0]).toBe("in-hindi-00");
  });

  it("builds one identical country view from iso code, lowercase iso, or name slug", async () => {
    const upper = await viewOf("country", "IN");
    const lower = await viewOf("country", "in");
    const byName = await viewOf("country", "india");

    expect(lower).toEqual(upper);
    expect(byName).toEqual(upper);
  });

  it("centres a language with country clusters on the same graph shape", async () => {
    const view = await viewOf("language", "hi");

    expect(view.center).toEqual({
      id: "hi",
      kind: "language",
      label: "Hindi",
      count: 65,
    });
    expect(view.clusters).toHaveLength(1);
    expect(view.clusters[0]).toMatchObject({ id: "IN", label: "India" });
    expect(view.totalMembers).toBe(HINDI_STATION_COUNT);
    // Same cap discipline as the country view.
    expect(view.graph.nodes).toHaveLength(ATLAS_MAX_NODES);

    const edges = view.graph.edges;
    expect(
      edges.find((edge) => edge.relation === "broadcasts in")
    ).toMatchObject({ from: "IN", to: "hi", provenance: "catalog" });
    expect(
      edges.find((edge) => edge.relation === "stations here")
    ).toMatchObject({
      from: "hi",
      to: "in-hindi-00",
      provenance: "catalog",
    });
    expect(edgesLandOnVisibleNodes(view)).toBe(true);
  });

  it("recognises a language by name slug as well as by code", async () => {
    // No station carries a "hindi" language code — the match rides the
    // slug of station.language and the summary table instead.
    const view = await viewOf("language", "hindi");
    expect(view.center.label).toBe("Hindi");
    expect(view.totalMembers).toBe(HINDI_STATION_COUNT);
  });

  it("centres a station with country, language, and at most six genre neighbours", async () => {
    const view = await viewOf("station", "in-hindi-00");

    expect(view.center).toEqual({
      id: "in-hindi-00",
      kind: "station",
      label: "Hindi FM 00",
      count: 200,
      favicon: "https://cdn.example/hindi00.png",
      countryCode: "IN",
    });

    const tagNodes = view.graph.nodes.filter((node) => node.kind === "genre");
    expect(tagNodes.map((node) => node.id)).toEqual([
      "bollywood",
      "pop-music",
      "news",
      "talk",
      "classical",
      "ghazal",
    ]);

    const taggedEdges = view.graph.edges.filter(
      (edge) => edge.relation === "tagged"
    );
    expect(taggedEdges).toHaveLength(6);
    for (const edge of taggedEdges) {
      expect(edge).toMatchObject({
        from: "in-hindi-00",
        provenance: "catalog",
      });
    }
    expect(
      view.graph.edges.find((edge) => edge.relation === "broadcasts in")
    ).toMatchObject({ from: "IN", to: "hi" });
    expect(
      view.graph.edges.find((edge) => edge.relation === "stations here")
    ).toMatchObject({ from: "hi", to: "in-hindi-00" });

    // The panel tunes through the real sanitized Station, not node fields.
    expect(view.stationDetail?.uuid).toBe("in-hindi-00");
    expect(view.stationDetail?.name).toBe("Hindi FM 00");
    expect(view.stationDetail?.countryCode).toBe("IN");
    expect(view.stationDetail).toEqual(
      mockSnapshot.stations.find((station) => station.uuid === "in-hindi-00")
    );

    expect(view.clusters).toEqual([]);
    expect(edgesLandOnVisibleNodes(view)).toBe(true);
  });

  it("answers bad requests before spending a mirror round-trip", async () => {
    const missingKind = await expand(null, "IN");
    expect(missingKind.status).toBe(400);
    expect(await missingKind.json()).toEqual({ error: "bad-request" });

    const unknownKind = await expand("galaxy", "milky-way");
    expect(unknownKind.status).toBe(400);

    const missingId = await expand("country", null);
    expect(missingId.status).toBe(400);

    const emptyId = await expand("country", "");
    expect(emptyId.status).toBe(400);
  });

  it("answers unknown ids with an honest 404", async () => {
    for (const [kind, id] of [
      ["country", "ZZ"],
      ["language", "klingon"],
      ["station", "no-such-uuid"],
    ] as const) {
      const response = await expand(kind, id);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "not-found" });
    }
  });

  it("names an outage 503 snapshot-unavailable and refuses to cache it", async () => {
    const loader = await loadRoute();
    const snapshotModule = await import(
      "~/services/radioBrowser/catalogSnapshot"
    );
    vi.mocked(snapshotModule.fetchRadioBrowserCatalogSnapshot).mockRejectedValueOnce(
      new Error("mirrors down")
    );

    const response = await loader({
      request: atlasRequest("country", "IN"),
      context: {},
      params: {},
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "snapshot-unavailable" });
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("marks successful views cacheable but bounded", async () => {
    const response = await expand("country", "IN");
    expect(response.headers.get("Cache-Control")).toContain("s-maxage=3600");
    expect(response.headers.get("Cache-Control")).toContain(
      "stale-while-revalidate=1800"
    );
  });

  it("stamps every edge with catalog provenance across all three views", async () => {
    const views = [
      await viewOf("country", "IN"),
      await viewOf("language", "hi"),
      await viewOf("station", "in-hindi-00"),
    ];
    for (const view of views) {
      expect(view.graph.edges.length).toBeGreaterThan(0);
      for (const edge of view.graph.edges) {
        expect(edge.provenance).toBe("catalog");
      }
    }
  });
});

describe("atlas graph derivation", () => {
  function snapshotWith(options: {
    stations: Station[];
    countries?: Country[];
    languages?: RadioBrowserCatalogSnapshot["languages"];
  }): RadioBrowserCatalogSnapshot {
    return {
      fetchedAt: "2026-07-14T05:00:00.000Z",
      stations: options.stations,
      countries: options.countries ?? [],
      languages: options.languages ?? [],
      tags: [],
    };
  }

  it("exports the law: a hard ceiling of sixty nodes", () => {
    expect(ATLAS_MAX_NODES).toBe(60);
  });

  it("builds byte-identical views from the same snapshot", () => {
    const snapshot = mockSnapshot;
    expect(buildAtlasView("country", "IN", snapshot)).toEqual(
      buildAtlasView("country", "IN", snapshot)
    );
    expect(buildAtlasView("language", "hi", snapshot)).toEqual(
      buildAtlasView("language", "hi", snapshot)
    );
    expect(buildAtlasView("station", "in-hindi-00", snapshot)).toEqual(
      buildAtlasView("station", "in-hindi-00", snapshot)
    );
  });

  it("returns null for unknown kinds and ids instead of an empty lie", () => {
    expect(buildAtlasView("galaxy", "m81", mockSnapshot)).toBeNull();
    expect(buildAtlasView("country", "ZZ", mockSnapshot)).toBeNull();
    expect(buildAtlasView("language", "klingon", mockSnapshot)).toBeNull();
    expect(buildAtlasView("station", "nope", mockSnapshot)).toBeNull();
  });

  it("breaks cluster ties by label, not by snapshot luck", () => {
    const zulu = (i: number) =>
      makeStation({
        uuid: `gh-zulu-${i}`,
        name: `Zulu ${i}`,
        country: "Ghana",
        countryCode: "GH",
        language: "Zulu",
        bitrate: 100 - i,
      });
    const amharic = (i: number) =>
      makeStation({
        uuid: `gh-amharic-${i}`,
        name: `Amharic ${i}`,
        country: "Ghana",
        countryCode: "GH",
        language: "Amharic",
        bitrate: 100 - i,
      });

    // Deliberately shuffled input: ordering must survive it.
    const view = buildAtlasView(
      "country",
      "GH",
      snapshotWith({
        stations: [
          zulu(0),
          amharic(1),
          amharic(0),
          zulu(1),
          makeStation({
            uuid: "gh-wordless",
            name: "Wordless",
            country: "Ghana",
            countryCode: "GH",
            bitrate: 50,
          }),
        ],
        countries: [{ name: "Ghana", iso_3166_1: "GH", stationcount: 5 }],
      })
    );

    expect(view?.clusters.map((cluster) => cluster.id)).toEqual([
      "amharic",
      "zulu",
      "unknown",
    ]);
    expect(view?.totalMembers).toBe(5);
  });

  it("ranks busyness by clickCount first and bitrate only as fallback", () => {
    const view = buildAtlasView(
      "country",
      "GH",
      snapshotWith({
        stations: [
          makeStation({
            uuid: "gh-bitrate-hero",
            name: "Bitrate Hero",
            country: "Ghana",
            countryCode: "GH",
            language: "Ga",
            bitrate: 320,
          }),
          makeStation({
            uuid: "gh-clicked-underdog",
            name: "Clicked Underdog",
            country: "Ghana",
            countryCode: "GH",
            language: "Ga",
            bitrate: 64,
            clickCount: 900,
          }),
        ],
        countries: [{ name: "Ghana", iso_3166_1: "GH", stationcount: 2 }],
      })
    );

    expect(view?.clusters[0]?.memberIds[0]).toBe("gh-clicked-underdog");
  });
});
