import { IconPlayerPlayFilled, IconHeart, IconHeartFilled } from "@tabler/icons-react";
import type { Station } from "~/types/radio";
import { StationArtwork } from "./StationArtwork";
import { useEffect, useMemo, useState } from "react";
import { PretextMeasuredText } from "~/components/PretextMeasuredText";

const COMPACT_STATION_TITLE_FONT =
    '700 14px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const COMPACT_STATION_META_FONT =
    '600 11px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';

interface CompactStationCardProps {
    station: Station;
    isPlaying: boolean;
    isFavorite?: boolean;
    onPlay: (station: Station) => void;
    onToggleFavorite?: (station: Station) => void;
    isUnavailable?: boolean;
}

export function CompactStationCard({
    station,
    isPlaying,
    isFavorite = false,
    onPlay,
    onToggleFavorite,
    isUnavailable = false,
}: CompactStationCardProps) {
    const streamCandidate = (station.streamUrl ?? station.url ?? "").trim().toLowerCase();
    const isHttpStream = streamCandidate.startsWith("http://");
    const isHlsStream = Boolean(station.hls);
    const metaLine = [station.country, station.state || station.language].filter(Boolean).join(" • ") || "Open stream";
    const qualityLabel = station.bitrate > 0 ? `${station.bitrate} kbps` : station.codec ? station.codec.toUpperCase() : null;

    return (
        <div
            className={`relative flex w-full items-center gap-3 rounded-[1.25rem] border px-3 py-2.5 transition-colors ${isPlaying
                ? "border-[rgba(245,177,45,0.44)] bg-[rgba(245,177,45,0.1)]"
                : "border-white/10 bg-black/24"
                }`}
            style={{ contentVisibility: "auto", containIntrinsicSize: "76px" }}
            role="group"
            aria-label={station.name}
        >
            {isPlaying && (
                <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-[var(--rp-gold)] shadow-[0_0_12px_rgba(245,177,45,0.55)]" />
            )}

            <button
                type="button"
                onClick={() => onPlay(station)}
                className="relative z-10 flex min-w-0 flex-1 items-center gap-3 rounded-[1rem] text-left transition-transform active:scale-[0.985]"
                aria-label={`Play ${station.name}`}
            >
                <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/35">
                    <StationArtwork
                        station={station}
                        className="h-full w-full object-cover"
                        fallbackClassName="flex h-full w-full items-center justify-center bg-[linear-gradient(180deg,#10151d,#18212e)] text-sm font-bold text-[var(--rp-muted)]"
                        sizes="48px"
                    />
                </div>

                <div className="min-w-0 flex-1">
                    <PretextMeasuredText
                        text={station.name}
                        font={COMPACT_STATION_TITLE_FONT}
                        lineHeight={18}
                        collapsedLines={2}
                        lineClassName={`text-[14px] font-bold tracking-[-0.01em] ${isPlaying ? "text-[var(--rp-gold)]" : "text-[var(--rp-text)]"}`}
                        fallbackClassName={`text-[14px] font-bold tracking-[-0.01em] ${isPlaying ? "text-[var(--rp-gold)]" : "text-[var(--rp-text)]"}`}
                    />
                    <PretextMeasuredText
                        text={metaLine}
                        font={COMPACT_STATION_META_FONT}
                        lineHeight={15}
                        collapsedLines={1}
                        lineClassName="text-[11px] font-semibold text-[var(--rp-muted)]"
                        fallbackClassName="text-[11px] font-semibold text-[var(--rp-muted)]"
                    />

                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {qualityLabel && (
                            <span className="rounded-md border border-white/10 bg-black/35 px-1.5 py-0.5 text-[10px] font-bold text-[var(--rp-muted)]">
                                {qualityLabel}
                            </span>
                        )}
                        {isUnavailable && (
                            <span className="rounded-md border border-rose-300/25 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-bold text-rose-200">
                                Unavailable
                            </span>
                        )}
                        {isHlsStream && (
                            <span className="rounded-md border border-[rgba(245,177,45,0.3)] bg-[rgba(245,177,45,0.12)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--rp-gold)]">HLS</span>
                        )}
                        {isHttpStream && (
                            <span className="rounded-md border border-[rgba(245,177,45,0.3)] bg-[rgba(245,177,45,0.12)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--rp-gold)]">HTTP</span>
                        )}
                    </div>
                </div>
            </button>

            <div className="relative z-10 flex shrink-0 items-center gap-2">
                {onToggleFavorite && (
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(station);
                        }}
                        className={`flex h-10 w-10 items-center justify-center rounded-full border transition active:scale-[0.94] ${isFavorite
                            ? "border-[rgba(245,177,45,0.35)] bg-[rgba(245,177,45,0.16)] text-[var(--rp-gold)]"
                            : "border-white/10 bg-black/35 text-white/65"
                            }`}
                        aria-pressed={isFavorite}
                        aria-label={isFavorite ? `Unfavorite ${station.name}` : `Favorite ${station.name}`}
                    >
                        {isFavorite ? <IconHeartFilled size={18} /> : <IconHeart size={18} />}
                    </button>
                )}

                <button
                    type="button"
                    onClick={() => onPlay(station)}
                    className={`flex h-11 w-11 items-center justify-center rounded-full border transition active:scale-[0.94] ${isPlaying
                        ? "border-[rgba(245,177,45,0.6)] bg-[linear-gradient(135deg,#f6c86f,#f1aa45)] text-black shadow-[0_10px_22px_rgba(245,177,45,0.24)]"
                        : "border-white/10 bg-black/45 text-white/72"
                        }`}
                    aria-label={isPlaying ? `Restart ${station.name}` : `Play ${station.name}`}
                >
                    <IconPlayerPlayFilled size={20} className="ml-0.5" />
                </button>
            </div>
        </div>
    );
}

interface CompactStationListProps {
    stations: Station[];
    nowPlayingId?: string | null;
    favoriteIds?: Set<string>;
    onPlayStation: (station: Station) => void;
    onToggleFavorite?: (station: Station) => void;
    unavailableIds?: Set<string>;
}

export function CompactStationList({
    stations,
    nowPlayingId,
    favoriteIds = new Set(),
    onPlayStation,
    onToggleFavorite,
    unavailableIds,
}: CompactStationListProps) {
    if (stations.length === 0) {
        return (
            <div className="p-12 text-center">
                <div className="text-slate-400 text-sm font-medium">No stations available</div>
            </div>
        );
    }

    const [visibleCount, setVisibleCount] = useState(8);
    useEffect(() => {
        setVisibleCount((prev) => Math.min(prev, stations.length));
    }, [stations.length]);
    const visibleStations = useMemo(() => stations.slice(0, visibleCount), [stations, visibleCount]);
    const hasMore = stations.length > visibleCount;

    return (
        <div
            className="relative overflow-hidden"
            style={{
                background: 'transparent',
            }}
        >
            <div className="flex flex-col relative z-10 gap-2">
                {visibleStations.map((station) => (
                    <CompactStationCard
                        key={station.uuid}
                        station={station}
                        isPlaying={station.uuid === nowPlayingId}
                        isFavorite={favoriteIds.has(station.uuid)}
                        onPlay={onPlayStation}
                        onToggleFavorite={onToggleFavorite}
                        isUnavailable={unavailableIds?.has(station.uuid) ?? false}
                    />
                ))}
            </div>
            <div className="relative z-10 mt-4 flex flex-wrap items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--rp-muted-2)]">
                <span>
                    {Math.min(visibleCount, stations.length)} of {stations.length}
                </span>
                {hasMore && (
                    <button
                        type="button"
                        onClick={() => setVisibleCount((prev) => Math.min(prev + 8, stations.length))}
                        className="inline-flex items-center gap-2 rounded-full border border-[rgba(245,177,45,0.5)] bg-[rgba(245,177,45,0.12)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--rp-gold)]"
                    >
                        Show more
                    </button>
                )}
                {visibleCount > 8 && (
                    <button
                        type="button"
                        onClick={() => setVisibleCount(8)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--rp-muted)]"
                    >
                        Show less
                    </button>
                )}
            </div>
        </div>
    );
}
