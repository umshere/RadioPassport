import { describe, expect, it } from "vitest";
import { similarStations } from "~/components/keeper/keeperSimilar";
import type { Station } from "~/types/radio";

function st(uuid: string, extra: Partial<Station> = {}): Station {
  return {
    uuid,
    name: `Station ${uuid}`,
    url: `https://x/${uuid}`,
    streamUrl: `https://x/${uuid}`,
    favicon: "",
    country: "India",
    countryCode: "IN",
    state: null,
    language: null,
    tags: null,
    bitrate: 128,
    codec: "mp3",
    ...extra,
  } as Station;
}

describe("similarStations", () => {
  const now = new Date("2026-10-02T12:00:00Z");
  const here = st("a", { language: "malayalam", tags: "film,pop", longitude: 76 });

  it("puts language first, other places before the same country", () => {
    const pool = [
      st("b", { language: "malayalam", countryCode: "IN" }),
      st("c", { language: "Malayalam, English", country: "UAE", countryCode: "AE" }),
      st("d", { language: "tamil", tags: "film" }),
    ];
    const out = similarStations(here, pool, now)!;
    expect(out.reason).toBe("language");
    expect(out.label).toBe("More in Malayalam");
    expect(out.stations.map((s) => s.uuid)).toEqual(["c", "b"]);
  });

  it("falls back to a tag, then the hour, and never repeats the station", () => {
    const tag = similarStations(here, [here, st("d", { language: "tamil", tags: "film" })], now)!;
    expect(tag.reason).toBe("tag");
    expect(tag.label).toBe("More Film");
    const hour = similarStations(
      st("a", { longitude: 76 }),
      [st("e", { country: "Pakistan", countryCode: "PK", longitude: 70 })],
      now,
    )!;
    expect(hour.reason).toBe("hour");
  });

  it("skips dead streams and says nothing when nothing is close", () => {
    const dead = st("f", { language: "malayalam", lastCheckOk: false });
    expect(similarStations(here, [dead], now)).toBeNull();
  });
});
