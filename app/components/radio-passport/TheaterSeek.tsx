import { useCallback, useEffect, useId, useRef, useState } from "react";
import { IntentBar } from "~/components/radio-passport/IntentBar";
import { loadWorldDescriptorPreview } from "~/services/aiOrchestrator";
import { resolveTypedIntent } from "~/services/ai/intent/promptIntent";
import { useJourneyStore } from "~/state/journeyStore";
import { usePlayerStore } from "~/state/playerStore";
import type { Station } from "~/types/radio";
import { createQueueSession } from "~/utils/playerQueue";
import { normalizeStations } from "~/utils/stations";

function haystack(station: Station) {
  return [
    station.name,
    station.tags,
    station.language,
    station.country,
    station.city,
    station.state,
    station.codec,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function stationMatches(station: Station, query: string) {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const text = haystack(station);
  return tokens.every((token) => text.includes(token));
}

/**
 * Theater seek lives in the site bar. Closed: one word. Open: the intent
 * field on that same rail. Lands in this room — never sends you home.
 */
export function TheaterSeek() {
  const panelId = useId();
  const railRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [mixLoading, setMixLoading] = useState(false);
  const startStation = usePlayerStore((state) => state.startStation);
  const nowPlaying = usePlayerStore((state) => state.nowPlaying);
  const recordPlayed = useJourneyStore((state) => state.recordPlayed);

  const land = useCallback(
    (station: Station, pool: Station[], label: string) => {
      const queue = createQueueSession({
        sourceType: "search",
        sourceLabel: label,
        stations: pool.length ? pool : [station],
        context: {
          country: station.country,
          query: query.trim() || null,
          view: "theater",
        },
      });
      startStation(station, { autoPlay: true, queueSession: queue });
      recordPlayed(station.uuid);
      setOpen(false);
      setQuery("");
      setStatus("");
    },
    [query, recordPlayed, startStation],
  );

  const surprise = useCallback(async () => {
    if (mixLoading) return;
    setMixLoading(true);
    setStatus("Tuning");
    try {
      const descriptor = await loadWorldDescriptorPreview({
        prompt: query.trim() || "Take me somewhere live at this hour of the world",
        currentStationId: nowPlaying?.uuid ?? null,
        visual: "card_stack",
        sceneId: "card_stack",
        country: nowPlaying?.country ?? null,
        language: nowPlaying?.language ?? null,
        preferredCountries: nowPlaying?.country ? [nowPlaying.country] : [],
        preferredLanguages: nowPlaying?.language ? [nowPlaying.language] : [],
      });
      const first = descriptor.stations[0];
      if (!first) {
        setStatus("No signal");
        return;
      }
      land(first, descriptor.stations, descriptor.mood || "World mix");
    } catch {
      setStatus("Signal lost");
    } finally {
      setMixLoading(false);
    }
  }, [land, mixLoading, nowPlaying, query]);

  const submit = useCallback(
    async (value: string) => {
      const prompt = value.trim();
      if (!prompt || loading) return;
      const resolved = resolveTypedIntent(prompt);
      if (resolved.wantsMix) {
        void surprise();
        return;
      }
      setLoading(true);
      setStatus("Filing");
      try {
        const response = await fetch(
          `/api/radio-catalog?stations=8000&q=${encodeURIComponent(resolved.query || prompt)}`,
        );
        if (!response.ok) {
          setStatus("Signal lost");
          return;
        }
        const data = (await response.json()) as { stations?: Station[] };
        const pool = normalizeStations(data.stations || [])
          .filter((station) => stationMatches(station, resolved.query || prompt))
          .slice(0, 200);
        const first = pool[0];
        if (!first) {
          setStatus("No signal");
          return;
        }
        land(first, pool, `Seek: ${resolved.query || prompt}`);
      } catch {
        setStatus("Signal lost");
      } finally {
        setLoading(false);
      }
    },
    [land, loading, surprise],
  );

  useEffect(() => {
    if (!open) return;
    const node = railRef.current?.querySelector("input");
    node?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setStatus("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div
      className={`ew-theater-rail${open ? " is-open" : ""}`}
      ref={railRef}
    >
      {open ? (
        <IntentBar
          value={query}
          onChange={(value) => {
            setQuery(value);
            if (status) setStatus("");
          }}
          onSubmit={(value) => void submit(value)}
          onSurprise={() => void surprise()}
          loading={loading}
          surpriseLoading={mixLoading}
          statusLabel={status}
          statusSpoken={status}
          statusTone={
            loading || mixLoading
              ? "searching"
              : status === "No signal" || status === "Signal lost"
                ? "empty"
                : "idle"
          }
        />
      ) : (
        <button
          type="button"
          className="ew-theater-seek"
          aria-expanded={false}
          aria-controls={panelId}
          onClick={() => setOpen(true)}
        >
          Seek
        </button>
      )}
      <span id={panelId} hidden={!open} className="sr-only">
        Ask for a place, language, mood, or station
      </span>
    </div>
  );
}
