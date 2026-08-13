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
