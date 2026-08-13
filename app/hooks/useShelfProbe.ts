import { useEffect, useMemo, useRef, useState } from "react";
import type { Station } from "~/types/radio";
import { applyLiveCatalog } from "~/utils/stationMeta";

type ProbePatch = {
  uuid: string;
  probeStatus?: Station["probeStatus"];
  probeLatencyMs?: Station["probeLatencyMs"];
  probeCheckedAt?: Station["probeCheckedAt"];
};

const SHELF = 8;
const MAX_PROBED = 36;

export function useShelfProbe(stations: Station[], key = "default") {
  const [patches, setPatches] = useState<Record<string, ProbePatch>>({});
  const askedRef = useRef(new Set<string>());
  const identity = `${stations.length}:${stations
    .slice(0, MAX_PROBED)
    .map((station) => station.uuid)
    .join(",")}`;

  useEffect(() => {
    askedRef.current = new Set();
    setPatches({});
  }, [key]);

  useEffect(() => {
    if (askedRef.current.size >= MAX_PROBED) return;
    const batch = stations
      .filter((station) => !askedRef.current.has(station.uuid))
      .slice(0, SHELF);
    if (!batch.length) return;
    batch.forEach((station) => askedRef.current.add(station.uuid));

    let cancelled = false;
    void fetch("/api/stations/probe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stations: batch.map((station) => ({
          uuid: station.uuid,
          url: station.url,
          streamUrl: station.streamUrl,
        })),
      }),
    })
      .then(async (response) =>
        response.ok
          ? ((await response.json()) as { stations?: ProbePatch[] })
          : { stations: [] }
      )
      .then((payload) => {
        if (cancelled) return;
        const next = payload.stations ?? [];
        if (!next.length) return;
        setPatches((current) => {
          const merged = { ...current };
          for (const patch of next) {
            if (patch.uuid) merged[patch.uuid] = patch;
          }
          return merged;
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [identity, key, patches, stations]);

  return useMemo(() => {
    const merged = stations.map((station) => {
      const patch = patches[station.uuid];
      return patch ? { ...station, ...patch } : station;
    });
    return applyLiveCatalog(merged);
  }, [patches, stations]);
}
