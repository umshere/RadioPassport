import type { Station } from "~/types/radio";

export type StationProbeStatus = "ok" | "slow" | "down" | "unknown";

type ProbeSnapshot = {
  probeStatus: StationProbeStatus;
  probeLatencyMs: number | null;
  probeCheckedAt: string;
};

const PROBE_CACHE_TTL_MS = 90_000;
const PROBE_CACHE_MAX_ENTRIES = 400;
const probeCache = new Map<
  string,
  { snapshot: ProbeSnapshot; expiresAt: number }
>();
const probeInFlight = new Map<string, Promise<ProbeSnapshot>>();

function withTimeout(timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
  };
}

function getProbeUrl(station: Station) {
  const candidate = station.streamUrl ?? station.url ?? "";
  const trimmed = candidate.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("//") ? `https:${trimmed}` : trimmed;
}

function getProbeCacheKey(station: Station, url: string) {
  return `${station.uuid}:${url}`;
}

function pruneProbeCache(now = Date.now()) {
  for (const [key, entry] of probeCache.entries()) {
    if (entry.expiresAt <= now) {
      probeCache.delete(key);
    }
  }

  while (probeCache.size > PROBE_CACHE_MAX_ENTRIES) {
    const oldestKey = probeCache.keys().next().value;
    if (!oldestKey) break;
    probeCache.delete(oldestKey);
  }
}

function getCachedProbe(key: string) {
  const now = Date.now();
  const cached = probeCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= now) {
    probeCache.delete(key);
    return null;
  }
  return cached.snapshot;
}

async function probeRequest(
  url: string,
  method: "HEAD" | "GET",
  timeoutMs: number,
) {
  const startedAt = Date.now();
  const { signal, cleanup } = withTimeout(timeoutMs);
  try {
    const response = await fetch(url, {
      method,
      redirect: "follow",
      headers:
        method === "GET"
          ? {
              Range: "bytes=0-1",
              "User-Agent": "radio-passport/1.0 (+probe)",
            }
          : {
              "User-Agent": "radio-passport/1.0 (+probe)",
            },
      signal,
    });

    const contentType = response.headers.get("content-type") ?? "";
    const latencyMs = Date.now() - startedAt;
    if (response.body) {
      try {
        await response.body.cancel();
      } catch {
        // Ignore body cancellation issues for streaming endpoints.
      }
    }

    if (!response.ok) {
      return {
        ok: false,
        latencyMs,
        status: response.status,
        contentType,
      };
    }

    if (contentType.includes("text/html")) {
      return {
        ok: false,
        latencyMs,
        status: response.status,
        contentType,
      };
    }

    return {
      ok: true,
      latencyMs,
      status: response.status,
      contentType,
    };
  } catch {
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
      status: 0,
      contentType: "",
    };
  } finally {
    cleanup();
  }
}

async function resolveProbeSnapshot(
  station: Station,
  url: string,
): Promise<ProbeSnapshot> {
  const cacheKey = getProbeCacheKey(station, url);
  pruneProbeCache();

  const cached = getCachedProbe(cacheKey);
  if (cached) {
    return cached;
  }

  const pending = probeInFlight.get(cacheKey);
  if (pending) {
    return pending;
  }

  const probePromise = (async () => {
    const headResult = await probeRequest(url, "HEAD", 2800);
    const finalResult = headResult.ok
      ? headResult
      : await probeRequest(url, "GET", 3200);
    const snapshot: ProbeSnapshot = {
      probeStatus: finalResult.ok
        ? finalResult.latencyMs > 1800
          ? "slow"
          : "ok"
        : "down",
      probeLatencyMs: finalResult.latencyMs,
      probeCheckedAt: new Date().toISOString(),
    };

    probeCache.set(cacheKey, {
      snapshot,
      expiresAt: Date.now() + PROBE_CACHE_TTL_MS,
    });
    pruneProbeCache();
    return snapshot;
  })();

  probeInFlight.set(cacheKey, probePromise);

  try {
    return await probePromise;
  } finally {
    probeInFlight.delete(cacheKey);
  }
}

export async function probeStationStream(station: Station): Promise<Station> {
  const url = getProbeUrl(station);
  if (!url) {
    return {
      ...station,
      probeStatus: "unknown",
      probeLatencyMs: null,
      probeCheckedAt: new Date().toISOString(),
    };
  }

  const snapshot = await resolveProbeSnapshot(station, url);

  return {
    ...station,
    ...snapshot,
  };
}

export async function probeShelfStations(
  stations: Station[],
  limit = 5,
): Promise<Station[]> {
  if (!Array.isArray(stations) || stations.length === 0) return [];

  const probeTargets = stations.slice(0, limit);
  const results = await Promise.all(
    probeTargets.map((station) => probeStationStream(station)),
  );
  const resultMap = new Map(results.map((station) => [station.uuid, station]));

  return stations.map((station) => resultMap.get(station.uuid) ?? station);
}
