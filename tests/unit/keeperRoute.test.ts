import { describe, expect, it } from "vitest";
import { HOME_KEEPER_ROUTE } from "~/components/home/keeperRoute";

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
});
