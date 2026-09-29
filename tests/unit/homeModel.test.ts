import { describe, expect, it } from "vitest";
import {
  arrivalSky,
  canShowMore,
  flapLine,
  homeBoardCap,
  homeBoardHeading,
  homeDepartures,
  homeKeeperLine,
  homeKeeperState,
  homePhase,
  hoursFromListener,
} from "~/components/home/homeModel";
import { VOICE } from "~/components/keeper/keeperVoice";
import type { Station } from "~/types/radio";

const station = (over: Partial<Station> = {}): Station =>
  ({
    uuid: "s1",
    name: "Radio Lisboa (128k AAC)",
    url: "https://example.test/stream",
    city: "Lisbon",
    country: "Portugal",
    countryCode: "PT",
    longitude: 0,
    ...over,
  }) as Station;

const base = { query: "", hour: null, isPlaying: false, count: 12, loading: false };

describe("homePhase", () => {
  it("arrives when nothing is asked", () => {
    expect(homePhase(base)).toBe("arrive");
  });
  it("seeks from two letters, not one", () => {
    expect(homePhase({ ...base, query: "j" })).toBe("arrive");
    expect(homePhase({ ...base, query: "ja" })).toBe("seek");
    expect(homePhase({ ...base, query: " jazz ", isPlaying: true })).toBe("seek");
  });
  it("goes to the hour gate when an hour is lit", () => {
    expect(homePhase({ ...base, hour: "Dusk" })).toBe("hour");
  });
  it("is aboard while playing with nothing asked", () => {
    expect(homePhase({ ...base, isPlaying: true })).toBe("aboard");
  });
  it("is empty only once the answer is in", () => {
    expect(homePhase({ ...base, query: "zzzz", count: 0, loading: true })).toBe("seek");
    expect(homePhase({ ...base, query: "zzzz", count: 0 })).toBe("empty");
    expect(homePhase({ ...base, hour: "Dawn", count: 0 })).toBe("empty");
    expect(homePhase({ ...base, count: 0 })).toBe("empty");
  });
});

describe("the board", () => {
  it("steps 8 → 16 → 32 and shows a seek answer in full", () => {
    expect(homeBoardCap("arrive", 0)).toBe(8);
    expect(homeBoardCap("arrive", 1)).toBe(16);
    expect(homeBoardCap("hour", 2)).toBe(32);
    expect(homeBoardCap("aboard", 9)).toBe(32);
    expect(homeBoardCap("seek", 0)).toBe(32);
  });
  it("offers more only while there is more to show", () => {
    expect(canShowMore("arrive", 0, 40)).toBe(true);
    expect(canShowMore("arrive", 0, 8)).toBe(false);
    expect(canShowMore("arrive", 2, 400)).toBe(false);
    expect(canShowMore("seek", 0, 400)).toBe(false);
  });
  it("gives each departure its own clock and hour, never a guess", () => {
    const now = new Date(Date.UTC(2026, 8, 29, 20, 5));
    const [lisbon, nowhere] = homeDepartures(
      [station(), station({ uuid: "s2", longitude: undefined })],
      now,
    );
    expect(lisbon!.clock).toBe("20:05");
    expect(lisbon!.solar).toBe("Dusk");
    expect(nowhere!.clock).toBeNull();
    expect(nowhere!.solar).toBeNull();
  });
  it("heads the board by phase", () => {
    expect(homeBoardHeading({ phase: "arrive", hour: null, seekLabel: null })).toBe(VOICE.homeBoard);
    expect(homeBoardHeading({ phase: "aboard", hour: null, seekLabel: null })).toBe("Other departures");
    expect(homeBoardHeading({ phase: "hour", hour: "Dusk", seekLabel: null })).toBe("Live where it is dusk");
    expect(homeBoardHeading({ phase: "seek", hour: null, seekLabel: "4 LIVE · JAZZ" })).toBe("4 LIVE · JAZZ");
    expect(homeBoardHeading({ phase: "empty", hour: null, seekLabel: null })).toBe("NO DEPARTURES");
  });
  it("keeps flap lines upper case, short, and free of glyphs the drum lacks", () => {
    expect(flapLine("  Rio de   Janeiro ")).toBe("RIO DE JANEIRO");
    expect(flapLine("a".repeat(40), 10)).toBe("AAAAAAAAAA");
  });
});

describe("the sky and the keeper", () => {
  it("reads the arrival city's hour, or says nothing without coordinates", () => {
    const now = new Date(Date.UTC(2026, 8, 29, 2, 40));
    expect(arrivalSky(station(), now)).toEqual({ clock: "02:40", solar: "Night", localHour: 2, minute: 40 });
    expect(arrivalSky(station({ longitude: undefined }), now).clock).toBeNull();
    expect(arrivalSky(null, now).solar).toBeNull();
  });
  it("counts hours from the listener the short way round", () => {
    expect(hoursFromListener(21, 14)).toBe(7);
    expect(hoursFromListener(2, 22)).toBe(4);
    expect(hoursFromListener(10, 22)).toBe(12);
    expect(hoursFromListener(null, 22)).toBeNull();
  });
  it("sleeps in the deep night there with nothing playing, and only then", () => {
    expect(homeKeeperState({ phase: "arrive", loading: false, isPlaying: false, localHour: 3 })).toBe("sleeping");
    expect(homeKeeperState({ phase: "arrive", loading: false, isPlaying: false, localHour: 9 })).toBe("idle");
    expect(homeKeeperState({ phase: "aboard", loading: false, isPlaying: true, localHour: 3 })).toBe("speaking");
    expect(homeKeeperState({ phase: "seek", loading: true, isPlaying: false, localHour: 3 })).toBe("thinking");
  });
  it("says one line per phase, in the keeper's voice", () => {
    const line = (phase: Parameters<typeof homeKeeperLine>[0]["phase"], extra = {}) =>
      homeKeeperLine({ phase, city: "Lisbon", query: "jazz", hour: "Dawn", solar: "Dawn", firstVisit: false, asleep: false, ...extra });
    expect(line("seek")).toBe("Looking for jazz.");
    expect(line("empty")).toBe("Nothing at that gate tonight.");
    expect(line("aboard")).toBe("Landed in Lisbon.");
    expect(line("arrive")).toBe("Somewhere it’s morning.");
    expect(line("arrive", { firstVisit: true })).toBe(VOICE.homeWelcome);
    expect(line("arrive", { asleep: true })).toBe(VOICE.homeAsleep);
    for (const text of [VOICE.homeWelcome, VOICE.homeAsleep, VOICE.homeEmpty]) {
      expect(text).not.toMatch(/discover|explore|playlist|seamless|unlock|!/i);
    }
  });
});
