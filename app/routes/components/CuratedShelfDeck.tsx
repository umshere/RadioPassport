import { IconBroadcast, IconMapPin, IconSparkles } from "@tabler/icons-react";
import { Text, Title } from "@mantine/core";
import { PremiumStationCard } from "./PremiumStationCard";
import type { Station } from "~/types/radio";

type CuratedShelfTheme = {
    glow: string;
    border: string;
    pill: string;
};

export type CuratedShelfViewModel = {
    id: string;
    eyebrow: string;
    title: string;
    description: string;
    badge: string;
    stations: Station[];
    topCountries: string[];
    topTags: string[];
    languageCount: number;
    averageHealthScore: number;
    likelyUpCount: number;
    probedPlayableCount: number;
    probedStationCount: number;
    mixNote: string;
    availabilityNote: string;
    aiReason: string | null;
    theme: CuratedShelfTheme;
};

type CuratedShelfDeckProps = {
    shelves: CuratedShelfViewModel[];
    nowPlaying: Station | null;
    isPlaying: boolean;
    favoriteIds: Set<string>;
    onPlayStation: (shelfId: string, station: Station) => void;
    onToggleFavorite: (station: Station) => void;
};

function StatPill({ label, value, tone }: { label: string; value: string; tone: string }) {
    return (
        <div
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{
                borderColor: tone,
                background: `${tone}1f`,
                color: "rgba(247,240,224,0.88)",
            }}
        >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} />
            <span>{value}</span>
            <span className="text-[rgba(247,240,224,0.48)]">{label}</span>
        </div>
    );
}

export function CuratedShelfDeck({
    shelves,
    nowPlaying,
    isPlaying,
    favoriteIds,
    onPlayStation,
    onToggleFavorite,
}: CuratedShelfDeckProps) {
    if (shelves.length === 0) return null;

    return (
        <section className="space-y-6">
            <div className="max-w-3xl px-1 md:px-0">
                <Text size="xs" c="var(--rp-muted-2)" className="font-semibold uppercase tracking-[0.32em]">
                    Curated shelves
                </Text>
                <Title order={2} style={{ fontSize: "1.55rem", fontWeight: 700, color: "var(--rp-text)", marginBottom: "0.2rem" }}>
                    Live mixes organized with clearer taste cues
                </Title>
                <Text size="sm" c="var(--rp-muted)">
                    Home stays on one visual plane: a concise shelf header, a few grounded signals, and the stations themselves.
                </Text>
            </div>

            <div className="space-y-5">
                {shelves.map((shelf) => (
                    <article
                        key={shelf.id}
                        className="relative overflow-hidden rounded-[1.9rem] border px-4 py-5 md:px-5 md:py-6"
                        style={{
                            borderColor: "rgba(255,255,255,0.08)",
                            background: `radial-gradient(circle at top left, ${shelf.theme.glow}, transparent 28%), linear-gradient(180deg, rgba(10,14,20,0.78) 0%, rgba(9,12,18,0.66) 100%)`,
                            boxShadow: "0 12px 28px rgba(0,0,0,0.18)",
                        }}
                    >
                        {(() => {
                            const leadStation = shelf.stations[0] ?? null;
                            const desktopColumnClass = shelf.stations.length >= 8 ? "lg:grid-cols-6" : "lg:grid-cols-5";
                            const primaryGridCapacity = shelf.stations.length >= 8 ? 8 : 6;
                            const primaryGridStations = shelf.stations.slice(1, primaryGridCapacity + 1);
                            const overflowStations = shelf.stations.slice(primaryGridCapacity + 1);

                            return (
                        <div className="space-y-5">
                            <div className="flex flex-col gap-4 border-b border-white/8 pb-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
                                <div className="min-w-0 space-y-3">
                                    <div className="flex flex-wrap items-center gap-2.5">
                                        <span
                                            className="inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]"
                                            style={{
                                                borderColor: shelf.theme.border,
                                                background: shelf.theme.pill,
                                                color: "rgba(247,240,224,0.82)",
                                            }}
                                        >
                                            {shelf.eyebrow}
                                        </span>
                                        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--rp-muted-2)]">
                                            {shelf.badge}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        <Title order={3} style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--rp-text)", marginBottom: "0.15rem" }}>
                                            {shelf.title}
                                        </Title>
                                        <Text size="sm" c="var(--rp-muted)" className="max-w-2xl leading-6">
                                            {shelf.description}
                                        </Text>
                                    </div>

                                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-[rgba(247,240,224,0.74)]">
                                        <div className="inline-flex items-center gap-2">
                                            <IconBroadcast size={14} className="text-[var(--rp-gold)]" />
                                            <span>{shelf.availabilityNote}</span>
                                        </div>
                                        <div className="inline-flex items-center gap-2">
                                            <IconMapPin size={14} className="text-[var(--rp-gold)]" />
                                            <span>
                                                {shelf.topCountries.slice(0, 3).join(" • ") || "Global spread"}
                                                {shelf.languageCount > 0 ? ` · ${shelf.languageCount} language${shelf.languageCount === 1 ? "" : "s"}` : ""}
                                            </span>
                                        </div>
                                        {shelf.aiReason && (
                                            <div className="inline-flex items-center gap-2">
                                                <IconSparkles size={14} className="text-[var(--rp-gold)]" />
                                                <span>{shelf.aiReason}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 lg:max-w-[22rem] lg:justify-end">
                                    <StatPill label="stations" value={String(shelf.stations.length)} tone={shelf.theme.border} />
                                    <StatPill label="countries" value={String(shelf.topCountries.length)} tone="rgba(112, 196, 184, 0.64)" />
                                </div>
                            </div>

                            {shelf.topTags.length > 0 && (
                                <div className="flex flex-wrap gap-2 max-sm:hidden">
                                    <span
                                        className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--rp-muted-2)]"
                                    >
                                        Signals:
                                    </span>
                                    {shelf.topTags.slice(0, 5).map((tag) => (
                                        <span
                                            key={`${shelf.id}-${tag}`}
                                            className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium capitalize text-[rgba(247,240,224,0.74)]"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="min-w-0 lg:pt-1">
                                <div className="space-y-3 lg:hidden">
                                    {leadStation && (
                                        <div className="w-full">
                                            <PremiumStationCard
                                                station={leadStation}
                                                index={0}
                                                isPlaying={isPlaying && nowPlaying?.uuid === leadStation.uuid}
                                                isCurrent={nowPlaying?.uuid === leadStation.uuid}
                                                isFavorite={favoriteIds.has(leadStation.uuid)}
                                                onPlay={(picked) => onPlayStation(shelf.id, picked)}
                                                onToggleFavorite={onToggleFavorite}
                                                size="md"
                                                fillWidth
                                            />
                                        </div>
                                    )}

                                    {shelf.stations.length > 1 && (
                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                                            {shelf.stations.slice(1, 5).map((station, index) => (
                                                <div key={`${shelf.id}-${station.uuid}-mobile-grid`} className="min-w-0">
                                                    <PremiumStationCard
                                                        station={station}
                                                        index={index + 1}
                                                        isPlaying={isPlaying && nowPlaying?.uuid === station.uuid}
                                                        isCurrent={nowPlaying?.uuid === station.uuid}
                                                        isFavorite={favoriteIds.has(station.uuid)}
                                                        onPlay={(picked) => onPlayStation(shelf.id, picked)}
                                                        onToggleFavorite={onToggleFavorite}
                                                        size="sm"
                                                        fillWidth
                                                        showGenre={false}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="hidden lg:block">
                                    <div className={`lg:grid ${desktopColumnClass} lg:auto-rows-fr lg:items-start lg:gap-4`}>
                                        {leadStation && (
                                            <div className="row-span-2 col-span-2 flex min-h-[20rem] items-start">
                                                <PremiumStationCard
                                                    station={leadStation}
                                                    index={0}
                                                    isPlaying={isPlaying && nowPlaying?.uuid === leadStation.uuid}
                                                    isCurrent={nowPlaying?.uuid === leadStation.uuid}
                                                    isFavorite={favoriteIds.has(leadStation.uuid)}
                                                    onPlay={(picked) => onPlayStation(shelf.id, picked)}
                                                    onToggleFavorite={onToggleFavorite}
                                                    size="md"
                                                    fillWidth
                                                />
                                            </div>
                                        )}

                                        {primaryGridStations.map((station, index) => (
                                            <div
                                                key={`${shelf.id}-${station.uuid}-desktop-primary`}
                                                className={`flex items-start ${index < 3 ? "min-h-[10.5rem]" : "min-h-[9.5rem]"}`}
                                            >
                                                <PremiumStationCard
                                                    station={station}
                                                    index={index + 1}
                                                    isPlaying={isPlaying && nowPlaying?.uuid === station.uuid}
                                                    isCurrent={nowPlaying?.uuid === station.uuid}
                                                    isFavorite={favoriteIds.has(station.uuid)}
                                                    onPlay={(picked) => onPlayStation(shelf.id, picked)}
                                                    onToggleFavorite={onToggleFavorite}
                                                    size="md"
                                                    fillWidth
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    {overflowStations.length > 0 && (
                                        <div className="mt-4">
                                            {overflowStations.length === 1 && overflowStations[0] ? (
                                                <div className="flex">
                                                    <div className="w-full max-w-[14rem]">
                                                        <PremiumStationCard
                                                            station={overflowStations[0]}
                                                            index={primaryGridCapacity + 1}
                                                            isPlaying={isPlaying && nowPlaying?.uuid === overflowStations[0].uuid}
                                                            isCurrent={nowPlaying?.uuid === overflowStations[0].uuid}
                                                            isFavorite={favoriteIds.has(overflowStations[0].uuid)}
                                                            onPlay={(picked) => onPlayStation(shelf.id, picked)}
                                                            onToggleFavorite={onToggleFavorite}
                                                            size="md"
                                                            fillWidth
                                                        />
                                                    </div>
                                                </div>
                                            ) : overflowStations.length > 1 ? (
                                                <div
                                                    className={`grid gap-4 ${
                                                        overflowStations.length === 2
                                                            ? "lg:grid-cols-2"
                                                            : overflowStations.length === 3
                                                                ? "lg:grid-cols-3"
                                                                : "lg:grid-cols-2 xl:grid-cols-4"
                                                    }`}
                                                >
                                                    {overflowStations.map((station, index) => (
                                                        <div key={`${shelf.id}-${station.uuid}-desktop-overflow`} className="flex items-start">
                                                            <PremiumStationCard
                                                                station={station}
                                                                index={index + primaryGridCapacity + 1}
                                                                isPlaying={isPlaying && nowPlaying?.uuid === station.uuid}
                                                                isCurrent={nowPlaying?.uuid === station.uuid}
                                                                isFavorite={favoriteIds.has(station.uuid)}
                                                                onPlay={(picked) => onPlayStation(shelf.id, picked)}
                                                                onToggleFavorite={onToggleFavorite}
                                                                size="md"
                                                                fillWidth
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : null}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                            );
                        })()}
                    </article>
                ))}
            </div>
        </section>
    );
}
