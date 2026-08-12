import type { Station } from "~/types/radio";
import { deriveStationAvailability, deriveStationHealth } from "~/utils/stationMeta";

export type StationDetail = [label: string, value: string];

export function safeExternalUrl(value?: string | null): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function clean(value?: string | null) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function stationPlace(station: Station): string | null {
  const country = clean(station.country)?.toLocaleLowerCase();
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const value of [clean(station.city), clean(station.state)]) {
    if (!value) continue;
    const normalized = value.toLocaleLowerCase();
    if (normalized === country || seen.has(normalized)) continue;
    seen.add(normalized);
    parts.push(value);
  }
  return parts.length ? parts.join(", ") : null;
}

export function stationTags(station: Station): string[] {
  const values = station.tagList?.length
    ? station.tagList
    : (station.tags ?? "").split(",");
  const seen = new Set<string>();
  return values.filter((value): value is string => {
    if (typeof value !== "string" || !value.trim()) return false;
    const key = value.trim().toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((value) => value.trim());
}

export type TrackIdentityInput = { artist?: string | null; title?: string | null };

/**
 * A stable tuple, rather than a delimiter-joined label. Artist/title text may
 * itself contain punctuation, so each field must retain its own boundary.
 */
export function serializeTrackIdentity(track: TrackIdentityInput | null | undefined) {
  return track ? JSON.stringify([track.artist ?? null, track.title ?? null]) : "";
}

export function trackKey(track: TrackIdentityInput | null | undefined) {
  return serializeTrackIdentity(track);
}

export function shouldRequestSelectedNowPlaying(
  selected: Station | null,
  active: Station | null,
  isPlaying: boolean,
) {
  const selectedStream = (selected?.streamUrl ?? selected?.url ?? "").trim();
  const activeStream = (active?.streamUrl ?? active?.url ?? "").trim();
  return Boolean(
    isPlaying &&
      selected?.uuid &&
      active?.uuid === selected.uuid &&
      selectedStream &&
      selectedStream === activeStream,
  );
}

export function shouldFocusAiResult(previousEnabled: boolean, enabled: boolean) {
  return !previousEnabled && enabled;
}

export function isAiTrackOptedIn(currentTrackKey: string, requestedTrackKey: string) {
  return Boolean(currentTrackKey && currentTrackKey === requestedTrackKey);
}

export function shouldResetAiTrackOptIn(
  previousStationId: string | null,
  nextStationId: string | null,
  previousTrackKey: string,
  nextTrackKey: string,
) {
  return previousStationId !== nextStationId || Boolean(previousTrackKey && nextTrackKey && previousTrackKey !== nextTrackKey);
}

/** The insights sheet consumes Escape first whenever it is open above an overlay. */
export function shouldOverlayHandleEscape(insightsOpen: boolean) {
  return !insightsOpen;
}

export function canRestoreFocusToTrigger(trigger: HTMLElement | null): trigger is HTMLElement {
  return Boolean(trigger?.isConnected && !trigger.hidden && trigger.getAttribute("aria-hidden") !== "true");
}

/** Catalog API entries are already normalized; retain their camelCase metadata verbatim. */
export function prepareCatalogSearchStations(stations: Station[], query: string, matches: (station: Station, query: string) => boolean) {
  return stations.filter((station) => matches(station, query)).slice(0, 72);
}

export function stationDetailRows(station: Station): StationDetail[] {
  const availabilityEvidence =
    station.probeStatus !== undefined ||
    station.healthStatus !== undefined ||
    station.isStreamHealthy !== undefined ||
    station.isLikelyUp !== undefined ||
    station.lastCheckOk !== undefined ||
    station.sslError === true;
  const availability = availabilityEvidence
    ? deriveStationAvailability(station)
    : null;
  const health = availabilityEvidence ? deriveStationHealth(station) : null;

  const rows: Array<StationDetail | null> = [
    stationPlace(station) ? ["Place", stationPlace(station)!] : null,
    clean(station.country) ? ["Country", clean(station.country)!] : null,
    clean(station.language) ? ["Language", clean(station.language)!] : null,
    clean(station.codec) ? ["Codec", clean(station.codec)!.toUpperCase()] : null,
    station.bitrate > 0 ? ["Bitrate", `${station.bitrate} kbps`] : null,
    availability ? ["Availability", availability.detailLabel] : null,
    health ? ["Check", health.label] : null,
    station.probeLatencyMs != null ? ["Probe", `${station.probeLatencyMs} ms`] : null,
    station.clickCount != null ? ["Clicks", station.clickCount.toLocaleString()] : null,
    station.clickTrend != null
      ? ["Click trend", `${station.clickTrend > 0 ? "+" : ""}${station.clickTrend}`]
      : null,
    station.votes != null ? ["Votes", station.votes.toLocaleString()] : null,
  ];
  return rows.filter((entry): entry is StationDetail => Boolean(entry));
}

export function stationDetailsPresentation(station: Station) {
  return {
    details: stationDetailRows(station),
    tags: stationTags(station),
    homepage: safeExternalUrl(station.homepage),
  };
}

export type FocusTrapTarget = "first" | "last" | "dialog" | null;

export function focusTrapTarget(
  count: number,
  activeIndex: number,
  shiftKey: boolean,
): FocusTrapTarget {
  if (!count) return "dialog";
  if (activeIndex === -1) return shiftKey ? "last" : "first";
  if (shiftKey && activeIndex === 0) return "last";
  if (!shiftKey && activeIndex === count - 1) return "first";
  return null;
}

export function isVisibleFocusableElement(element: HTMLElement) {
  return isFocusablePresentation({
    hidden: element.hidden,
    ariaHidden: element.getAttribute("aria-hidden"),
    inert: Boolean(element.closest("[inert]")),
    disabled: "disabled" in element && Boolean((element as HTMLButtonElement).disabled),
  });
}

export function isFocusablePresentation({
  hidden = false,
  ariaHidden = null,
  inert = false,
  disabled = false,
}: {
  hidden?: boolean;
  ariaHidden?: string | null;
  inert?: boolean;
  disabled?: boolean;
}) {
  return !hidden && ariaHidden !== "true" && !inert && !disabled;
}
