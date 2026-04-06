import { Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { StationCard } from "./StationCard";
import { SkeletonGrid } from "./SkeletonCard";
import { CompactStationList } from "~/components/CompactStationList";
import type { Station } from "~/types/radio";

type StationGridProps = {
  stations: Station[];
  nowPlaying: Station | null;
  stationRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  onPlayStation: (station: Station) => void;
  isFetchingExplore?: boolean;
  favoriteStationIds?: Set<string>;
  onToggleFavorite?: (station: Station) => void;
  emptyMessage?: string;
  unavailableIds?: Set<string>;
};

export function StationGrid({
  stations,
  nowPlaying,
  stationRefs,
  onPlayStation,
  isFetchingExplore = false,
  favoriteStationIds,
  onToggleFavorite,
  emptyMessage,
  unavailableIds,
}: StationGridProps) {
  const isMobile = useMediaQuery("(max-width: 639px)");

  if (isFetchingExplore) {
    return <SkeletonGrid count={6} />;
  }

  if (stations.length === 0) {
    const message =
      emptyMessage ??
      "No stations broadcasting from this country right now. Try exploring a neighboring region or use Quick Retune to discover something new.";
    return (
      <div className="rounded-3xl border border-white/10 bg-[var(--rp-card)] p-12 text-center backdrop-blur">
        <Text size="md" c="var(--rp-muted)">
          {message}
        </Text>
      </div>
    );
  }

  // Mobile: Use compact list view
  if (isMobile) {
    return (
      <div className="space-y-2">
        <CompactStationList
          stations={stations}
          nowPlayingId={nowPlaying?.uuid}
          favoriteIds={favoriteStationIds}
          onPlayStation={onPlayStation}
          onToggleFavorite={onToggleFavorite}
          unavailableIds={unavailableIds}
        />
      </div>
    );
  }

  // Desktop: Use grid view
  return (
    <div id="station-grid" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {stations.map((station, index) => {
        const isCurrent = nowPlaying?.uuid === station.uuid;
        const isFavorite = favoriteStationIds?.has(station.uuid) ?? false;
        return (
          <StationCard
            key={`${station.uuid}-${index}`}
            station={station}
            isCurrent={isCurrent}
            onPlay={onPlayStation}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
            isUnavailable={unavailableIds?.has(station.uuid) ?? false}
            stationRef={(element) => {
              stationRefs.current[station.uuid] = element;
            }}
          />
        );
      })}
    </div>
  );
}
