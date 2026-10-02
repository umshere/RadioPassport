import { describe, expect, it } from "vitest";
import { countryLocalDate, hasOneClock } from "~/utils/countryClock";
import { formatClock, stationLocalDate } from "~/utils/localTime";
import { arrivalSky } from "~/components/home/homeModel";
import { ticketLocalHour } from "~/components/share/ticketModel";
import type { Station } from "~/types/radio";

const noon = new Date(Date.UTC(2026, 9, 2, 12, 0)); // 12:00 UTC, 2 Oct 2026

describe("a country that keeps one clock", () => {
  it("knows India is UTC+5:30 with no coordinates at all", () => {
    expect(formatClock(countryLocalDate("IN", noon)!)).toBe("17:30");
    expect(formatClock(stationLocalDate({ countryCode: "IN" }, noon)!)).toBe("17:30");
  });
  it("follows daylight saving", () => {
    expect(formatClock(countryLocalDate("DE", noon)!)).toBe("14:00"); // CEST
    expect(formatClock(countryLocalDate("DE", new Date(Date.UTC(2026, 0, 15, 12, 0)))!)).toBe("13:00"); // CET
  });
  it("beats the sun-by-longitude estimate, which is half an hour off for Kerala", () => {
    expect(formatClock(stationLocalDate({ countryCode: "IN", longitude: 76.3 }, noon)!)).toBe("17:30");
  });
  it("will not guess for a country spanning zones, but still uses its coordinates", () => {
    expect(hasOneClock("US")).toBe(false);
    expect(stationLocalDate({ countryCode: "US" }, noon)).toBeNull();
    expect(formatClock(stationLocalDate({ countryCode: "US", longitude: -118 }, noon)!)).toBe("04:00");
  });
  it("is the clock the sky, the keeper and the ticket all read", () => {
    const station = { uuid: "x", countryCode: "IN" } as Station;
    expect(arrivalSky(station, noon)).toMatchObject({ clock: "17:30", solar: "Dusk" });
    expect(ticketLocalHour({ countryCode: "IN" }, noon)).toEqual({ clock: "17:30", word: "dusk" });
    expect(ticketLocalHour(72.8, noon)).toEqual({ clock: "17:00", word: "dusk" });
  });
});
