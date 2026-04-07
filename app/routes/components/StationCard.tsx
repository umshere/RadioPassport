import { useMemo } from "react";
import { useElementSize } from "@mantine/hooks";
import { Text, ActionIcon, Button, Tooltip } from "@mantine/core";
import { IconPlayerPlayFilled, IconHeart, IconInfoCircle } from "@tabler/icons-react";
import { PretextMeasuredText } from "~/components/PretextMeasuredText";
import type { Station } from "~/types/radio";
import { vibrate } from "~/utils/haptics";
import { deriveStationHealth } from "~/utils/stationMeta";
import { getPretextLineCount } from "~/utils/pretextLayout";

type StationCardProps = {
  station: Station;
  isCurrent: boolean;
  onPlay: (station: Station) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (station: Station) => void;
  stationRef?: (element: HTMLDivElement | null) => void;
  isUnavailable?: boolean;
};

const STATION_TITLE_FONT =
  '700 17px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const STATION_NOTE_FONT =
  '600 12px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';

function compactSignalLabel(label?: string | null, isUnavailable = false): string | null {
  if (isUnavailable) return "Unavailable";
  if (!label) return null;
  return label
    .replace("Last checked OK · ", "")
    .replace("Last check failed · ", "Failed · ")
    .replace("Stream unavailable", "Unavailable");
}

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
  const { ref: contentRef, width: contentWidth } = useElementSize();
  const hasStream = Boolean(station.streamUrl);
  const healthMeta = deriveStationHealth(station);
  const streamCandidate = (station.streamUrl ?? station.url ?? "").trim().toLowerCase();
  const isHttpStream = streamCandidate.startsWith("http://");
  const isHlsStream = Boolean(station.hls);
  const signalLine = compactSignalLabel(healthMeta?.label, isUnavailable);
  const languageLine = station.language?.trim() || "Mixed";
  const regionLine = station.state?.trim() || "National";
  const usableWidth = Math.max(140, Math.floor(contentWidth || 0));
  const titleLineCount = useMemo(() => {
    if (!usableWidth) return 1;
    return getPretextLineCount(station.name, STATION_TITLE_FONT, usableWidth, 22) || 1;
  }, [station.name, usableWidth]);
  const compactMeta = usableWidth < 220 || titleLineCount > 1;
  const qualityLine = useMemo(() => {
    const parts: string[] = [];
    if (station.bitrate > 0) parts.push(`${station.bitrate} kbps`);
    if (station.codec && !compactMeta) parts.push(station.codec.toUpperCase());
    if (parts.length === 0 && station.codec) parts.push(station.codec.toUpperCase());
    return parts.join(" • ") || "Open stream";
  }, [compactMeta, station.bitrate, station.codec]);
  const styleLine = useMemo(() => {
    if (!station.tagList?.length) return null;
    const visibleCount = compactMeta ? 2 : 4;
    const visible = station.tagList.slice(0, visibleCount);
    const remaining = station.tagList.length - visible.length;
    return remaining > 0 ? `${visible.join(", ")} +${remaining}` : visible.join(", ");
  }, [compactMeta, station.tagList]);
  const detailLabel = styleLine ? "Style" : "Station note";
  const detailLine = useMemo(() => {
    if (styleLine) return styleLine;
    if (station.tagList?.length) return station.tagList.slice(0, compactMeta ? 2 : 3).join(", ");
    if (signalLine) return signalLine;
    if (station.country && station.language) return `${station.country} • ${station.language}`;
    return station.country || "Open stream";
  }, [compactMeta, signalLine, station.country, station.language, station.tagList, styleLine]);

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
    isCurrent
      ? "border-[rgba(245,177,45,0.58)] bg-[linear-gradient(180deg,rgba(42,33,20,0.98)_0%,rgba(22,18,14,0.95)_100%)]"
      : "border-[rgba(255,255,255,0.09)] bg-[linear-gradient(180deg,rgba(16,19,26,0.98)_0%,rgba(11,13,18,0.96)_100%)] hover:border-[rgba(245,177,45,0.24)]",
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
    <div
      ref={stationRef}
      className="relative z-0 h-full"
      style={{ contentVisibility: "auto", containIntrinsicSize: "360px" }}
    >
      <div
        className={`station-card group h-full flex flex-col rounded-[2rem] border p-5 transition-all duration-300 hover:z-30 hover:-translate-y-1 ${cardStatusClass}`}
        style={{
          position: 'relative',
          overflow: 'hidden',
          boxShadow: isCurrent
            ? '0 22px 44px -18px rgba(245, 177, 45, 0.34), 0 14px 30px -14px rgba(0, 0, 0, 0.62), inset 0 1px 0 rgba(255, 214, 127, 0.08)'
            : '0 14px 28px -16px rgba(0, 0, 0, 0.68), inset 0 1px 0 rgba(255,255,255,0.025)',
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.01) 34%, rgba(245,177,45,0.06) 100%)',
          }}
        />

        {isCurrent && (
          <div
            className="absolute inset-0 pointer-events-none opacity-100"
            style={{
              background: 'radial-gradient(circle at 50% 0%, rgba(245,177,45,0.16) 0%, rgba(245,177,45,0.04) 34%, transparent 74%)'
            }}
          />
        )}

        {isCurrent && (
          <div
            className="absolute inset-x-5 bottom-0 h-px pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(245,177,45,0.78) 18%, rgba(255,213,129,0.92) 50%, rgba(245,177,45,0.78) 82%, transparent 100%)',
              boxShadow: '0 0 14px rgba(245,177,45,0.4)',
            }}
          />
        )}


        {/* Top content area - grows to fill space */}
        <div className="relative z-10 flex flex-1 flex-col gap-3">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div
                className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl sm:h-16 sm:w-16 transition-all duration-300 group-hover:shadow-md"
                style={{
                  boxShadow: isCurrent
                    ? '0 10px 26px -8px rgba(245,177,45,0.48)'
                    : '0 8px 18px -10px rgba(0, 0, 0, 0.45)',
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

              <div ref={contentRef} className="flex min-w-0 flex-1 flex-col gap-2.5">
                <div className="min-w-0" data-testid="station-name">
                  <PretextMeasuredText
                    text={station.name}
                    font={STATION_TITLE_FONT}
                    lineHeight={22}
                    collapsedLines={2}
                    lineClassName="text-[15px] font-bold tracking-tight text-[var(--rp-text)]"
                    fallbackClassName="text-[15px] font-bold tracking-tight text-[var(--rp-text)]"
                  />
                </div>
                <Text size="xs" c="var(--rp-muted-2)" className="font-semibold uppercase tracking-[0.18em]">
                  {regionLine}
                </Text>
                <div className="flex flex-wrap items-center gap-1.5">
                  {statusDisplay && (
                    <div
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold"
                      style={{ background: "rgba(0,0,0,0.4)", color: "rgba(248,243,230,0.8)" }}
                    >
                      <span className="opacity-80">{statusDisplay.icon}</span>
                      <span>{statusDisplay.label}</span>
                    </div>
                  )}
                  {isHlsStream && (
                    <div
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: "rgba(245, 177, 45, 0.12)", color: "var(--rp-gold)" }}
                    >
                      HLS
                    </div>
                  )}
                  {isHttpStream && (
                    <div
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{ background: "rgba(245, 177, 45, 0.12)", color: "var(--rp-gold)" }}
                    >
                      HTTP
                    </div>
                  )}
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
                        className="opacity-50 transition-opacity hover:opacity-100"
                      >
                        <IconInfoCircle size={14} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-white/6 pt-3">
              <div className="min-w-0">
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--rp-muted-2)]">
                  Language
                </div>
                <Text size="sm" c="var(--rp-text)" fw={600} className="mt-1 leading-5">
                  {languageLine}
                </Text>
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--rp-muted-2)]">
                  Quality
                </div>
                <Text size="sm" c="var(--rp-text)" fw={600} className="mt-1 leading-5">
                  {qualityLine}
                </Text>
              </div>
              <div className="min-w-0 col-span-2">
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--rp-muted-2)]">
                  Freshness
                </div>
                <Text size="sm" c="var(--rp-text)" fw={600} className="mt-1 leading-5">
                  {signalLine ?? "Awaiting check"}
                </Text>
              </div>
            </div>

            <div className="mt-auto min-w-0 border-t border-white/6 pt-3">
              <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--rp-muted-2)]">
                {detailLabel}
              </div>
              <div className="mt-1">
                <PretextMeasuredText
                  text={detailLine}
                  font={STATION_NOTE_FONT}
                  lineHeight={17}
                  collapsedLines={2}
                  lineClassName="text-[12px] font-semibold text-[var(--rp-muted)]"
                  fallbackClassName="text-[12px] font-semibold text-[var(--rp-muted)]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Buttons section - remove border top, use auto margin */}
        <div className="relative z-10 mt-auto flex flex-col gap-2.5 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <Button
            radius="xl"
            size="sm"
            leftSection={<IconPlayerPlayFilled size={16} />}
            variant="filled"
            className="flex-1 text-white border-0 hover:-translate-y-[1px] transition-all active:translate-y-0"
            style={{
              background: isCurrent
                ? 'linear-gradient(135deg, #f5b12d 0%, #ffc857 100%)'
                : 'linear-gradient(135deg, #171b24 0%, #202636 100%)',
              color: isCurrent ? '#0b0c10' : 'var(--rp-text)',
              boxShadow: isCurrent
                ? '0 10px 24px -6px rgba(245,177,45,0.45)'
                : '0 8px 18px -8px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
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
