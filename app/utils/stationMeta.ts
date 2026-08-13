import type { CSSProperties } from "react";
import type { Station } from "~/types/radio";

export type StationHealthStatus = "good" | "warning" | "error";

export type StationHealthMeta = {
  status: StationHealthStatus;
  label: string;
};

export type StationAvailabilityMeta = {
  tone: "available" | "slow" | "retry" | "unknown";
  shortLabel: string;
  detailLabel: string;
};

export function getHealthBadgeStyle(status: StationHealthStatus): CSSProperties {
  switch (status) {
    case "error":
      return {
        background: "#fee2e2",
        border: "1px solid #fca5a5",
        color: "#991b1b",
      };
    case "warning":
      return {
        background: "#fef3c7",
        border: "1px solid #fcd34d",
        color: "#92400e",
      };
    default:
      return {
        background: "#d1fae5",
        border: "1px solid #6ee7b7",
        color: "#065f46",
      };
  }
}

/** Catalog metadata older than this is stale evidence, not a current health signal. */
export const HEALTH_FRESHNESS_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function isEvidenceFresh(
  iso?: string | null,
  now = Date.now(),
  windowMs = HEALTH_FRESHNESS_WINDOW_MS
): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return now - date.getTime() <= windowMs;
}

export function deriveStationHealth(station: Station): StationHealthMeta | null {
  const { healthStatus, sslError, lastCheckOk, lastCheckOkTime } = station;
  const relative = lastCheckOkTime ? formatRelativeTime(lastCheckOkTime) : null;

  if (healthStatus === "error") {
    return { status: "error", label: "Stream unavailable" };
  }

  if (healthStatus === "warning" || sslError || lastCheckOk === false) {
    return {
      status: "warning",
      label: relative ? `Last check failed · ${relative}` : "Stream check failed",
    };
  }

  if ((healthStatus === "good" || lastCheckOk) && relative) {
    return isEvidenceFresh(lastCheckOkTime)
      ? { status: "good", label: `Last checked OK · ${relative}` }
      : { status: "warning", label: `Not recently verified · ${relative}` };
  }

  return null;
}

export function streamUrlOf(station: Station) {
  return (station.streamUrl || station.url || "").trim();
}

/** HTTPS page cannot play plaintext HTTP radio. */
export function isSecureStreamUrl(url: string) {
  if (!url) return false;
  if (url.startsWith("//")) return true;
  if (url.startsWith("/")) return true;
  return /^https:\/\//i.test(url);
}

/**
 * Catalog-level "likely streaming" — never a live guarantee.
 * Confirmed-down probes and fresh Radio Browser failures drop out.
 * Unprobed stations stay until a live check says otherwise.
 */
export function isCatalogLikelyStreaming(station: Station, now = Date.now()) {
  if (!isSecureStreamUrl(streamUrlOf(station))) return false;
  if (station.probeStatus === "down") return false;
  if (station.healthStatus === "error") return false;
  if (station.sslError) return false;
  if (
    station.lastCheckOk === false &&
    isEvidenceFresh(station.lastCheckOkTime, now)
  ) {
    return false;
  }
  return true;
}

export function applyLiveCatalog(stations: Station[]) {
  return rankStations(stations.filter((station) => isCatalogLikelyStreaming(station)));
}

export function deriveStationAvailability(
  station: Station,
  isUnavailable = false
): StationAvailabilityMeta {
  if (isUnavailable || station.probeStatus === "down" || station.healthStatus === "error") {
    return {
      tone: "retry",
      shortLabel: "Unavailable",
      detailLabel: "Needs retry",
    };
  }

  if (station.probeStatus === "ok") {
    return {
      tone: "available",
      shortLabel: "Available now",
      detailLabel: "Checked live",
    };
  }

  if (station.probeStatus === "slow") {
    return {
      tone: "slow",
      shortLabel: "Slow response",
      detailLabel: "Live but sluggish",
    };
  }

  if (station.healthStatus === "good" || station.isStreamHealthy) {
    return isEvidenceFresh(station.lastCheckOkTime)
      ? {
          tone: "available",
          shortLabel: "Likely available",
          detailLabel: "Healthy stream",
        }
      : {
          tone: "unknown",
          shortLabel: "Not recently verified",
          detailLabel: "Not recently verified",
        };
  }

  if (station.healthStatus === "warning") {
    return {
      tone: "slow",
      shortLabel: "Check stream",
      detailLabel: "Recent warning",
    };
  }

  return {
    tone: "unknown",
    shortLabel: "Awaiting check",
    detailLabel: "No live probe yet",
  };
}

export function formatRelativeTime(iso: string, locale = "en"): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const diffMs = Date.now() - date.getTime();
  const absDiff = Math.abs(diffMs);

  const units: Array<{ limit: number; divisor: number; label: Intl.RelativeTimeFormatUnit }> = [
    { limit: 60_000, divisor: 1000, label: "second" },
    { limit: 3_600_000, divisor: 60_000, label: "minute" },
    { limit: 86_400_000, divisor: 3_600_000, label: "hour" },
    { limit: 604_800_000, divisor: 86_400_000, label: "day" },
    { limit: 2_592_000_000, divisor: 604_800_000, label: "week" },
    { limit: 31_536_000_000, divisor: 2_592_000_000, label: "month" },
  ];

  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const unit of units) {
    if (absDiff < unit.limit) {
      const value = Math.round(diffMs / unit.divisor);
      return formatter.format(-value, unit.label);
    }
  }

  const years = Math.round(diffMs / 31_536_000_000);
  return formatter.format(-years, "year");
}

export function scoreStation(
  station: Station,
  options: { recentPosition?: number } = {}
): number {
  let score = 0;

  if (!station.streamUrl && !station.url) {
    score -= 120;
  }

  switch (station.healthStatus) {
    case "good":
      score += 40;
      break;
    case "warning":
      score -= 30;
      break;
    case "error":
      score -= 120;
      break;
    default:
      break;
  }

  if (station.isStreamHealthy) score += 10;

  switch (station.probeStatus) {
    case "ok":
      score += 60;
      break;
    case "slow":
      score += 15;
      break;
    case "down":
      score -= 200;
      break;
    default:
      break;
  }

  if (isEvidenceFresh(station.lastCheckOkTime)) {
    score += 10;
  }

  if (typeof station.clickTrend === "number") {
    score += Math.max(Math.min(station.clickTrend, 60), -40);
  }

  if (typeof station.votes === "number") {
    score += Math.min(Math.floor(station.votes / 1000), 25);
  }

  if (typeof station.clickCount === "number") {
    score += Math.min(Math.floor(station.clickCount / 5000), 20);
  }

  if (options.recentPosition !== undefined) {
    score += Math.max(30 - options.recentPosition * 4, 0);
  }

  return score;
}

export function rankStations(
  stations: Station[],
  opts: { recentOrder?: Map<string, number> } = {}
): Station[] {
  return [...stations]
    .map((station, index) => ({
      station,
      score: scoreStation(station, {
        recentPosition: opts.recentOrder?.get(station.uuid),
      }),
      index,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.index - b.index;
    })
    .map((entry) => entry.station);
}

export function pickTopStation(
  stations: Station[],
  opts: { recentOrder?: Map<string, number> } = {}
): Station | undefined {
  return rankStations(stations, opts)[0];
}
