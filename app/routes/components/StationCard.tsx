import { motion } from "framer-motion";
import { useMemo } from "react";
import { Text, ActionIcon, Button, Tooltip } from "@mantine/core";
import { IconPlayerPlayFilled, IconHeart, IconInfoCircle } from "@tabler/icons-react";
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
  index,
  isCurrent,
  onPlay,
  isFavorite = false,
  onToggleFavorite,
  stationRef,
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
    station.healthStatus === "error" ? "station-card--error" : "",
    station.healthStatus === "warning" ? "station-card--warn" : "",
    !hasStream ? "station-card--no-stream" : "",
    isFavorite ? "station-card--favorite" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const externalHref = getExternalHref(station);
  const statusDisplay = getStatusDisplay(healthMeta?.status);
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
    <motion.div
      ref={stationRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.02 }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <div
        className={`station-card group h-full flex flex-col rounded-2xl p-4 transition-all hover:-translate-y-1 ${cardStatusClass}`}
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,250,245,0.9) 100%)',
          boxShadow: isCurrent
            ? '0 12px 35px -8px rgba(251,146,60,0.35), 0 0 0 2px rgba(251,146,60,0.3), inset 0 1px 0 rgba(255,255,255,1)'
            : '0 8px 25px -8px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.8), inset 0 1px 0 rgba(255,255,255,1)',
        }}
      >
        {/* Warm decorative gradient overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-30"
          style={{
            background: 'radial-gradient(ellipse at top right, rgba(251,191,36,0.15) 0%, transparent 50%), radial-gradient(ellipse at bottom left, rgba(244,114,182,0.1) 0%, transparent 50%)',
          }}
        />

        {/* Top content area - grows to fill space */}
        <div className="relative z-10 flex flex-1 flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            {/* Station Image with auto-generated fallback */}
            <div
              className="relative h-14 w-14 overflow-hidden rounded-xl sm:h-16 sm:w-16 transition-all duration-300"
              style={{
                boxShadow: isCurrent
                  ? '0 6px 20px -4px rgba(251,146,60,0.4), 0 0 0 2px rgba(255,255,255,0.9)'
                  : '0 4px 12px -4px rgba(0,0,0,0.15), 0 0 0 2px rgba(255,255,255,0.8)',
              }}
            >
              {station.favicon ? (
                <img
                  src={station.favicon}
                  alt={station.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    // Hide broken image and show fallback
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              {/* Always render fallback, hidden when favicon exists and loads */}
              <div
                className="absolute inset-0 flex h-full w-full items-center justify-center text-white font-bold text-base sm:text-lg"
                style={{
                  background: fallbackGradient,
                  display: station.favicon ? 'none' : 'flex'
                }}
              >
                {initials}
              </div>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Text
                  fw={700}
                  size="md"
                  c="slate.9"
                  lineClamp={1}
                  data-testid="station-name"
                  className="tracking-tight"
                >
                  {station.name}
                </Text>
                {/* User-friendly status badge */}
                {statusDisplay && (
                  <div className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold border" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(254,243,199,0.5) 100%)', borderColor: 'rgba(251,191,36,0.2)', color: '#78716c' }}>
                    <span>{statusDisplay.icon}</span>
                    <span>{statusDisplay.label}</span>
                  </div>
                )}
                {isHlsStream && (
                  <div className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border" style={{ background: "rgba(15, 23, 42, 0.04)", borderColor: "rgba(15, 23, 42, 0.10)", color: "#475569" }}>
                    HLS
                  </div>
                )}
                {isHttpStream && (
                  <div className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border" style={{ background: "rgba(239, 68, 68, 0.06)", borderColor: "rgba(239, 68, 68, 0.20)", color: "#b91c1c" }}>
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
                <Text size="xs" c="dimmed" lineClamp={1} className="text-slate-500 font-medium">
                  {secondaryInfo}
                </Text>
              )}
            </div>
          </div>
        </div>

        {/* Buttons section - fixed at bottom */}
        <div className="relative z-10 mt-auto flex flex-col gap-2.5 border-t pt-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'rgba(251,191,36,0.15)' }}>
          <Button
            radius="xl"
            size="sm"
            leftSection={<IconPlayerPlayFilled size={16} />}
            variant="filled"
            className="flex-1 text-white border-0 hover:-translate-y-[1px] transition-all active:translate-y-0"
            style={{
              background: isCurrent
                ? 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)'
                : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              boxShadow: isCurrent
                ? '0 8px 20px -4px rgba(251,146,60,0.5)'
                : '0 6px 16px -4px rgba(15,23,42,0.25)',
            }}
            aria-label={hasStream ? `Play ${station.name}` : `Visit ${station.name}`}
            {...primaryActionProps}
          >
            {hasStream ? "Play" : "Visit"}
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
                background: isFavorite ? 'linear-gradient(135deg, #fef2f2 0%, #ffe4e6 100%)' : 'rgba(255,255,255,0.5)',
                color: isFavorite ? '#f43f5e' : '#9ca3af',
                boxShadow: isFavorite ? '0 4px 12px -4px rgba(244,63,94,0.3)' : 'none',
              }}
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

function getExternalHref(station: Station): string | undefined {
  const candidate = station.streamUrl || station.url;
  if (candidate) return candidate;
  if (station.homepage) return station.homepage;
  return undefined;
}
