import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@remix-run/react";
import { motion } from "framer-motion";
import { Badge, Text, Title } from "@mantine/core";
import {
  IconArrowLeft,
  IconBook2,
  IconBroadcast,
  IconDisc,
  IconBrandWikipedia,
  IconBrandYoutube,
  IconClock,
  IconDatabase,
  IconLanguage,
  IconMoonStars,
  IconPlayerPauseFilled,
  IconPlayerPlayFilled,
  IconPlayerSkipBackFilled,
  IconPlayerSkipForwardFilled,
  IconSparkles,
  IconTags,
  IconUser,
  IconMusic,
} from "@tabler/icons-react";
import { CountryFlag } from "~/components/CountryFlag";
import { PretextMeasuredText } from "~/components/PretextMeasuredText";
import type { Country, Station } from "~/types/radio";
import { useNowPlayingMetadata } from "~/hooks/useNowPlayingMetadata";
import { useTrackTrivia } from "~/hooks/useTrackTrivia";
import { useUIStore } from "~/state/uiStore";
import { StationArtwork } from "~/components/StationArtwork";

const COUNTRY_BODY_FONT =
  '600 14px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';

type CountryOverviewProps = {
  selectedCountry: string;
  selectedCountryMeta: Country | null;
  stationCount: number;
  stations: Station[];
  onBack: () => void;
  nowPlaying?: Station | null;
  isPlaying?: boolean;
  onPlayPause?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  queue: Station[];
  currentIndex: number;
  onSelectStation: (station: Station) => void;
  transparent?: boolean;
  queueSourceLabel?: string;
};

function deriveFrequency(station: Station | null) {
  if (!station) return "0.0";
  let hash = 0;
  for (let i = 0; i < station.uuid.length; i++) {
    hash = station.uuid.charCodeAt(i) + ((hash << 5) - hash);
  }
  const range = 108.0 - 88.0;
  const normalized = Math.abs(hash % 1000) / 1000;
  return (88.0 + normalized * range).toFixed(1);
}

function getReferencePresentation(url: string, label?: string, kind?: string) {
  switch (kind) {
    case "youtube":
      return { icon: IconBrandYoutube, shortLabel: "YouTube", title: label ?? "Open YouTube reference" };
    case "artist":
      return { icon: IconUser, shortLabel: "Artist", title: label ?? "Open artist reference" };
    case "release":
      return { icon: IconDisc, shortLabel: "Release", title: label ?? "Open release reference" };
    case "track":
      return { icon: IconMusic, shortLabel: "Track", title: label ?? "Open track reference" };
    case "info":
      return { icon: IconBrandWikipedia, shortLabel: "Wikipedia", title: label ?? "Open information reference" };
    default:
      break;
  }

  const normalizedUrl = url.toLowerCase();
  const normalizedLabel = (label ?? "").toLowerCase();

  if (normalizedUrl.includes("youtube.com") || normalizedUrl.includes("youtu.be")) {
    return { icon: IconBrandYoutube, shortLabel: "YouTube", title: label ?? "Open YouTube reference" };
  }

  if (normalizedUrl.includes("wikipedia.org")) {
    return { icon: IconBrandWikipedia, shortLabel: "Wikipedia", title: label ?? "Open Wikipedia reference" };
  }

  if (normalizedUrl.includes("wikidata.org")) {
    return { icon: IconDatabase, shortLabel: "Wikidata", title: label ?? "Open Wikidata reference" };
  }

  if (normalizedUrl.includes("discogs.com") || normalizedLabel.includes("discogs")) {
    return { icon: IconBook2, shortLabel: "Discogs", title: label ?? "Open Discogs reference" };
  }

  return { icon: IconBook2, shortLabel: "Source", title: label ?? "Open reference source" };
}

export function CountryOverview({
  selectedCountry,
  selectedCountryMeta,
  stationCount,
  stations,
  onBack,
  nowPlaying,
  isPlaying = false,
  onPlayPause,
  onNext,
  onPrev,
  queue,
  currentIndex,
  onSelectStation,
  queueSourceLabel,
}: CountryOverviewProps) {
  const aiTriviaExpanded = useUIStore((state) => state.aiTriviaExpanded);
  const insightsOpen = useUIStore((state) => state.insightsOpen);
  const [selectedStationId, setSelectedStationId] = useState<string | null>(
    nowPlaying?.uuid ?? stations[0]?.uuid ?? null
  );

  useEffect(() => {
    if (!stations.length) return;
    if (nowPlaying && stations.some((station) => station.uuid === nowPlaying.uuid)) {
      setSelectedStationId(nowPlaying.uuid);
      return;
    }
    setSelectedStationId((current) =>
      current && stations.some((station) => station.uuid === current)
        ? current
        : stations[0]?.uuid ?? null
    );
  }, [nowPlaying, stations]);

  const selectedStation = useMemo(
    () =>
      stations.find((station) => station.uuid === selectedStationId)
      ?? nowPlaying
      ?? stations[0]
      ?? null,
    [nowPlaying, selectedStationId, stations]
  );
  const selectedIndex = useMemo(
    () => stations.findIndex((station) => station.uuid === selectedStation?.uuid),
    [selectedStation?.uuid, stations]
  );
  const isPreviewing = Boolean(
    selectedStation && nowPlaying && selectedStation.uuid !== nowPlaying.uuid
  );

  const metadataStation = !isPreviewing ? nowPlaying ?? selectedStation : null;
  const nowPlayingMeta = useNowPlayingMetadata(metadataStation ?? null, Boolean(isPlaying && metadataStation));
  const freeTrivia = useTrackTrivia({
    track: nowPlayingMeta.track,
    source: "free",
    enabled: Boolean(metadataStation && nowPlayingMeta.track),
  });
  const aiTrivia = useTrackTrivia({
    track: nowPlayingMeta.track,
    source: "ai",
    enabled: Boolean(metadataStation && nowPlayingMeta.track && aiTriviaExpanded && !isPreviewing),
    context: {
      summary: freeTrivia.trivia?.summary ?? null,
      facts: freeTrivia.trivia?.facts ?? [],
    },
  });

  const heroSummary = useMemo(() => {
    if (!selectedStation) {
      return `Pick a station from ${selectedCountry} to load a live listening story.`;
    }
    if (isPreviewing) {
      return `Previewing ${selectedStation.name}. Tap Tune Now to move the active queue into this station and lock the hero to its live metadata.`;
    }
    if (insightsOpen) {
      return (
        aiTrivia.trivia?.summary
        ?? freeTrivia.trivia?.summary
        ?? `${selectedStation.name} is carrying live radio from ${selectedCountry}. Track notes, tags, and source links settle here as the stream updates.`
      );
    }
    return `${selectedStation.name} is carrying live radio from ${selectedCountry}. Track notes, tags, and source links settle here as the stream updates.`;
  }, [aiTrivia.trivia?.summary, freeTrivia.trivia?.summary, insightsOpen, isPreviewing, selectedCountry, selectedStation]);

  const heroFacts = useMemo(() => {
    const stationFacts = [
      selectedStation?.language ? { label: "Language", value: selectedStation.language } : null,
      selectedStation?.state ? { label: "Region", value: selectedStation.state } : null,
      selectedStation?.bitrate ? { label: "Signal", value: `${selectedStation.bitrate} kbps` } : null,
      selectedStation?.codec ? { label: "Codec", value: selectedStation.codec.toUpperCase() } : null,
    ].filter(Boolean) as Array<{ label: string; value: string }>;

    const insightFacts = insightsOpen
      ? [...(aiTrivia.trivia?.facts ?? []), ...(freeTrivia.trivia?.facts ?? [])]
      : [];

    return [...insightFacts, ...stationFacts]
      .filter((fact, index, collection) =>
        collection.findIndex(
          (candidate) =>
            candidate.label.toLowerCase() === fact.label.toLowerCase() &&
            candidate.value.toLowerCase() === fact.value.toLowerCase()
        ) === index
      )
      .slice(0, insightsOpen ? 6 : 4);
  }, [aiTrivia.trivia?.facts, freeTrivia.trivia?.facts, insightsOpen, selectedStation?.bitrate, selectedStation?.codec, selectedStation?.language, selectedStation?.state]);

  const countryContext = useMemo(() => {
    const languageCounts = new Map<string, number>();
    const tagCounts = new Map<string, number>();
    for (const station of stations) {
      if (station.language) {
        languageCounts.set(station.language, (languageCounts.get(station.language) ?? 0) + 1);
      }
      for (const tag of station.tagList ?? []) {
        if (!tag) continue;
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
    }

    const localTime = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const timeZoneName =
      new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
        .formatToParts(new Date())
        .find((part) => part.type === "timeZoneName")?.value ?? "Local";

    return {
      topLanguages: [...languageCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([label]) => label),
      topGenres: [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([label]) => label),
      localTime,
      timeZoneName,
    };
  }, [stations]);

  const links = insightsOpen
    ? [...(aiTrivia.trivia?.links ?? []), ...(freeTrivia.trivia?.links ?? [])]
        .filter((link, index, collection) => collection.findIndex((candidate) => candidate.url === link.url) === index)
        .slice(0, 3)
    : [];

  const handleDialChange = useCallback((index: number) => {
    const nextStation = stations[index];
    if (!nextStation) return;
    setSelectedStationId(nextStation.uuid);
  }, [stations]);

  const canRequestAi = Boolean(nowPlayingMeta.track && !isPreviewing);
  const activeQueueLabel = queueSourceLabel && queueSourceLabel !== `Country: ${selectedCountry}` ? queueSourceLabel : null;

  return (
    <motion.section
      id="country-hero"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[var(--rp-surface)] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl md:p-8"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,177,45,0.14),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(27,70,98,0.22),transparent_28%)]" />
      <div className="relative z-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--rp-text)]"
            >
              <IconArrowLeft size={14} />
              Back
            </button>
            <Badge
              radius="xl"
              size="lg"
              leftSection={<IconBroadcast size={15} />}
              className="border border-white/10 bg-black/35 text-[var(--rp-text)]"
            >
              {stationCount.toLocaleString()} stations
            </Badge>
            {activeQueueLabel ? (
              <Badge radius="xl" size="lg" className="border border-[rgba(245,177,45,0.24)] bg-[rgba(245,177,45,0.12)] text-[var(--rp-gold)]">
                Active Queue: {activeQueueLabel}
              </Badge>
            ) : null}
          </div>
          <Link
            to="/listen"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[rgba(245,177,45,0.38)] bg-[rgba(245,177,45,0.12)] px-4 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--rp-gold)]"
          >
            <IconMoonStars size={14} />
            Zen
          </Link>
        </div>

        <div className="space-y-5">
          <div className="relative overflow-hidden rounded-[1.9rem] border border-white/10 bg-black/25 p-5 shadow-[0_18px_36px_rgba(0,0,0,0.32)] md:p-6">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-y-0 right-0 hidden w-[46%] lg:block">
                <div className="absolute inset-y-5 left-6 right-5 overflow-hidden rounded-[2rem] border border-[rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(15,18,25,0.72),rgba(9,11,17,0.62))] shadow-[0_24px_50px_rgba(0,0,0,0.35)]">
                  {selectedStation ? (
                    <StationArtwork
                      station={selectedStation}
                      className="h-full w-full scale-[1.14] object-cover opacity-60 saturate-[0.96]"
                      fallbackClassName="flex h-full w-full items-center justify-center bg-[linear-gradient(180deg,#151c28,#0e1219)] text-6xl font-semibold text-amber-100/40"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,11,17,0.92)_0%,rgba(9,11,17,0.78)_24%,rgba(9,11,17,0.48)_52%,rgba(9,11,17,0.18)_100%)]" />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,11,17,0.08)_0%,rgba(9,11,17,0.28)_60%,rgba(9,11,17,0.52)_100%)]" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_24%,rgba(245,177,45,0.26),transparent_18%),radial-gradient(circle_at_32%_72%,rgba(27,70,98,0.22),transparent_26%)]" />
                  <div className="absolute inset-0 backdrop-blur-[1px]" />
                  <div className="absolute inset-y-8 left-5 w-px bg-[linear-gradient(180deg,transparent,rgba(255,255,255,0.12),transparent)]" />
                </div>
              </div>
              <div className="absolute right-[24%] top-6 hidden h-56 w-56 rounded-full bg-[rgba(245,177,45,0.12)] blur-[90px] lg:block" />
              <div className="absolute bottom-0 right-[34%] hidden h-48 w-48 rounded-full bg-[rgba(34,77,104,0.16)] blur-[84px] lg:block" />
            </div>

            <div className="relative z-10 grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <CountryFlag
                    iso={selectedCountryMeta?.iso_3166_1}
                    title={`${selectedCountry} flag`}
                    size={68}
                    className="rounded-2xl border border-white/20 shadow-[0_12px_24px_rgba(0,0,0,0.35)]"
                  />
                  <div className="min-w-0 flex-1">
                    <Text size="xs" className="font-semibold uppercase tracking-[0.32em] text-[var(--rp-muted-2)]">
                      Country Signal
                    </Text>
                    <Title order={1} className="truncate text-3xl font-semibold text-[var(--rp-text)] md:text-4xl">
                      {selectedCountry}
                    </Title>
                    <Text size="sm" c="var(--rp-muted)">
                      {selectedStation ? `Locked on ${selectedStation.name}` : "Choose a local station to open the listening story."}
                    </Text>
                  </div>
                </div>

                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Text size="xs" className="font-semibold uppercase tracking-[0.28em] text-[var(--rp-gold)]">
                        {isPreviewing ? "Station Preview" : insightsOpen ? "Insights On" : "Listening Story"}
                      </Text>
                      {!isPreviewing && insightsOpen ? (
                        <Badge radius="xl" className="border border-[rgba(245,177,45,0.3)] bg-[rgba(245,177,45,0.12)] text-[var(--rp-gold)]">
                          Synced with player
                        </Badge>
                      ) : null}
                    </div>
                    <Title order={2} className="text-3xl font-semibold leading-tight text-[var(--rp-text)] md:text-[2.4rem]">
                      {selectedStation?.name ?? "Choose a station"}
                    </Title>
                    <Text size="sm" c="var(--rp-muted)">
                      {[selectedStation?.country, selectedStation?.state, selectedStation?.language].filter(Boolean).join(" • ")}
                    </Text>
                  </div>

                  <div className="hidden h-24 w-24 shrink-0 overflow-hidden rounded-[1.4rem] border border-white/10 bg-black/30 shadow-[0_18px_30px_rgba(0,0,0,0.28)] md:block lg:hidden">
                    {selectedStation ? (
                      <StationArtwork
                        station={selectedStation}
                        className="h-full w-full object-cover"
                        fallbackClassName="flex h-full w-full items-center justify-center bg-[linear-gradient(180deg,#121822,#1a2331)] text-xl font-semibold text-amber-100"
                      />
                    ) : null}
                  </div>
                </div>

                <PretextMeasuredText
                  text={heroSummary}
                  font={COUNTRY_BODY_FONT}
                  lineHeight={22}
                  collapsedLines={4}
                  expandable
                  moreLabel="Expand note"
                  lessLabel="Collapse note"
                  lineClassName="text-sm font-medium leading-7 text-[var(--rp-text)]"
                  fallbackClassName="text-sm font-medium leading-7 text-[var(--rp-text)]"
                />

                <div className="flex flex-wrap gap-2">
                  <Badge radius="xl" className="border border-white/10 bg-black/35 text-[var(--rp-text)]">
                    {deriveFrequency(selectedStation)} MHz
                  </Badge>
                  {selectedStation?.bitrate ? (
                    <Badge radius="xl" className="border border-white/10 bg-black/35 text-[var(--rp-text)]">
                      {selectedStation.bitrate} kbps
                    </Badge>
                  ) : null}
                  {selectedStation?.codec ? (
                    <Badge radius="xl" className="border border-white/10 bg-black/35 text-[var(--rp-text)]">
                      {selectedStation.codec.toUpperCase()}
                    </Badge>
                  ) : null}
                  {heroFacts.slice(0, 3).map((fact) => (
                    <Badge
                      key={`${fact.label}-${fact.value}`}
                      radius="xl"
                      className="border border-white/10 bg-black/35 text-[var(--rp-text)]"
                    >
                      {fact.label}: {fact.value}
                    </Badge>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {isPreviewing && selectedStation ? (
                    <button
                      type="button"
                      onClick={() => onSelectStation(selectedStation)}
                      className="inline-flex items-center gap-2 rounded-full border border-[rgba(245,177,45,0.4)] bg-[rgba(245,177,45,0.12)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--rp-gold)]"
                    >
                      <IconBroadcast size={14} />
                      Tune Now
                    </button>
                  ) : null}
                  {!isPreviewing && onPlayPause ? (
                    <button
                      type="button"
                      onClick={onPlayPause}
                      className="inline-flex items-center gap-2 rounded-full border border-[rgba(245,177,45,0.4)] bg-[rgba(245,177,45,0.12)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--rp-gold)]"
                    >
                      {isPlaying ? <IconPlayerPauseFilled size={14} /> : <IconPlayerPlayFilled size={14} />}
                      {isPlaying ? "Pause" : "Play"}
                    </button>
                  ) : null}
                  {links.map((link) => {
                    const presentation = getReferencePresentation(link.url, link.label, link.kind);
                    const LinkIcon = presentation.icon;
                    return (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 text-[var(--rp-text)] transition-colors hover:border-[rgba(245,177,45,0.28)] hover:bg-[rgba(245,177,45,0.08)]"
                        aria-label={presentation.title}
                        title={presentation.title}
                      >
                        <LinkIcon size={14} />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                          {presentation.shortLabel}
                        </span>
                      </a>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 rounded-[1.6rem] border border-white/10 bg-black/25 p-4 lg:mt-5 lg:self-start">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Text size="xs" className="font-semibold uppercase tracking-[0.28em] text-[var(--rp-muted-2)]">
                      Tune + Queue
                    </Text>
                    <Text size="sm" c="var(--rp-muted)" className="mt-2">
                      Preview with the dial, then commit playback only when you want to switch the active station.
                    </Text>
                  </div>
                  <Text className="font-mono text-3xl font-semibold text-[var(--rp-gold)]">
                    {deriveFrequency(selectedStation)}
                  </Text>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(stations.length - 1, 0)}
                  value={Math.max(selectedIndex, 0)}
                  onChange={(event) => handleDialChange(Number(event.currentTarget.value))}
                  className="mt-5 h-2 w-full cursor-pointer accent-[var(--rp-gold)]"
                />
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onPrev}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/35 text-[var(--rp-text)]"
                    aria-label="Previous station"
                  >
                    <IconPlayerSkipBackFilled size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={onNext}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/35 text-[var(--rp-text)]"
                    aria-label="Next station"
                  >
                    <IconPlayerSkipForwardFilled size={18} />
                  </button>
                  <Text size="xs" c="var(--rp-muted)" className="ml-2 uppercase tracking-[0.2em]">
                    Queue position {queue.length > 0 ? currentIndex + 1 : 0} / {queue.length}
                  </Text>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.2rem] border border-white/10 bg-black/25 p-3">
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--rp-muted-2)]">
                      <IconLanguage size={13} />
                      Languages
                    </div>
                    <Text size="sm" className="mt-2 font-semibold text-[var(--rp-text)]">
                      {countryContext.topLanguages.join(" • ") || "Mixed"}
                    </Text>
                  </div>
                  <div className="rounded-[1.2rem] border border-white/10 bg-black/25 p-3">
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--rp-muted-2)]">
                      <IconTags size={13} />
                      Country Mix
                    </div>
                    <Text size="sm" className="mt-2 font-semibold text-[var(--rp-text)]">
                      {countryContext.topGenres.join(" • ") || "Open format"}
                    </Text>
                  </div>
                  <div className="rounded-[1.2rem] border border-white/10 bg-black/25 p-3">
                    <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--rp-muted-2)]">
                      <IconClock size={13} />
                      Local Time
                    </div>
                    <Text size="sm" className="mt-2 font-semibold text-[var(--rp-text)]">
                      {countryContext.localTime} {countryContext.timeZoneName}
                    </Text>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </motion.section>
  );
}
