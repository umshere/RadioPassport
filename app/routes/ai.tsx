import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconLoader2,
  IconRefresh,
  IconSparkles,
  IconWorld,
} from "@tabler/icons-react";

import { loadWorldDescriptor, loadWorldDescriptorPreview } from "~/services/aiOrchestrator";
import { sceneManager } from "~/services/sceneManager";
import { useRadioPlayer } from "~/hooks/useRadioPlayer";
import { useListeningMode } from "~/hooks/useListeningMode";
import { useSceneDescriptor } from "~/hooks/useSceneDescriptor";
import type { SceneDescriptor } from "~/scenes/types";

export const loader = async (_args: LoaderFunctionArgs) => {
  return json({ ok: true });
};

export default function AiExperience() {
  useLoaderData<typeof loader>();
  const player = useRadioPlayer();
  const mode = useListeningMode();
  const descriptor = useSceneDescriptor();

  const [isCurating, setIsCurating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prefetchedDescriptors, setPrefetchedDescriptors] = useState<Record<string, SceneDescriptor>>({});

  const moodSuggestions = useMemo(
    () => ["sunrise drive", "festival energy", "night city jazz", "balcony chill", "desert dusk"],
    []
  );

  const runWorldMix = useCallback(
    async (mood?: string) => {
      if (isCurating) return;
      setIsCurating(true);
      setError(null);
      try {
        await loadWorldDescriptor({
          mood,
          visual: "card_stack",
          sceneId: "card_stack",
          currentStationId: player.nowPlaying?.uuid ?? null,
          country: player.nowPlaying?.country ?? null,
          language: player.nowPlaying?.language ?? null,
          preferredCountries: player.nowPlaying?.country ? [player.nowPlaying.country] : [],
          preferredLanguages: player.nowPlaying?.language ? [player.nowPlaying.language] : [],
          onStartStation: (station, { autoPlay }) => {
            player.startStation(station, { autoPlay });
          },
        });
      } catch (err) {
        console.error("Failed to curate world mix", err);
        setError(
          err instanceof Error
            ? err.message
            : "We could not curate a world mix. Please try again."
        );
      } finally {
        setIsCurating(false);
      }
    },
    [isCurating, player]
  );

  const handlePlay = useCallback(() => {
    const first = descriptor?.stations?.[0];
    if (!first) return;
    player.startStation(first, { autoPlay: true });
  }, [descriptor?.stations, player]);

  const handlePlayStation = useCallback(
    (station) => {
      if (!station) return;
      player.startStation(station, { autoPlay: true });
    },
    [player]
  );

  const handleRefresh = useCallback(
    (mood?: string) => {
      if (mood && prefetchedDescriptors[mood]) {
        const cached = prefetchedDescriptors[mood];
        sceneManager.setDescriptor(cached);
        const first = cached.stations?.[0];
        if (first) player.startStation(first, { autoPlay: true });
        // Refresh in background to keep cache fresh
        runWorldMix(mood);
        return;
      }
      runWorldMix(mood);
    },
    [prefetchedDescriptors, player, runWorldMix]
  );

  useEffect(() => {
    mode.setListeningMode("world");
    runWorldMix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Prefetch a couple of moods in the background for snappier swaps
    const moodsToPrefetch = moodSuggestions.slice(0, 3);
    moodsToPrefetch.forEach(async (mood) => {
      if (prefetchedDescriptors[mood]) return;
      try {
        const descriptor = await loadWorldDescriptorPreview({
          mood,
          visual: "card_stack",
          sceneId: "card_stack",
          currentStationId: player.nowPlaying?.uuid ?? null,
          country: player.nowPlaying?.country ?? null,
          language: player.nowPlaying?.language ?? null,
          preferredCountries: player.nowPlaying?.country ? [player.nowPlaying.country] : [],
          preferredLanguages: player.nowPlaying?.language ? [player.nowPlaying.language] : [],
        });
        setPrefetchedDescriptors((prev) => ({
          ...prev,
          [mood]: descriptor,
        }));
      } catch (err) {
        console.error("Prefetch world descriptor failed", err);
      }
    });
  }, [moodSuggestions, player.nowPlaying, prefetchedDescriptors]);

  const context = {
    country: descriptor?.stations?.[0]?.country ?? player.nowPlaying?.country,
    language: descriptor?.stations?.[0]?.language ?? player.nowPlaying?.language,
    moods: moodSuggestions,
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-50 text-slate-900">
      <header className="flex items-center justify-between px-4 py-4 md:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white font-black">
            RP
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Radio Passport
            </p>
            <p className="text-sm font-semibold text-slate-800">AI Journey Lab</p>
          </div>
        </div>
        <Link
          to="/"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Back to classic
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-12 md:px-8">
        <WorldMixPanel
          descriptor={descriptor}
          isLoading={isCurating}
          error={error}
          onPlay={handlePlay}
          onRefresh={handleRefresh}
          context={context}
        />

        <section className="rounded-3xl border border-slate-200 bg-white/90 px-4 py-5 shadow-lg backdrop-blur md:px-6">
          <div className="flex flex-col gap-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white shadow-sm">
              <IconSparkles size={14} className="text-amber-400" />
              Try a prompt
            </div>
            <p className="text-base text-slate-600">
              Ask for a vibe, a place, or a memory. We&apos;ll curate a journey and start playing instantly.
            </p>
            <div className="flex flex-wrap gap-2">
              {moodSuggestions.map((mood) => (
                <button
                  key={mood}
                  type="button"
                  onClick={() => handleRefresh(mood)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white"
                  disabled={isCurating}
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white/90 px-4 py-5 shadow-lg backdrop-blur md:px-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                Curated stations
              </p>
              <p className="text-base font-semibold text-slate-800">
                {descriptor?.stations?.length ? `${descriptor.stations.length} picks in this mix` : "No stations yet"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleRefresh()}
              disabled={isCurating}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Refresh
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {(descriptor?.stations ?? []).map((station) => (
              <div
                key={station.uuid}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 px-3 py-3 shadow-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                    <p className="truncate text-sm font-semibold text-slate-900">{station.name}</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    {[station.country, station.language].filter(Boolean).join(" • ")}
                  </p>
                  {station.tags && (
                    <p className="text-xs text-slate-400 truncate">
                      {Array.isArray(station.tags) ? station.tags.join(", ") : station.tags}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handlePlayStation(station)}
                  className="shrink-0 rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow hover:bg-emerald-700"
                >
                  Play
                </button>
              </div>
            ))}
            {(descriptor?.stations?.length ?? 0) === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                We&apos;ll list the AI-curated stations here once a mix is ready.
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

type WorldMixPanelProps = {
  descriptor: SceneDescriptor | null;
  isLoading: boolean;
  error: string | null;
  onPlay: () => void;
  onRefresh: (mood?: string) => void;
  context: {
    country?: string;
    language?: string;
    moods: string[];
  };
};

function WorldMixPanel({ descriptor, isLoading, error, onPlay, onRefresh, context }: WorldMixPanelProps) {
  const stations = descriptor?.stations ?? [];
  const stationPreview = stations.slice(0, 4);
  const vibe =
    typeof descriptor?.mood === "string" && descriptor.mood.trim()
      ? descriptor.mood
      : "World mix";
  const reason =
    typeof descriptor?.reason === "string" && descriptor.reason.trim()
      ? descriptor.reason
      : "Our AI is curating a global set for you.";
  const playCopy =
    typeof descriptor?.play === "string" && descriptor.play.trim()
      ? descriptor.play
      : null;
  const hintParts = [
    context.country ? `Grounded in ${context.country}` : null,
    context.language ? `${context.language} voices` : null,
    playCopy,
  ].filter(Boolean);

  const pickMood = () => {
    if (context.moods.length === 0) return undefined;
    const index = Math.floor(Math.random() * context.moods.length);
    return context.moods[index];
  };

  return (
    <section className="mt-2">
      <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-r from-white/90 via-emerald-50/90 to-white/95 px-4 py-5 shadow-[0_16px_46px_rgba(16,185,129,0.18)] backdrop-blur">
        <div className="absolute -left-10 -top-12 h-32 w-32 rounded-full bg-emerald-300/20 blur-3xl" aria-hidden />
        <div className="absolute -right-6 -bottom-10 h-28 w-28 rounded-full bg-amber-200/30 blur-3xl" aria-hidden />

        <div className="relative flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-white shadow-sm">
              <IconWorld size={14} />
              AI World Mix
            </span>
            {hintParts.length > 0 && (
              <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-emerald-800/80">
                {hintParts.map((part) => (
                  <span key={part} className="rounded-full bg-white/80 px-3 py-1 border border-emerald-100">
                    {part}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[12px] font-semibold text-emerald-700 shadow-sm">
                <IconSparkles size={16} className="text-amber-500" />
                {vibe}
              </div>
              <p className="mt-2 text-base font-semibold text-slate-800 leading-tight">
                {reason}
              </p>
              {playCopy && (
                <p className="text-sm text-slate-500">
                  {playCopy}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onPlay}
                disabled={isLoading || stations.length === 0}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-md transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isLoading
                    ? "bg-slate-500"
                    : "bg-emerald-600 hover:scale-[1.02] hover:bg-emerald-700"
                }`}
              >
                {isLoading ? <IconLoader2 size={16} className="animate-spin" /> : <IconWorld size={16} />}
                {isLoading ? "Curating…" : "Start this mix"}
              </button>
              <button
                type="button"
                onClick={() => onRefresh(pickMood())}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/90 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <IconRefresh size={16} />
                New vibe
              </button>
            </div>
          </div>

          {isLoading && (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-white/80 px-3 py-2 text-sm text-emerald-700 shadow-inner">
              <IconLoader2 size={16} className="animate-spin" />
              <span>Curating a world set for you… pulling stations from your recent plays and favorites.</span>
            </div>
          )}

          {error && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => onRefresh()}
                className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-white px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.2em] text-amber-800 transition hover:bg-amber-100"
              >
                <IconRefresh size={14} />
                Retry
              </button>
            </div>
          )}

          {stationPreview.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {stationPreview.map((station) => (
                <div
                  key={station.uuid}
                  className="group inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-white/90 px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-emerald-200"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                  <span>{station.name}</span>
                  <span className="text-xs text-slate-500 group-hover:text-emerald-600">
                    {station.country}
                  </span>
                </div>
              ))}
              {stations.length > stationPreview.length && (
                <span className="text-sm text-emerald-700 font-semibold">
                  +{stations.length - stationPreview.length} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
