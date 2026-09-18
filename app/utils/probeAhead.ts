import type { Station } from "~/types/radio";
import { isMixedContentStream } from "~/utils/streamHeuristics";

export const PROBE_AHEAD_LIMIT = 3;

type ProbeStatus = Station["probeStatus"];

export function probeStatusOf(
  station: Station,
  patches: Record<string, ProbeStatus | undefined> = {}
): ProbeStatus | undefined {
  return patches[station.uuid] ?? station.probeStatus;
}

/** Next lands after the one on the dial — bounded, never the full queue. */
export function nextProbeTargets(
  queue: Station[],
  startIndex: number,
  limit = PROBE_AHEAD_LIMIT
): Station[] {
  if (!queue.length || limit <= 0) return [];
  const start = Math.max(0, startIndex);
  const seen = new Set<string>();
  const out: Station[] = [];
  for (let offset = 1; offset <= queue.length && out.length < limit; offset++) {
    const station = queue[(start + offset) % queue.length];
    if (!station || seen.has(station.uuid)) continue;
    seen.add(station.uuid);
    out.push(station);
  }
  return out;
}

export function pickSkipCandidate(opts: {
  queue: Station[];
  startIndex: number;
  pinnedId?: string | null;
  protocol: string;
  now?: number;
  unavailable?: (uuid: string, now: number) => boolean;
  probes?: Record<string, ProbeStatus | undefined>;
}): Station | null {
  const {
    queue,
    startIndex,
    pinnedId,
    protocol,
    now = Date.now(),
    unavailable,
    probes = {},
  } = opts;
  if (queue.length <= 1) return null;
  const start = Math.max(0, startIndex);
  const eligible: Station[] = [];
  for (let offset = 1; offset <= queue.length; offset++) {
    const station = queue[(start + offset) % queue.length];
    if (!station) continue;
    if (pinnedId && station.uuid === pinnedId) continue;
    if (unavailable?.(station.uuid, now)) continue;
    const url = station.streamUrl ?? station.url ?? "";
    if (isMixedContentStream(url, protocol)) continue;
    if (probeStatusOf(station, probes) === "down") continue;
    eligible.push(station);
  }
  return (
    eligible.find((station) => {
      const status = probeStatusOf(station, probes);
      return status === "ok" || status === "slow";
    }) ??
    eligible[0] ??
    null
  );
}

export function shouldSkipBeforePlay(
  station: Station,
  protocol: string,
  probes: Record<string, ProbeStatus | undefined> = {}
): "mixed_content" | "unknown" | null {
  const url = station.streamUrl ?? station.url ?? "";
  if (isMixedContentStream(url, protocol)) return "mixed_content";
  if (probeStatusOf(station, probes) === "down") return "unknown";
  return null;
}
