import { countryLocalDate } from "./countryClock";

export type SolarHour = "Dawn" | "Midday" | "Dusk" | "Night";

export function offsetHoursFromLongitude(longitude: number) {
  const clamped = Math.max(-180, Math.min(180, longitude));
  return Math.round(clamped / 15);
}

export function localDateAtLongitude(longitude: number, now = new Date()) {
  return new Date(
    now.getTime() + offsetHoursFromLongitude(longitude) * 3_600_000
  );
}

function hourBucket(hour: number): SolarHour {
  if (hour >= 5 && hour < 9) return "Dawn";
  if (hour >= 9 && hour < 17) return "Midday";
  if (hour >= 17 && hour < 21) return "Dusk";
  return "Night";
}

export function solarHourFromDate(date: Date): SolarHour {
  return hourBucket(date.getHours());
}

export function solarHourAtLongitude(longitude: number, now = new Date()) {
  return hourBucket(localDateAtLongitude(longitude, now).getUTCHours());
}

/** The hour word for a local Date (UTC fields read the local time). */
export function solarHourFromLocal(local: Date): SolarHour {
  return hourBucket(local.getUTCHours());
}

/**
 * The wall clock at a station, as a Date whose UTC fields read the local time.
 * A country with one clock (India, Germany, Japan…) gives its real time, half
 * hours and daylight saving included; otherwise the sun at the station's
 * longitude; with neither, null: no guess.
 */
export function stationLocalDate(
  station: { longitude?: number | null; countryCode?: string | null },
  now = new Date(),
): Date | null {
  const official = countryLocalDate(station.countryCode, now);
  if (official) return official;
  return typeof station.longitude === "number" && Number.isFinite(station.longitude)
    ? localDateAtLongitude(station.longitude, now)
    : null;
}

export function formatClock(date: Date) {
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(
    date.getUTCMinutes()
  ).padStart(2, "0")}`;
}

export function formatLocalLabel(place: string, date: Date) {
  return `${formatClock(date)} in ${place}`;
}

export function stationMatchesSolarHour(
  longitude: number | null | undefined,
  hour: SolarHour | null,
  now = new Date()
) {
  if (!hour) return true;
  if (typeof longitude !== "number") return false;
  return solarHourAtLongitude(longitude, now) === hour;
}
