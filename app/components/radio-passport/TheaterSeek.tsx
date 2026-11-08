import { useCallback, useEffect, useRef, useState } from "react";
import { IntentBar } from "~/components/radio-passport/IntentBar";
import { SeekShell } from "~/components/radio-passport/SeekShell";
import { useStationRequest } from "~/hooks/useStationRequest";
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
 * Theater seek lives in the letter under the heading. The chrome is the
 * shared SeekShell (one expanding pill); this container owns open state and
 * the land / catalog / surprise / voice / status behavior. Lands in this
 * room — never sends you home.
 */
export function TheaterSeek({ held = false }: { held?: boolean }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [openState, setOpen] = useState(false);
  // Held: the field is always on (the desk's gate row), never a collapsing pill.
  const open = held || openState;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const { pending, begin, cancel } = useStationRequest<"search" | "mix">();
  const loading = pending === "search";
  const mixLoading = pending === "mix";
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
    const request = begin("mix");
    setStatus("");
    try {
      const descriptor = await loadWorldDescriptorPreview({
        signal: request.signal,
        prompt: query.trim() || "Take me somewhere live at this hour of the world",
        currentStationId: nowPlaying?.uuid ?? null,
        visual: "card_stack",
        sceneId: "card_stack",
        country: nowPlaying?.country ?? null,
        language: nowPlaying?.language ?? null,
        preferredCountries: nowPlaying?.country ? [nowPlaying.country] : [],
        preferredLanguages: nowPlaying?.language ? [nowPlaying.language] : [],
      });
      if (!request.finish()) return;
      const first = descriptor.stations[0];
      if (!first) {
        setStatus("No signal");
        return;
      }
      land(first, descriptor.stations, descriptor.mood || "World mix");
    } catch {
      if (request.finish()) setStatus("Signal lost");
    }
  }, [begin, land, nowPlaying, query]);

  const submit = useCallback(
    async (value: string) => {
      const prompt = value.trim();
      if (!prompt) return;
      const resolved = resolveTypedIntent(prompt);
      if (resolved.wantsMix) {
        void surprise();
        return;
      }
      const request = begin("search");
      setStatus("");
      try {
        const response = await fetch(
          `/api/radio-catalog?stations=8000&q=${encodeURIComponent(resolved.query || prompt)}`,
          { signal: request.signal },
        );
        if (!response.ok) {
          if (request.finish()) setStatus("Signal lost");
          return;
        }
        const data = (await response.json()) as { stations?: Station[] };
        const pool = normalizeStations(data.stations || [])
          .filter((station) => stationMatches(station, resolved.query || prompt))
          .slice(0, 200);
        if (!request.finish()) return;
        const first = pool[0];
        if (!first) {
          setStatus("No signal");
          return;
        }
        land(first, pool, `Seek: ${resolved.query || prompt}`);
      } catch {
        if (request.finish()) setStatus("Signal lost");
      }
    },
    [begin, land, surprise],
  );

  useEffect(() => {
    if (!open || held) return;
    const node = railRef.current?.querySelector("input");
    node?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cancel();
        setOpen(false);
        setStatus("");
        railRef.current
          ?.querySelector<HTMLButtonElement>(".ew-seek-lens")
          ?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancel, open, held]);

  const busy = loading || mixLoading;
  const statusLabel = loading ? "Filing" : mixLoading ? "Tuning" : status;

  return (
    <div
      className={`ew-theater-rail${open ? " is-open" : ""}`}
      ref={railRef}
    >
      <SeekShell
        open={open}
        toggleable={!held}
        busy={busy}
        onLensClick={() => {
          if (open) {
            cancel();
            setOpen(false);
            setStatus("");
          } else {
            setOpen(true);
          }
        }}
      >
        <IntentBar
          value={query}
          onChange={(value) => {
            cancel();
            setQuery(value);
            if (status) setStatus("");
          }}
          onSubmit={(value) => void submit(value)}
          onSurprise={() => void surprise()}
          loading={loading}
          surpriseLoading={mixLoading}
          statusLabel={statusLabel}
          statusSpoken={statusLabel}
          statusTone={
            loading || mixLoading
              ? "searching"
              : status === "No signal" || status === "Signal lost"
                ? "empty"
                : "idle"
          }
        />
      </SeekShell>
    </div>
  );
}
