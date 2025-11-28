import type { Station } from "~/types/radio";

export type StationFilterSort = "featured" | "recent" | "bitrateHigh" | "bitrateLow";

export type StationFilterState = {
  language: string | null;
  region: string | null;
  mood: string | null;
  minBitrate: number | null;
  sort: StationFilterSort;
};

export type StationFilterOption = {
  label: string;
  value: string;
  count: number;
};

export type StationFilterOptions = {
  languages: StationFilterOption[];
  regions: StationFilterOption[];
  moods: StationFilterOption[];
  qualitySteps: number[];
};

export const createDefaultStationFilters = (): StationFilterState => ({
  language: null,
  region: null,
  mood: null,
  minBitrate: null,
  sort: "featured",
});

export function deriveStationFilterOptions(stations: Station[]): StationFilterOptions {
  const languages = new Map<string, StationFilterOption>();
  const regions = new Map<string, StationFilterOption>();
  const moods = new Map<string, StationFilterOption>();
  let maxBitrate = 0;

  for (const station of stations) {
    for (const lang of extractLanguages(station)) {
      trackOption(languages, lang);
    }

    if (station.state) {
      trackOption(regions, station.state);
    }

    for (const tag of extractMoods(station)) {
      trackOption(moods, tag);
    }

    if (station.bitrate > maxBitrate) {
      maxBitrate = station.bitrate;
    }
  }

  return {
    languages: sortOptions(languages),
    regions: sortOptions(regions),
    moods: sortOptions(moods).slice(0, 20),
    qualitySteps: deriveQualitySteps(maxBitrate),
  };
}

export function applyStationFilters(stations: Station[], filters: StationFilterState): Station[] {
  if (!stations.length) return [];

  const minBitrate = filters.minBitrate ?? 0;

  const filtered = stations.filter((station) => {
    if (filters.language) {
      const tokens = extractLanguages(station)
        .map(normalizeToken)
        .filter((token): token is string => Boolean(token));
      if (!tokens.includes(filters.language)) return false;
    }

    if (filters.region) {
      if (normalizeToken(station.state) !== filters.region) return false;
    }

    if (filters.mood) {
      const tags = extractMoods(station)
        .map(normalizeToken)
        .filter((token): token is string => Boolean(token));
      if (!tags.includes(filters.mood)) return false;
    }

    if (minBitrate > 0 && station.bitrate < minBitrate) {
      return false;
    }

    return true;
  });

  if (filters.sort === "featured") {
    return filtered;
  }

  const sorted = [...filtered];
  switch (filters.sort) {
    case "recent":
      sorted.sort((a, b) => getLastCheckTimestamp(b) - getLastCheckTimestamp(a));
      break;
    case "bitrateHigh":
      sorted.sort((a, b) => b.bitrate - a.bitrate);
      break;
    case "bitrateLow":
      sorted.sort((a, b) => a.bitrate - b.bitrate);
      break;
    default:
      break;
  }

  return sorted;
}

export function isStationFilterDirty(filters: StationFilterState): boolean {
  return Boolean(
    filters.language ||
      filters.region ||
      filters.mood ||
      (filters.minBitrate ?? 0) > 0 ||
      filters.sort !== "featured"
  );
}

function extractLanguages(station: Station): string[] {
  const labels: string[] = [];
  if (station.language) {
    const raw = station.language.split(",");
    for (const item of raw) {
      const trimmed = item.trim();
      if (trimmed) labels.push(trimmed);
    }
  }

  if (!labels.length && station.languageCodes?.length) {
    for (const code of station.languageCodes) {
      if (code.trim()) labels.push(code.trim());
    }
  }

  return labels;
}

function extractMoods(station: Station): string[] {
  if (!Array.isArray(station.tagList)) return [];
  return station.tagList.filter(Boolean).map((tag) => tag.trim()).filter(Boolean);
}

function trackOption(map: Map<string, StationFilterOption>, rawValue: string) {
  const normalized = normalizeToken(rawValue);
  if (!normalized) return;
  const label = formatFilterLabel(rawValue);
  const existing = map.get(normalized);
  if (existing) {
    existing.count += 1;
    return;
  }
  map.set(normalized, { label, value: normalized, count: 1 });
}

function sortOptions(map: Map<string, StationFilterOption>): StationFilterOption[] {
  return Array.from(map.values()).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.label.localeCompare(b.label);
  });
}

function deriveQualitySteps(maxBitrate: number): number[] {
  if (!Number.isFinite(maxBitrate) || maxBitrate <= 0) return [];
  const steps = [64, 96, 128, 160, 192, 256, 320];
  return steps.filter((step) => step <= maxBitrate + 16);
}

function normalizeToken(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
}

function formatFilterLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^[a-z]{1,3}$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  return trimmed.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function getLastCheckTimestamp(station: Station): number {
  const iso = station.lastCheckOkTime || station.lastCheckTime || station.lastLocalCheckTime;
  if (!iso) return 0;
  const timestamp = Date.parse(iso);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}
