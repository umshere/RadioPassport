import { describe, expect, it } from "vitest";
import { HOME_KEEPER_ROUTE, KEEPER_GROUPS, KEEPER_ROUTES } from "~/components/home/keeperRoute";

const KEXP_UUID = "e9fddd49-3ee2-4597-8574-1b7dbd00aac0";
const NTS_UUID = "a3dbc189-d23e-4308-803f-5aad26432b8c";
const KEXP_STREAM = "https://kexp-mp3-128.streamguys1.com/kexp128.mp3";

describe("Keeper's Route", () => {
  it("keeps each curated radio station paired with its own canonical editorial source", () => {
    const byStation = new Map(
      HOME_KEEPER_ROUTE.stops.map((stop) => [stop.station.uuid, stop]),
    );

    expect(HOME_KEEPER_ROUTE.title.trim()).not.toBe("");
    expect(HOME_KEEPER_ROUTE.intro.trim()).not.toBe("");
    expect(HOME_KEEPER_ROUTE.stops).toHaveLength(2);
    expect([...byStation.keys()].sort()).toEqual([KEXP_UUID, NTS_UUID].sort());

    expect(byStation.get(KEXP_UUID)).toMatchObject({
      sourceUrl: "https://kexp.org/watch/khruangbin-full-performance-live-on-kexp/",
    });
    expect(byStation.get(NTS_UUID)).toMatchObject({
      sourceUrl: "https://www.nts.live/shows/khruangbin",
    });

    const sourceUrls = HOME_KEEPER_ROUTE.stops.map((stop) => stop.sourceUrl);
    expect(new Set(sourceUrls).size).toBe(2);
    for (const sourceUrl of sourceUrls) {
      const parsed = new URL(sourceUrl);
      expect(parsed.protocol).toBe("https:");
      expect(parsed.search).toBe("");
      expect(parsed.hash).toBe("");
    }
  });

  it("uses KEXP's MP3 stream and keeps station playback URLs separate from source links", () => {
    const kexp = HOME_KEEPER_ROUTE.stops.find(
      (stop) => stop.station.uuid === KEXP_UUID,
    );
    const nts = HOME_KEEPER_ROUTE.stops.find(
      (stop) => stop.station.uuid === NTS_UUID,
    );

    expect(kexp).toBeDefined();
    expect(kexp!.station.name).toBe("KEXP 90.3 FM Seattle");
    expect(kexp!.station.streamUrl).toBe(KEXP_STREAM);
    expect(kexp!.station.url).toBe(KEXP_STREAM);
    expect(kexp!.sourceUrl).not.toBe(KEXP_STREAM);

    expect(nts).toBeDefined();
    expect(nts!.station.name).toBe("NTS Radio Channel 1");
    expect(nts!.station.streamUrl).toBe("https://stream-relay-geo.ntslive.net/stream");
    expect(nts!.sourceUrl).not.toBe(nts!.station.streamUrl);
    expect(kexp!.sourceUrl).not.toBe(nts!.sourceUrl);
  });

  it("keeps a grounded reason and source label with every stop", () => {
    for (const stop of HOME_KEEPER_ROUTE.stops) {
      expect(stop.name.trim()).not.toBe("");
      expect(stop.reason.trim()).not.toBe("");
      expect(stop.sourceLabel.trim()).not.toBe("");
      expect(stop.sourceUrl.trim()).not.toBe("");
    }
  });

  describe("artist routes", () => {
    it("leads with Khruangbin, Radiohead and Yesudas, then the rest, each with a unique id and chip label", () => {
      const ids = KEEPER_ROUTES.map((route) => route.id);
      expect(ids.slice(0, 3)).toEqual(["khruangbin", "radiohead", "yesudas"]);
      expect(ids).toEqual(
        expect.arrayContaining([
          "beatles", "coldplay", "pink-floyd", "queen", "led-zeppelin", "elvis",
          "michael-jackson", "bob-marley", "fairuz", "kishore-kumar",
          "lata-mangeshkar", "mohammed-rafi", "ar-rahman", "arijit-singh",
        ]),
      );
      expect(new Set(ids).size).toBe(ids.length);
      const labels = KEEPER_ROUTES.map((route) => route.label);
      expect(labels.every((label) => label.trim() !== "")).toBe(true);
      expect(new Set(labels).size).toBe(labels.length);
      expect(KEEPER_ROUTES[0]).toBe(HOME_KEEPER_ROUTE);
    });

    it("plays every stream over https with no expiring token in the URL", () => {
      for (const route of KEEPER_ROUTES) {
        for (const stop of route.stops) {
          const stream = new URL(stop.station.streamUrl ?? "");
          expect(stream.protocol).toBe("https:");
          expect(stream.search).toBe("");
          expect(stop.station.codec).toBe("MP3");
          expect(stop.station.hls).toBe(false);
        }
      }
    });

    it("gives every stop a playable stream, a distinct station and a clean https source", () => {
      const stationIds = new Set<string>();
      const sources = new Set<string>();
      for (const route of KEEPER_ROUTES) {
        expect(route.title.trim()).not.toBe("");
        expect(route.stops.length).toBeGreaterThan(0);
        for (const stop of route.stops) {
          expect(stationIds.has(stop.station.uuid)).toBe(false);
          stationIds.add(stop.station.uuid);
          expect(new URL(stop.station.streamUrl ?? "").protocol).toBe("https:");
          expect(stop.station.url).toBe(stop.station.streamUrl);
          const source = new URL(stop.sourceUrl);
          expect(source.protocol).toBe("https:");
          expect(source.search).toBe("");
          expect(source.hash).toBe("");
          expect(stop.sourceUrl).not.toBe(stop.station.streamUrl);
          expect(sources.has(stop.sourceUrl)).toBe(false);
          sources.add(stop.sourceUrl);
        }
      }
    });

    it("pairs each artist with its own station", () => {
      const byId = new Map(KEEPER_ROUTES.map((route) => [route.id, route]));
      const radiohead = byId.get("radiohead")!.stops[0]!;
      const yesudas = byId.get("yesudas")!.stops[0]!;
      expect(radiohead.station.streamUrl).toBe(
        "https://streaming.exclusive.radio/er/radiohead/icecast.audio",
      );
      expect(radiohead.sourceUrl).toBe("https://www.radiohead.com/");
      expect(yesudas.station.streamUrl).toBe("https://stream.zeno.fm/9x1sw687nf9uv");
      expect(yesudas.station.languageCodes).toEqual(["ml"]);
      expect(yesudas.sourceUrl).toBe("https://en.wikipedia.org/wiki/K._J._Yesudas");
    });

    it("keeps to the Elsewhere voice: no banned words, no claim of what is on air", () => {
      const banned = /discover|seamless|ai-powered|widget|playlist|unlock|explore/i;
      const onAir = /now playing|playing now|on air now|currently playing/i;
      for (const route of KEEPER_ROUTES) {
        const copy = [route.title, route.intro, ...route.stops.flatMap((stop) => [stop.name, stop.reason, stop.sourceLabel])];
        for (const line of copy) {
          expect(line).not.toMatch(banned);
          expect(line).not.toMatch(onAir);
        }
      }
    });

    it("sorts every route into a known group, with Malayalam trails in the Malayalam group", () => {
      for (const route of KEEPER_ROUTES) {
        expect(KEEPER_GROUPS).toContain(route.group);
      }
      const malayalam = KEEPER_ROUTES.filter((route) => route.group === "malayalam").map((route) => route.id);
      expect(malayalam).toEqual([
        "yesudas",
        "kalabhavan-mani",
        "malayalam-old-melodies",
        "malayalam-90s",
        "malayalam-film-songs",
      ]);
      for (const route of KEEPER_ROUTES.filter((candidate) => candidate.group === "malayalam")) {
        expect(route.stops[0]!.station.languageCodes).toContain("ml");
      }
    });
  });
});
