import { useMemo } from "react";
import { Text, ActionIcon, Button, Tooltip } from "@mantine/core";
import { IconPlayerPlayFilled, IconHeart, IconInfoCircle } from "@tabler/icons-react";
import type { Station } from "~/types/radio";
import { vibrate } from "~/utils/haptics";
import { deriveStationHealth } from "~/utils/stationMeta";

type StationCardProps = {
  station: Station;
  isCurrent: boolean;
  onPlay: (station: Station) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (station: Station) => void;
  stationRef?: (element: HTMLDivElement | null) => void;
  isUnavailable?: boolean;
};

// Generate a vibrant gradient background for stations without favicons
function generateFallbackGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Warm vibrant color palette: amber, orange, rose, violet, indigo
  const vibrantHues = [25, 35, 45, 280, 320, 350, 260, 230];
  const h1 = vibrantHues[Math.abs(hash) % vibrantHues.length] ?? 35;
  const h2 = (h1 + 30) % 360;
  return `linear-gradient(135deg, hsl(${h1}, 85%, 60%) 0%, hsl(${h2}, 75%, 50%) 100%)`;
}

// Get station initials for fallback image
function getStationInitials(name: string): string {
  const words = name.split(/\s+/).filter(w => w.length > 0);
  if (words.length >= 2 && words[0] && words[1] && words[0][0] && words[1][0]) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Convert status to user-friendly display
function getStatusDisplay(status?: string | null): { icon: string; label: string } | null {
  if (!status) return null;
  switch (status) {
    case "good":
      return { icon: "🟢", label: "Live" };
    case "warning":
      return { icon: "🟡", label: "Unstable" };
    case "error":
      return { icon: "🔴", label: "Offline" };
    default:
      return { icon: "⚪", label: "Unknown" };
  }
}

export function StationCard({
  station,
  isCurrent,
  onPlay,
  isFavorite = false,
  onToggleFavorite,
  stationRef,
  isUnavailable = false,
}: StationCardProps) {
  const hasStream = Boolean(station.streamUrl);
  const healthMeta = deriveStationHealth(station);
  const streamCandidate = (station.streamUrl ?? station.url ?? "").trim().toLowerCase();
  const isHttpStream = streamCandidate.startsWith("http://");
  const isHlsStream = Boolean(station.hls);

  // Simplified: show only language OR primary genre (not both)
  const secondaryInfo = useMemo(() => {
    if (station.language) return station.language;
    if (station.tagList?.length) return station.tagList[0];
    return null;
  }, [station.language, station.tagList]);

  // Diagnostics for tooltip (hidden by default)
  const diagnosticInfo = useMemo(() => {
    const parts: string[] = [];
    if (station.bitrate > 0) parts.push(`${station.bitrate} kbps`);
    if (station.languageCodes?.length) parts.push(station.languageCodes.join(", "));
    if (healthMeta?.label) parts.push(healthMeta.label);
    if (station.tagList && station.tagList.length > 1) parts.push(`Tags: ${station.tagList.slice(0, 3).join(", ")}`);
    return parts.join(" • ");
  }, [station.bitrate, station.languageCodes, station.tagList, healthMeta]);

  const cardStatusClass = [
    isCurrent ? "station-card--active" : "",
    station.healthStatus === "error" || isUnavailable ? "station-card--error" : "",
    station.healthStatus === "warning" ? "station-card--warn" : "",
    !hasStream ? "station-card--no-stream" : "",
    isFavorite ? "station-card--favorite" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const externalHref = getExternalHref(station);
  const statusDisplay = isUnavailable ? { icon: "🔴", label: "Unavailable" } : getStatusDisplay(healthMeta?.status);
  const fallbackGradient = generateFallbackGradient(station.name);
  const initials = getStationInitials(station.name);

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
    <div ref={stationRef} className="h-full">
      <div
        className={`station-card group h-full flex flex-col rounded-[2rem] p-5 transition-all duration-300 hover:-translate-y-1.5 ${cardStatusClass}`}
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: isCurrent
            ? 'rgba(12, 14, 20, 0.9)'
            : 'rgba(12, 14, 20, 0.7)',
          backdropFilter: 'blur(12px)',
          boxShadow: isCurrent
            ? '0 20px 40px -12px rgba(245, 177, 45, 0.35), 0 8px 16px -8px rgba(0, 0, 0, 0.5)'
            : '0 12px 28px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Subtle nice glow for active state instead of heavy gradient */}
        {isCurrent && (
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              background: 'radial-gradient(circle at 50% 0%, rgba(245,177,45,0.4) 0%, transparent 70%)'
            }}
          />
        )}


        {/* Top content area - grows to fill space */}
        <div className="relative z-10 flex flex-1 flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            {/* Station Image with cleaner shadow */}
            <div
              className="relative h-14 w-14 overflow-hidden rounded-2xl sm:h-16 sm:w-16 transition-all duration-300 group-hover:shadow-md"
              style={{
                boxShadow: isCurrent
                  ? '0 8px 24px -6px rgba(251, 146, 60, 0.5)'
                  : '0 4px 12px -4px rgba(0, 0, 0, 0.08)',
              }}
            >
              <div
                className="absolute inset-0 flex h-full w-full items-center justify-center text-white font-bold text-base sm:text-lg"
                style={{
                  background: fallbackGradient,
                }}
              >
                {initials}
              </div>
              {station.favicon ? (
                <img
                  src={station.favicon}
                  alt={station.name}
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Text
                  fw={700}
                  size="md"
                  c="var(--rp-text)"
                  lineClamp={1}
                  data-testid="station-name"
                  className="tracking-tight"
                >
                  {station.name}
                </Text>
                {/* User-friendly status badge - simplified */}
                {statusDisplay && (
                  <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: 'rgba(0,0,0,0.4)', color: 'rgba(248,243,230,0.8)' }}>
                    <span className="opacity-80">{statusDisplay.icon}</span>
                    <span>{statusDisplay.label}</span>
                  </div>
                )}
                {isHlsStream && (
                  <div className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "rgba(245, 177, 45, 0.12)", color: "var(--rp-gold)" }}>
                    HLS
                  </div>
                )}
                {isHttpStream && (
                  <div className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "rgba(245, 177, 45, 0.12)", color: "var(--rp-gold)" }}>
                    HTTP
                  </div>
                )}
                {/* Diagnostics tooltip */}
                {diagnosticInfo && (
                  <Tooltip
                    label={diagnosticInfo}
                    position="top"
                    withArrow
                    multiline
                    w={220}
                  >
                    <ActionIcon
                      variant="transparent"
                      size="xs"
                      color="gray"
                      className="opacity-50 hover:opacity-100"
                    >
                      <IconInfoCircle size={14} />
                    </ActionIcon>
                  </Tooltip>
                )}
              </div>
              {/* Single secondary info line */}
              {secondaryInfo && (
                <Text size="xs" c="var(--rp-muted)" lineClamp={1} className="font-medium">
                  {secondaryInfo}
                </Text>
              )}
            </div>
          </div>
        </div>

        {/* Buttons section - remove border top, use auto margin */}
        <div className="relative z-10 mt-auto flex flex-col gap-2.5 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button
            radius="xl"
            size="sm"
            leftSection={<IconPlayerPlayFilled size={16} />}
            variant="filled"
            className="flex-1 text-white border-0 hover:-translate-y-[1px] transition-all active:translate-y-0"
            style={{
              background: isCurrent
                ? 'linear-gradient(135deg, #f5b12d 0%, #ffc857 100%)'
                : 'linear-gradient(135deg, #0f1118 0%, #1b2031 100%)',
              color: isCurrent ? '#0b0c10' : 'var(--rp-text)',
              boxShadow: isCurrent
                ? '0 10px 24px -6px rgba(245,177,45,0.45)'
                : '0 8px 18px -6px rgba(0,0,0,0.5)',
            }}
            aria-label={hasStream ? `Play ${station.name}` : `Visit ${station.name}`}
            {...primaryActionProps}
          >
            {hasStream ? (isUnavailable ? "Retry" : "Play") : "Visit"}
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
              className="border-0 transition-all"
              style={{
                background: isFavorite ? 'rgba(245, 177, 45, 0.18)' : 'rgba(0,0,0,0.45)',
                color: isFavorite ? 'var(--rp-gold)' : 'rgba(248,243,230,0.6)',
                boxShadow: isFavorite ? '0 8px 20px -6px rgba(245,177,45,0.35)' : '0 8px 18px -8px rgba(0,0,0,0.5)',
              }}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? `Unfavorite ${station.name}` : `Favorite ${station.name}`}
            >
              <IconHeart size={18} fill={isFavorite ? "currentColor" : "none"} />
            </ActionIcon>
          )}
        </div>
      </div>
    </div>
  );
}

function getExternalHref(station: Station): string | undefined {
  const candidate = station.streamUrl || station.url;
  if (candidate) return candidate;
  if (station.homepage) return station.homepage;
  return undefined;
}
