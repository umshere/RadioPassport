import type {
  QueueSession,
  QueueSourceContext,
  QueueSourceType,
  Station,
} from "~/types/radio";

type QueueSessionInput = {
  sourceType: QueueSourceType;
  sourceLabel: string;
  stations: Station[];
  context?: QueueSourceContext | null;
  seed?: string | null;
};

export function createQueueSession({
  sourceType,
  sourceLabel,
  stations,
  context = null,
  seed,
}: QueueSessionInput): QueueSession {
  const identity =
    seed ??
    stations
      .slice(0, 16)
      .map((station) => station.uuid)
      .join(",");

  return {
    queueId: `${sourceType}:${sourceLabel}:${identity}`,
    queueSourceType: sourceType,
    queueSourceLabel: sourceLabel,
    queueSourceContext: context,
    stations,
  };
}

export function createDirectQueueSession(station: Station): QueueSession {
  return createQueueSession({
    sourceType: "direct",
    sourceLabel: "Direct Tune",
    stations: [station],
    context: {
      country: station.country,
      description: station.name,
    },
    seed: station.uuid,
  });
}
