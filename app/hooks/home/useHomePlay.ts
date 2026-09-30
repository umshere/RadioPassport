import { useCallback, useRef, useState } from "react";
import type { Station } from "~/types/radio";
import type { InterpretResponse } from "~/types/ai";
import { usePlayerStore } from "~/state/playerStore";
import { useJourneyStore } from "~/state/journeyStore";
import type { useListeningMode } from "~/hooks/useListeningMode";
import { loadWorldDescriptorPreview } from "~/services/aiOrchestrator";
import { resolveTypedIntent, solarHourFromWord } from "~/services/ai/intent/promptIntent";
import { createQueueSession } from "~/utils/playerQueue";
import { applyAiPreviewPool } from "~/components/radio-passport/aiPreview";
import {
  intentEchoFromInterpret,
  looksLikeIntentSentence,
} from "~/components/radio-passport/productFlow";
import {
  playFromAtlasNextState,
  surpriseTapNextState,
} from "~/components/radio-passport/searchState";
import type { SolarHour } from "~/utils/localTime";

type Args = {
  query: string;
  hour: SolarHour | null;
  place: string | null;
  setQuery: (value: string) => void;
  setHour: (value: SolarHour | null) => void;
  setPlace: (value: string | null) => void;
  selectedPool: Station[];
  listening: ReturnType<typeof useListeningMode>;
  /** A station landed (the home may answer it; the board stays where it is). */
  onLanded: () => void;
};

/**
 * Everything that starts a station from the home: a tap on a row or the
 * globe, the Land button, the world-mix "surprise", and a typed sentence
 * that the interpreter may tighten.
 */
export function useHomePlay({
  query,
  hour,
  place,
  setQuery,
  setHour,
  setPlace,
  selectedPool,
  listening,
  onLanded,
}: Args) {
  const nowPlaying = usePlayerStore((state) => state.nowPlaying);
  const startStation = usePlayerStore((state) => state.startStation);
  const favorites = useJourneyStore((state) => state.favoriteStationIds);
  const played = useJourneyStore((state) => state.playedStationIds);
  const recordPlayed = useJourneyStore((state) => state.recordPlayed);
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "error">("idle");
  const [mixLabel, setMixLabel] = useState<string | null>(null);
  // The interpreter's whisper: what it understood differently, until the next keystroke.
  const [intentEcho, setIntentEcho] = useState<string | null>(null);
  const queryRef = useRef(query);
  queryRef.current = query;

  const play = useCallback(
    (
      station: Station,
      pool = selectedPool,
      label = "Live now",
      home?: ReturnType<typeof playFromAtlasNextState>
    ) => {
      if (home) {
        setQuery(home.query);
        setHour(home.hour);
        setPlace(home.place);
        setMixLabel(home.mixLabel);
      }
      const q = home ? home.query : query;
      const h = home ? home.hour : hour;
      const p = home ? home.place : place;
      const mix = home ? home.mixLabel : mixLabel;
      const queue = createQueueSession({
        sourceType: home
          ? "atlas"
          : q.trim()
            ? "search"
            : listening.listeningMode === "world"
              ? "ai_mix"
              : "atlas",
        sourceLabel: mix || (q.trim() ? `Search: ${q.trim()}` : label),
        stations: pool,
        context: {
          country: station.country,
          query: q.trim() || null,
          view: "elsewhere",
        },
        seed: `${q}:${h || ""}:${p || ""}`,
      });
      startStation(station, { autoPlay: true, queueSession: queue });
      recordPlayed(station.uuid);
      // Landing is the globe's moment again: the sheet settles back to its
      // peek so the cover and the land stay in view.
      onLanded();
    },
    [
      hour,
      listening.listeningMode,
      mixLabel,
      onLanded,
      place,
      query,
      recordPlayed,
      selectedPool,
      setHour,
      setPlace,
      setQuery,
      startStation,
    ]
  );

  const requestAiWorld = useCallback(
    async (prompt?: string) => {
      if (aiStatus === "loading") return;
      const next = surpriseTapNextState();
      setQuery(next.query);
      setHour(next.hour);
      setPlace(next.place);
      setAiStatus("loading");
      listening.setIsFetchingExplore(true);
      listening.setExploreError(null);
      try {
        const descriptor = await loadWorldDescriptorPreview({
          prompt:
            prompt || "Take me somewhere live at this hour of the world",
          currentStationId: nowPlaying?.uuid ?? null,
          visual: "card_stack",
          sceneId: "card_stack",
          country: nowPlaying?.country ?? null,
          language: nowPlaying?.language ?? null,
          preferredCountries: nowPlaying?.country ? [nowPlaying.country] : [],
          preferredLanguages: nowPlaying?.language ? [nowPlaying.language] : [],
          favoriteStationIds: favorites,
          recentStationIds: played,
        });
        applyAiPreviewPool(descriptor, listening.setExploreStations);
        listening.setListeningMode("world");
        setMixLabel(descriptor.mood || descriptor.reason || "World mix");
        setAiStatus("idle");
        const first = descriptor.stations[0];
        if (first) {
          play(first, descriptor.stations, descriptor.mood || "World mix");
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "We could not curate a world mix. Please try again.";
        listening.setExploreError(message);
        setAiStatus("error");
      } finally {
        listening.setIsFetchingExplore(false);
      }
    },
    [aiStatus, favorites, listening, nowPlaying, play, played]
  );

  const submitIntent = useCallback(
    async (value: string) => {
      const prompt = value.trim();
      if (!prompt) return;
      const resolved = resolveTypedIntent(prompt);
      if (resolved.wantsMix) {
        void requestAiWorld(prompt);
        return;
      }
      setQuery(resolved.query);
      setHour(resolved.hour);
      const tightened =
        resolved.query.trim().toLowerCase() !== prompt.toLowerCase();
      if (resolved.hour || tightened || !looksLikeIntentSentence(prompt)) {
        return;
      }
      try {
        const response = await fetch("/api/ai/interpret", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            currentStationId: nowPlaying?.uuid ?? null,
            country: nowPlaying?.country ?? null,
            language: nowPlaying?.language ?? null,
          }),
        });
        if (!response.ok) return;
        const payload = (await response.json()) as InterpretResponse;
        // A slow response must never rewrite an intent the visitor already
        // retyped (or cleared) while waiting — same staleness rule as the echo.
        if (queryRef.current !== prompt) return;
        if (payload.intent.place) setPlace(payload.intent.place);
        if (payload.intent.language) {
          setQuery(payload.intent.language);
        } else if (payload.intent.query && payload.intent.query !== prompt) {
          setQuery(payload.intent.query);
        }
        const hour =
          solarHourFromWord(payload.intent.mood) ??
          solarHourFromWord(payload.intent.query);
        if (hour) setHour(hour);
        const echo = intentEchoFromInterpret(prompt, payload.intent);
        if (echo && queryRef.current === prompt) setIntentEcho(echo);
      } catch {
        // Catalog search already runs from the typed query.
      }
    },
    [nowPlaying, requestAiWorld]
  );

  return {
    play,
    requestAiWorld,
    submitIntent,
    aiStatus,
    mixLabel,
    setMixLabel,
    intentEcho,
    setIntentEcho,
  };
}
