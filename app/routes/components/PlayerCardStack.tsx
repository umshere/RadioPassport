import { useMemo, useEffect, useRef, useCallback, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { motion } from "framer-motion";
import { Text, Title, Button, Badge, ActionIcon } from "@mantine/core";
import {
  IconHeadphones,
  IconPlayerPlayFilled,
  IconPlayerPauseFilled,
  IconPlayerTrackNext,
  IconHeart,
  IconExternalLink,
  IconShieldCheck,
  IconAlertTriangle,
  IconTrendingUp,
  IconChevronLeft,
  IconChevronRight,
  IconSparkles,
} from "@tabler/icons-react";
import { CountryFlag } from "~/components/CountryFlag";
import PassportStampIcon from "~/components/PassportStampIcon";
import type { Station, PlayerCard, ListeningMode } from "~/types/radio";
import { deriveStationHealth, getHealthBadgeStyle } from "~/utils/stationMeta";

type StationDiscProps = {
  station: Station;
  isActive: boolean;
  isNowPlaying: boolean;
  initials: string;
};

function StationDisc({ station, isActive, isNowPlaying, initials }: StationDiscProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(station.favicon) && !imageFailed;

  return (
    <div className={`travel-trail__disc-wrap ${isActive ? "travel-trail__disc-wrap--active" : ""}`}>
      <div
        className={`travel-trail__disc ${isActive ? "travel-trail__disc--active" : ""} ${showImage ? "" : "travel-trail__disc--fallback"
          }`}
      >
        {showImage ? (
          <img
            src={station.favicon}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span className="travel-trail__disc-initials" aria-hidden="true">
            {initials}
          </span>
        )}
        {isNowPlaying && <span className="travel-trail__disc-pill">Live</span>}
      </div>
    </div>
  );
}

export type PlayerCardStackProps = {
  playerCards: PlayerCard[];
  activeCardIndex: number;
  cardDirection: 1 | -1;
  nowPlaying: Station | null;
  isPlaying: boolean;
  listeningMode: ListeningMode;
  stackStations: Station[];
  recentStations: Station[];
  favoriteStationIds: Set<string>;
  countryMap: Map<string, { name: string; iso_3166_1: string; stationcount: number }>;
  hasStationsToCycle: boolean;
  isFetchingExplore: boolean;
  localStationCount: number;
  globalStationCount: number;
  selectedCountry: string | null;
  onCardChange: (direction: 1 | -1) => void;
  onCardJump: (index: number) => void;
  onToggleFavorite: (station: Station) => void;
  onStartStation: (
    station: Station,
    options?: { autoPlay?: boolean; preserveQueue?: boolean }
  ) => void;
  onPlayPause: () => void;
  onPlayNext: () => void;
  onSetListeningMode: (mode: ListeningMode) => void;
  onMissionExploreWorld: () => void;
  onMissionStayLocal: () => void;
};

export function PlayerCardStack({
  playerCards,
  activeCardIndex,
  cardDirection,
  nowPlaying,
  isPlaying,
  listeningMode,
  stackStations,
  recentStations,
  favoriteStationIds,
  countryMap,
  hasStationsToCycle,
  isFetchingExplore,
  localStationCount,
  globalStationCount,
  selectedCountry,
  onCardChange,
  onCardJump,
  onToggleFavorite,
  onStartStation,
  onPlayPause,
  onPlayNext,
  onSetListeningMode,
  onMissionExploreWorld,
  onMissionStayLocal,
}: PlayerCardStackProps) {
  const [newlyAddedStations, setNewlyAddedStations] = useState<Set<string>>(new Set());
  const previousStationsRef = useRef<Set<string>>(new Set());

  const stationCards = useMemo(
    () =>
      playerCards.filter(
        (card): card is { type: "station"; station: Station } => card.type === "station"
      ),
    [playerCards]
  );

  const cardIndexLookup = useMemo(() => {
    const indexMap = new Map<string, number>();
    playerCards.forEach((card, index) => {
      if (card.type === "station") {
        indexMap.set(card.station.uuid, index);
      }
    });
    return indexMap;
  }, [playerCards]);

  const stackSource = useMemo(() => {
    // Only show stations from current session (recentStations)
    // Not all the loaded stations from the country
    if (recentStations.length > 0) {
      const seen = new Set<string>();
      const uniqueStack: Station[] = [];
      for (const station of recentStations) {
        if (station && !seen.has(station.uuid)) {
          seen.add(station.uuid);
          uniqueStack.push(station);
        }
      }
      return uniqueStack;
    }
    return [];
  }, [recentStations]);

  const totalStations = stackSource.length;
  const fallbackStation = stackSource[0] ?? stationCards[0]?.station ?? null;
  const activeCard = playerCards[activeCardIndex];
  const activeStation =
    activeCard && activeCard.type === "station"
      ? activeCard.station
      : nowPlaying ?? fallbackStation;

  const trailStations = stackSource;

  const activeTrailIndex = activeStation
    ? trailStations.findIndex((station) => station.uuid === activeStation.uuid)
    : -1;

  const activeStationIsCurrent = activeStation
    ? nowPlaying?.uuid === activeStation.uuid
    : false;

  const activeCountryMeta = activeStation
    ? countryMap.get(activeStation.country) ?? null
    : null;

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Detect newly added stations from session play history
  useEffect(() => {
    // Only trigger animation for the most recent station added
    if (recentStations.length > 0 && previousStationsRef.current.size > 0) {
      const newestStation = recentStations[0]; // Most recent is first

      if (newestStation && !previousStationsRef.current.has(newestStation.uuid)) {
        setNewlyAddedStations(new Set([newestStation.uuid]));

        // Remove animation class after animation completes
        const timer = setTimeout(() => {
          setNewlyAddedStations(new Set());
        }, 1800); // Match animation duration

        return () => clearTimeout(timer);
      }
    }

    // Update ref with current session stations
    previousStationsRef.current = new Set(recentStations.map(s => s.uuid));
  }, [recentStations]);

  const worldCaption = isFetchingExplore
    ? "Loading global mixtape..."
    : `${globalStationCount.toLocaleString()} stations across the atlas`;
  const localCaption = `${localStationCount.toLocaleString()} stations from ${selectedCountry ?? "this country"
    }`;

  const initialsFromName = (name: string) => {
    const cleaned = name.trim();
    if (!cleaned) return "??";
    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length === 1) return (words[0] ?? "").slice(0, 2).toUpperCase();
    const firstInitial = words[0]?.[0] ?? "";
    const secondInitial = words[1]?.[0] ?? "";
    const initials = `${firstInitial}${secondInitial}`.toUpperCase();
    return initials || (words[0] ?? "").slice(0, 2).toUpperCase();
  };

  const handleSelectStation = useCallback(
    (station: Station) => {
      const targetIndex = cardIndexLookup.get(station.uuid);
      if (typeof targetIndex === "number") {
        onCardJump(targetIndex);
      }
      onStartStation(station, {
        autoPlay: Boolean(station.streamUrl ?? station.url),
        preserveQueue: true,
      });
    },
    [cardIndexLookup, onCardJump, onStartStation]
  );

  const renderTrailCard = (station: Station, index: number) => {
    const cardKey = `${station.uuid}-${index}`;
    const stationCountryMeta = countryMap.get(station.country) ?? null;
    const countryLabel = stationCountryMeta?.name ?? station.country;
    const isNowPlaying = nowPlaying?.uuid === station.uuid;
    const stationInitials = initialsFromName(station.name);
    const isNewlyAdded = newlyAddedStations.has(station.uuid);

    // Get flag color for country
    const flagColorMap: Record<string, string> = {
      IN: "rgba(255, 153, 51, 0.8)",    // India - Orange
      US: "rgba(178, 34, 52, 0.8)",     // USA - Red
      GB: "rgba(1, 33, 105, 0.8)",      // UK - Blue  
      FR: "rgba(0, 85, 164, 0.8)",      // France - Blue
      DE: "rgba(0, 0, 0, 0.8)",          // Germany - Black
      BR: "rgba(0, 156, 59, 0.8)",      // Brazil - Green
      JP: "rgba(188, 0, 45, 0.8)",      // Japan - Red
      AU: "rgba(0, 0, 139, 0.8)",       // Australia - Blue
      CA: "rgba(255, 0, 0, 0.8)",       // Canada - Red
      MX: "rgba(0, 104, 71, 0.8)",      // Mexico - Green
    };
    const flagColor = flagColorMap[stationCountryMeta?.iso_3166_1 ?? ""] ?? "rgba(148, 163, 184, 0.6)";

    return (
      <div
        key={cardKey}
        ref={(node) => {
          cardRefs.current[station.uuid] = node;
        }}
        className={`travel-stack__card ${isNowPlaying ? "travel-stack__card--playing" : ""} ${isNewlyAdded ? "travel-stack__card--stamping" : ""}`}
        style={{
          '--card-index': index,
          '--flag-color': flagColor,
        } as React.CSSProperties}
        onClick={() => handleSelectStation(station)}
        role="button"
        tabIndex={0}
        aria-label={`Play ${station.name} from ${countryLabel}`}
      >
        {/* Card number badge - positioned on top edge like folder tab */}
        <div className="travel-stack__tab-badge">#{index + 1}</div>

        {/* Card stack indicator with flag color */}
        <div className="travel-stack__edge" style={{ background: flagColor }} />

        {/* Stamp indicator */}
        <div className={`travel-stack__stamp ${isNewlyAdded ? "travel-stack__stamp--stamping" : ""}`} aria-label="Stamped">
          <PassportStampIcon size={28} id={`stamp-${index}`} />
        </div>

        {/* Card content - revealed on hover */}
        <div className="travel-stack__content">
          {stationCountryMeta?.iso_3166_1 && (
            <div className="travel-stack__flag">
              <CountryFlag
                iso={stationCountryMeta.iso_3166_1}
                title={countryLabel}
                width={60}
                height={40}
              />
            </div>
          )}
          <div className="travel-stack__main">
            <StationDisc
              station={station}
              isActive={false}
              isNowPlaying={isNowPlaying}
              initials={stationInitials}
            />
            <div className="travel-stack__text">
              <div className="travel-stack__title-section">
                <h3 className="travel-stack__station-name">
                  {station.name}
                </h3>
              </div>
              <div className="travel-stack__metadata">
                <Text size="xs" c="rgba(148,163,184,0.75)" lineClamp={1}>
                  {station.language || 'Unknown'}
                </Text>
                <Text size="xs" c="rgba(199,158,73,0.8)" fw={500} lineClamp={1}>
                  {station.codec?.toUpperCase() || 'MP3'} · {station.bitrate && station.bitrate > 0 ? `${station.bitrate} kbps` : '128 kbps'}
                </Text>
              </div>
            </div>
          </div>

          {isNowPlaying && (
            <div className="travel-stack__playing-badge">
              <IconHeadphones size={12} />
              <span>Now Playing</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <section id="player" className="mt-8">
      <div className="player-stack-shell">
        <div className="travel-log-shell">
          <div className="rounded-3xl border border-slate-200 bg-white/50 p-6 shadow-sm">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <PassportStampIcon size={40} />
              <div>
                <Title order={2} style={{ fontSize: "1.45rem", fontWeight: 700, color: "#0f172a" }}>
                  Travel log
                </Title>
                <Text size="sm" c="dimmed">
                  Hover to preview • Click to play
                </Text>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <Badge
                radius="xl"
                size="md"
                leftSection={<IconHeadphones size={16} />}
                className="bg-slate-100 text-slate-600 border border-slate-200"
              >
                {totalStations.toLocaleString()} stamped
              </Badge>
              <Text size="xs" c="dimmed">
                {selectedCountry ? localCaption : worldCaption}
              </Text>
            </div>
          </div>

          {totalStations === 0 ? (
            <div className="travel-log__empty">
              <Text size="sm" c="rgba(226,232,240,0.75)">
                Your listening log is empty. Start a station and home will build a trail of recent plays and next picks.
              </Text>
              <div className="travel-log__empty-actions">
                <Button
                  radius="xl"
                  size="sm"
                  onClick={onMissionExploreWorld}
                  style={{
                    background:
                      "linear-gradient(120deg, rgba(199,158,73,0.92) 0%, rgba(148,113,51,0.92) 100%)",
                    color: "#0f172a",
                    fontWeight: 600,
                    border: "1px solid rgba(254,250,226,0.6)",
                  }}
                >
                  AI-curated picks
                </Button>
                <Button
                  radius="xl"
                  size="sm"
                  variant="outline"
                  onClick={onMissionStayLocal}
                  style={{
                    border: "1px solid rgba(148,163,184,0.35)",
                    color: "rgba(248,250,252,0.85)",
                    background: "rgba(10,20,38,0.4)",
                  }}
                >
                  Start local
                </Button>
              </div>
            </div>
          ) : (
            <div className="travel-stack__container">
              <div className="travel-stack__deck">
                {trailStations.map((station, index) => renderTrailCard(station, index))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
