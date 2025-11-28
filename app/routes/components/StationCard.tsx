import { motion } from "framer-motion";
import { Text, ActionIcon, Button } from "@mantine/core";
import { IconBroadcast, IconPlayerPlayFilled, IconHeart } from "@tabler/icons-react";
import type { Station } from "~/types/radio";
import { vibrate } from "~/utils/haptics";
import { deriveStationHealth } from "~/utils/stationMeta";

type StationCardProps = {
  station: Station;
  index: number;
  isCurrent: boolean;
  onPlay: (station: Station) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (station: Station) => void;
  stationRef?: (element: HTMLDivElement | null) => void;
};

export function StationCard({
  station,
  index,
  isCurrent,
  onPlay,
  isFavorite = false,
  onToggleFavorite,
  stationRef,
}: StationCardProps) {
  const hasStream = Boolean(station.streamUrl);
  const healthMeta = deriveStationHealth(station);
  const reliabilityBadge = healthMeta
    ? {
      label: healthMeta.label,
      status: healthMeta.status,
    }
    : null;
  const languageLabel = station.language && station.languageCodes?.length
    ? `${station.language} • ${station.languageCodes.join(", ")}`
    : station.languageCodes?.length
      ? station.languageCodes.join(", ")
      : station.language ?? null;

  const tagBadges = station.tagList?.slice(0, 3);
  const bitrateLabel = station.bitrate > 0 ? `${station.bitrate} kbps` : null;
  const metaSummary = [languageLabel, bitrateLabel].filter(Boolean).join(" • ");

  const cardStatusClass = [
    isCurrent ? "station-card--active" : "",
    station.healthStatus === "error" ? "station-card--error" : "",
    station.healthStatus === "warning" ? "station-card--warn" : "",
    !hasStream ? "station-card--no-stream" : "",
    isFavorite ? "station-card--favorite" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const externalHref = getExternalHref(station);

  const statusTone = getStatusTone(reliabilityBadge?.status);
  const tags = tagBadges?.length ? tagBadges.join(" • ") : null;
  const supportingMeta = [metaSummary, tags].filter(Boolean).join(" • ");

  const primaryActionProps = hasStream
    ? {
      onClick: () => {
        vibrate(12);
        onPlay(station);
      },
    }
    : {
      component: "a" as const,
      href: station.homepage || externalHref || "#",
      target: "_blank",
      rel: "noreferrer",
    };

  return (
    <motion.div
      ref={stationRef}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className="h-full"
    >
      <div className={`station-card h-full flex flex-col ${cardStatusClass}`}>
        {/* Top content area - grows to fill space */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            <div className="relative aspect-[5/3] w-full overflow-hidden rounded-2xl border border-slate-300/30 bg-white sm:aspect-square sm:h-16 sm:w-16 sm:rounded-xl sm:border-slate-300/30 shadow-[2px_2px_4px_#b8b9be,-2px_-2px_4px_#ffffff]">
              {station.favicon ? (
                <img
                  src={station.favicon}
                  alt={station.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-slate-50 text-slate-400">
                  <IconBroadcast size={28} />
                </div>
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Text
                  fw={600}
                  size="md"
                  c="slate.9"
                  lineClamp={1}
                  data-testid="station-name"
                  className="tracking-tight"
                >
                  {station.name}
                </Text>
                {reliabilityBadge && (
                  <div className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-500 ring-1 ring-slate-900/5">
                    <span
                      className="inline-flex h-1.5 w-1.5 rounded-full"
                      style={{ background: statusTone?.dot }}
                    />
                    {reliabilityBadge.label}
                  </div>
                )}
              </div>
              {supportingMeta && (
                <Text size="xs" c="dimmed" lineClamp={2} className="text-slate-600">
                  {supportingMeta}
                </Text>
              )}
              {station.country && (
                <Text size="xs" c="slate.5" className="font-medium uppercase tracking-[0.2em]">
                  {station.country}
                </Text>
              )}
            </div>
          </div>
        </div>

        {/* Buttons section - fixed at bottom */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-auto pt-3">
          <Button
            radius="xl"
            size="sm"
            leftSection={<IconPlayerPlayFilled size={16} />}
            variant="default"
            className="flex-1 bg-[#e0e5ec] text-slate-700 border-0 shadow-[3px_3px_6px_#b8b9be,-3px_-3px_6px_#ffffff] active:shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff] transition-all hover:shadow-[4px_4px_8px_#b8b9be,-4px_-4px_8px_#ffffff]"
            aria-label={hasStream ? `Play ${station.name}` : `Visit ${station.name}`}
            {...primaryActionProps}
          >
            {hasStream ? "Play station" : "Visit station"}
          </Button>
          {onToggleFavorite && (
            <ActionIcon
              size="lg"
              radius="xl"
              onClick={() => {
                vibrate(10);
                onToggleFavorite?.(station);
              }}
              variant="subtle"
              color={isFavorite ? "red" : "gray"}
              className={`border-0 text-slate-500 transition hover:text-red-500 ${isFavorite ? "bg-rose-100 text-rose-500 shadow-[inset_2px_2px_4px_#b8b9be,inset_-2px_-2px_4px_#ffffff]" : "bg-[#e0e5ec] shadow-[2px_2px_4px_#b8b9be,-2px_-2px_4px_#ffffff] active:shadow-[inset_2px_2px_4px_#b8b9be,inset_-2px_-2px_4px_#ffffff]"}`}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? `Unfavorite ${station.name}` : `Favorite ${station.name}`}
            >
              <IconHeart size={18} fill={isFavorite ? "currentColor" : "none"} />
            </ActionIcon>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function getStatusTone(status?: string | null) {
  if (!status) {
    return null;
  }
  switch (status) {
    case "good":
      return { dot: "#4ade80" };
    case "warning":
      return { dot: "#facc15" };
    case "error":
      return { dot: "#f87171" };
    default:
      return { dot: "#94a3b8" };
  }
}

function getExternalHref(station: Station): string | undefined {
  const candidate = station.streamUrl || station.url;
  if (candidate) return candidate;
  if (station.homepage) return station.homepage;
  return undefined;
}
