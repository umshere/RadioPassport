import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchVerifiedCoverArt,
  fetchWikipediaArticle,
  fetchWikipediaImage,
  itunesArtworkMatch,
  resolveCoverArt,
  wikipediaTitleMatch,
} from "~/utils/imageSearch";
import { preferSecureArtworkUrl } from "~/utils/stations";
import { buildTheaterKnowledge } from "~/components/radio-passport/knowledge/theaterKnowledge";
import type { Station } from "~/types/radio";

function makeStation(overrides: Partial<Station> = {}): Station {
  return {
    uuid: "st-1",
    name: "Radio Dusk",
    url: "https://dusk.example/stream",
    streamUrl: null,
    favicon: "http://dusk.example/logo.png",
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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("preferSecureArtworkUrl", () => {
  it("upgrades plain-http station hosts to https, same path", () => {
    expect(preferSecureArtworkUrl("http://mirchi.in/favicon-196x196.png")).toBe(
      "https://mirchi.in/favicon-196x196.png",
    );
    expect(preferSecureArtworkUrl("HTTP://x.example/a.png")).toBe(
      "https://x.example/a.png",
    );
  });

  it("leaves https, protocol-relative, and empty values alone", () => {
    expect(preferSecureArtworkUrl("https://x.example/a.png")).toBe(
      "https://x.example/a.png",
    );
    expect(preferSecureArtworkUrl("  https://x.example/a.png  ")).toBe(
      "https://x.example/a.png",
    );
    expect(preferSecureArtworkUrl(null)).toBeNull();
    expect(preferSecureArtworkUrl(undefined)).toBeNull();
  });
});

describe("wikipediaTitleMatch", () => {
  it("names its owner or serves nothing", () => {
    expect(wikipediaTitleMatch("Chris Coco", "Chris Coco")).toBe(true);
    expect(wikipediaTitleMatch("Dhurandhar (2025 film)", "Dhurandhar")).toBe(true);
    // The Flusser case: a stranger's page never dresses our track.
    expect(wikipediaTitleMatch("Vilém Flusser", "Wellental")).toBe(false);
    expect(wikipediaTitleMatch("Anything", "")).toBe(false);
    expect(wikipediaTitleMatch("", "Wellental")).toBe(false);
  });

  it("resolves gated articles and refuses strangers", async () => {
    const page = (title: string, image: string | null) =>
      vi.fn(async (url: string) => {
        if (url.includes("list=search")) {
          return {
            ok: true,
            json: async () => ({ query: { search: [{ title }] } }),
          };
        }
        return {
          ok: true,
          json: async () => ({
            query: {
              pages: {
                123: {
                  title,
                  canonicalurl: `https://en.wikipedia.org/wiki/${title.replace(/ /g, "_")}`,
                  ...(image ? { thumbnail: { source: image } } : {}),
                },
              },
            },
          }),
        };
      });
    vi.stubGlobal("fetch", page("Chris Coco", "https://upload.wikimedia.org/coco.jpg"));
    expect(await fetchWikipediaArticle("Chris Coco")).toEqual({
      title: "Chris Coco",
      url: "https://en.wikipedia.org/wiki/Chris_Coco",
    });
    expect(await fetchWikipediaImage("Chris Coco")).toBe(
      "https://upload.wikimedia.org/coco.jpg",
    );

    vi.stubGlobal("fetch", page("Vilém Flusser", "https://upload.wikimedia.org/flusser.jpg"));
    expect(await fetchWikipediaArticle("Wellental")).toBeNull();
    expect(await fetchWikipediaImage("Wellental")).toBeNull();
  });
});

describe("itunesArtworkMatch", () => {
  const exact = {
    trackName: "Aakhri Ishq",
    artistName: "Shashwat Sachdev, Jubin Nautiyal & Irshad Kamil",
    collectionName: "Aakhri Ishq - Single",
  };

  it("accepts the hit that names our track or our artist in full", () => {
    expect(
      itunesArtworkMatch(
        exact,
        "Aakhri Ishq",
        "Shashwat Sachdev, Jubin Nautiyal & Irshad Kamil",
      ),
    ).toBe(true);
    // Artist alone fully named is enough for a plate.
    expect(itunesArtworkMatch({ artistName: "Shashwat Sachdev" }, "Unknown", "Shashwat Sachdev")).toBe(
      true,
    );
  });

  it("sees through noisy ICY titles to the same song", () => {
    expect(
      itunesArtworkMatch(
        exact,
        "Aakhri Ishq (From Dhurandhar The Revenge)",
        "Shashwat Sachdev, Jubin Nautiyal and Irshad Kamil",
      ),
    ).toBe(true);
  });

  it("refuses confident wrong covers and empty results", () => {
    expect(
      itunesArtworkMatch(
        { trackName: "Aakhri Pasta", artistName: "DJ Unknown" },
        "Aakhri Ishq",
        "Shashwat Sachdev",
      ),
    ).toBe(false);
    expect(itunesArtworkMatch({}, "Aakhri Ishq", "Shashwat Sachdev")).toBe(false);
    expect(itunesArtworkMatch(exact, "", "")).toBe(false);
  });
});

describe("resolveCoverArt", () => {
  function stubCoverArt(index: Record<string, { ok: boolean; images: unknown[] }>) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const hit = index[url];
        if (!hit) return { ok: false, json: async () => ({}) };
        return {
          ok: hit.ok,
          json: async () => ({ images: hit.images }),
        };
      }),
    );
  }

  it("serves a verified release front and never guesses", async () => {
    stubCoverArt({
      "https://coverartarchive.org/release/rel-1/": { ok: true, images: [{ id: 1 }] },
    });
    expect(
      await fetchVerifiedCoverArt("release", "rel-1"),
    ).toBe("https://coverartarchive.org/release/rel-1/front-250");
    expect(await fetchVerifiedCoverArt("release", "")).toBeNull();
    expect(await fetchVerifiedCoverArt("release", null)).toBeNull();
  });

  it("falls from the pressing to the release-group, then to nothing", async () => {
    stubCoverArt({
      "https://coverartarchive.org/release/rel-9/": { ok: false, images: [] },
      "https://coverartarchive.org/release-group/rg-9/": {
        ok: true,
        images: [{ id: 7 }],
      },
    });
    expect(
      await resolveCoverArt({ releaseId: "rel-9", releaseGroupId: "rg-9" }),
    ).toBe("https://coverartarchive.org/release-group/rg-9/front-250");

    stubCoverArt({
      "https://coverartarchive.org/release/rel-9/": { ok: false, images: [] },
      "https://coverartarchive.org/release-group/rg-9/": { ok: false, images: [] },
    });
    expect(
      await resolveCoverArt({ releaseId: "rel-9", releaseGroupId: "rg-9" }),
    ).toBeNull();

    // A 200 with no images is still a miss — the iTunes turn comes next.
    stubCoverArt({
      "https://coverartarchive.org/release/rel-9/": { ok: true, images: [] },
      "https://coverartarchive.org/release-group/rg-9/": { ok: false, images: [] },
    });
    expect(
      await resolveCoverArt({ releaseId: "rel-9", releaseGroupId: "rg-9" }),
    ).toBeNull();
  });
});

describe("buildTheaterKnowledge artwork", () => {
  function roomGraph() {
    return {
      nodes: [
        { id: "ravi-kale", label: "Ravi Kale", kind: "person" as const },
        { id: "night-ferry", label: "Night Ferry", kind: "work" as const },
      ],
      edges: [
        {
          from: "ravi-kale",
          to: "night-ferry",
          relation: "performed",
          verified: true,
        },
      ],
    };
  }

  it("dresses track nodes in verified art and keeps catalog imagery", () => {
    const plate = "https://is1-ssl.mzstatic.com/image/thumb/x/600x600bb.jpg";
    const graph = buildTheaterKnowledge({
      station: makeStation(),
      roomGraph: roomGraph(),
      artwork: {
        "track:ravi-kale-night-ferry": plate,
        "country:IN": "https://evil.example/nope.jpg",
        "ghost:id": plate,
        "artist:ravi-kale": "not a url",
      },
    });
    const byId = new Map(graph.nodes.map((node) => [node.id, node]));

    expect(byId.get("track:ravi-kale-night-ferry")?.imagery).toEqual({
      type: "art",
      url: plate,
      monogram: "N",
    });
    // The flag is catalog truth — artwork never overrides filed imagery.
    expect(byId.get("country:IN")?.imagery).toEqual({
      type: "flag",
      code: "IN",
    });
    // The station keeps its (https-upgraded) favicon, not the plate.
    expect(byId.get("station:st-1")?.imagery).toEqual({
      type: "favicon",
      url: "https://dusk.example/logo.png",
      monogram: "R",
    });
    // Ghost ids file nothing; unusable URLs dress nothing.
    expect(byId.has("ghost:id")).toBe(false);
    expect(byId.get("artist:ravi-kale")?.imagery).toBeUndefined();
  });
});
