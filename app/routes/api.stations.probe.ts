import { json, type ActionFunctionArgs } from "@remix-run/node";
import { probeShelfStations } from "~/server/stations/probe";
import type { Station } from "~/types/radio";

/** Bounds the live-probe fan-out to a small, leading shelf — never the full catalog. */
const MAX_PROBE_TARGETS = 8;

type ProbeRequestStation = {
  uuid: string;
  url?: string | null;
  streamUrl?: string | null;
};

function isProbeRequestStation(value: unknown): value is ProbeRequestStation {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof (value as { uuid?: unknown }).uuid === "string" &&
    (value as { uuid: string }).uuid.length > 0
  );
}

function toProbeTarget(entry: ProbeRequestStation): Station {
  return {
    uuid: entry.uuid,
    name: "",
    url: entry.url ?? "",
    streamUrl: entry.streamUrl ?? entry.url ?? null,
    favicon: "",
    country: "",
    state: null,
    language: null,
    tags: null,
    bitrate: 0,
    codec: null,
  };
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ stations: [] }, { status: 405 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ stations: [] }, { status: 400 });
  }

  const rawStations = Array.isArray((body as { stations?: unknown })?.stations)
    ? (body as { stations: unknown[] }).stations
    : [];

  const targets = rawStations
    .filter(isProbeRequestStation)
    .slice(0, MAX_PROBE_TARGETS)
    .map(toProbeTarget);

  if (!targets.length) {
    return json({ stations: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const probed = await probeShelfStations(targets, targets.length);

  return json(
    {
      stations: probed.map((station) => ({
        uuid: station.uuid,
        probeStatus: station.probeStatus,
        probeLatencyMs: station.probeLatencyMs,
        probeCheckedAt: station.probeCheckedAt,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
