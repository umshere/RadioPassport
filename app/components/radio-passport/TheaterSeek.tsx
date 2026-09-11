import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
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
 * Theater seek lives in the site bar. One object whose width is the state
 * (Bencho seek DNA, Phase 0): closed it is a 64px hide circle with the lens
 * at its fixed inset; open it springs wider and the intent field rises
 * inside — button and field never unmount-swap. Lands in this room — never
 * sends you home.
 */
export function TheaterSeek() {
  const panelId = useId();
  const railRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const sayRef = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLButtonElement>(null);
  const magnetOk = useRef(false);
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
    magnetOk.current =
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // The field stays mounted so open/close is one object changing — inert
  // (not unmounted) while closed. React 18 has no inert prop; the DOM does.
  // The lean vars are frame dressing: drop them whenever the pill opens.
  useEffect(() => {
    if (sayRef.current) sayRef.current.toggleAttribute("inert", !open);
    if (open) {
      pillRef.current?.style.removeProperty("--ew-seek-x");
      pillRef.current?.style.removeProperty("--ew-seek-y");
    }
  }, [open ]);

  // Magnet lean, closed only: the pill tips a few px toward the pointer.
  // Transform-only, desktop fine pointers, never under reduced motion.
  const lean = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const pill = pillRef.current;
      if (!pill || open || !magnetOk.current) return;
      const rect = pill.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const clamp = (value: number) =>
        Math.max(-6, Math.min(6, value / 8)).toFixed(1);
      pill.style.setProperty("--ew-seek-x", `${clamp(dx)}px`);
      pill.style.setProperty("--ew-seek-y", `${clamp(dy)}px`);
    },
    [open],
  );
  const unleash = useCallback(() => {
    pillRef.current?.style.removeProperty("--ew-seek-x");
    pillRef.current?.style.removeProperty("--ew-seek-y");
  }, []);

  useEffect(() => {
    if (!open) return;
    const node = railRef.current?.querySelector("input");
    node?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setStatus("");
        lensRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open ]);

  const busy = loading || mixLoading;

  return (
    <div
      className={`ew-theater-rail${open ? " is-open" : ""}`}
      ref={railRef}
    >
      <div
        ref={pillRef}
        className={`ew-seek${open ? " is-open" : ""}${busy ? " is-busy" : ""}`}
        onPointerMove={lean}
        onPointerLeave={unleash}
      >
        <button
          ref={lensRef}
          type="button"
          className="ew-seek-lens"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={
            open
              ? "Collapse seek"
              : "Seek — ask for a place, language, mood, or station"
          }
          onClick={() => {
            if (open) {
              setOpen(false);
              setStatus("");
            } else {
              setOpen(true);
            }
          }}
        >
          <svg
            viewBox="0 0 28 28"
            width="28"
            height="28"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="7" />
            <path d="M17.5 17.5 24 24" />
          </svg>
        </button>
        <div ref={sayRef} className="ew-seek-say" aria-hidden={!open}>
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
        </div>
        <span id={panelId} className="sr-only">
          Ask for a place, language, mood, or station
        </span>
      </div>
    </div>
  );
}
