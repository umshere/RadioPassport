import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useNowPlayingMetadata } from "~/hooks/useNowPlayingMetadata";
import { useTrackTrivia } from "~/hooks/useTrackTrivia";
import { usePlayerStore } from "~/state/playerStore";
import { useStationInsightsStore } from "~/state/stationInsightsStore";
import { sanitizeArtworkUrl } from "~/utils/stations";
import {
  safeExternalUrl,
  focusTrapTarget,
  isAiTrackOptedIn,
  isVisibleFocusableElement,
  canRestoreFocusToTrigger,
  stationDetailsPresentation,
  shouldRequestSelectedNowPlaying,
  shouldResetAiTrackOptIn,
  shouldFocusAiResult,
  trackKey,
} from "./stationInsights";

const FOCUSABLE =
  'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement | null) {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    isVisibleFocusableElement,
  );
}

function ExternalLinks({
  links,
  label,
}: {
  links: Array<{ label: string; url: string }>;
  label: string;
}) {
  const safe = links
    .map((link) => ({ ...link, url: safeExternalUrl(link.url) }))
    .filter((link): link is { label: string; url: string } =>
      Boolean(link.url),
    );
  if (!safe.length) return null;
  return (
    <div className="rp-insights-links">
      {safe.map((link) => (
        <a
          key={`${link.label}:${link.url}`}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {link.label} <span aria-hidden="true">↗</span>
        </a>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}

function TriviaBlock({
  title,
  state,
  ai = false,
}: {
  title: string;
  state: {
    status: "idle" | "loading" | "ready" | "empty" | "error";
    trivia: {
      summary: string;
      facts: Array<{ label: string; value: string }>;
      links?: Array<{ label: string; url: string }>;
    } | null;
    message: string | null;
  };
  ai?: boolean;
}) {
  return (
    <section className="rp-insights-section">
      <p className="rp-eyebrow">{title}</p>
      {state.status === "loading" && (
        <p role="status">Looking up track context…</p>
      )}
      {state.status === "empty" && (
        <p>Source-backed track context is unavailable for this track.</p>
      )}
      {state.status === "error" && (
        <p role="alert">
          {state.message ?? "Track context could not be loaded."}
        </p>
      )}
      {state.status === "ready" && state.trivia && (
        <>
          <p>{state.trivia.summary}</p>
          {state.trivia.facts.length > 0 && (
            <dl className="rp-insights-facts">
              {state.trivia.facts.map((fact) => (
                <div key={`${fact.label}:${fact.value}`}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}
          <ExternalLinks
            links={state.trivia.links ?? []}
            label={ai ? "AI-related links" : "Source links"}
          />
          <small>
            {ai
              ? "AI-generated context — not verified station metadata."
              : "Source-backed track context."}
          </small>
        </>
      )}
    </section>
  );
}

export default function StationInsightsSheet() {
  const station = useStationInsightsStore((state) => state.station);
  const trigger = useStationInsightsStore((state) => state.trigger);
  const close = useStationInsightsStore((state) => state.close);
  const nowPlaying = usePlayerStore((state) => state.nowPlaying);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const dialogRef = useRef<HTMLDivElement>(null);
  const aiResultRef = useRef<HTMLDivElement>(null);
  const [aiRequestedFor, setAiRequestedFor] = useState("");
  const canRequestMetadata = shouldRequestSelectedNowPlaying(
    station,
    nowPlaying,
    isPlaying,
  );
  const metadata = useNowPlayingMetadata(
    station,
    canRequestMetadata,
  );
  const currentTrackKey = trackKey(metadata.track);
  const ownsMetadata = canRequestMetadata && metadata.status === "ready" && Boolean(metadata.track);
  const freeTrivia = useTrackTrivia({
    track: metadata.track,
    source: "free",
    enabled: ownsMetadata,
  });
  const aiEnabled = ownsMetadata && isAiTrackOptedIn(currentTrackKey, aiRequestedFor);
  const aiTrivia = useTrackTrivia({
    track: metadata.track,
    source: "ai",
    enabled: aiEnabled,
    context: {
      summary: freeTrivia.trivia?.summary ?? null,
      facts: freeTrivia.trivia?.facts ?? [],
    },
  });
  const previousAiEnabledRef = useRef(false);
  useEffect(() => {
    if (shouldFocusAiResult(previousAiEnabledRef.current, aiEnabled)) {
      aiResultRef.current?.focus();
    }
    previousAiEnabledRef.current = aiEnabled;
  }, [aiEnabled]);

  const previousStationRef = useRef<string | null>(null);
  const previousTrackRef = useRef("");
  useEffect(() => {
    if (shouldResetAiTrackOptIn(
      previousStationRef.current,
      station?.uuid ?? null,
      previousTrackRef.current,
      currentTrackKey,
    )) setAiRequestedFor("");
    previousStationRef.current = station?.uuid ?? null;
    if (currentTrackKey) previousTrackRef.current = currentTrackKey;
  }, [station?.uuid, currentTrackKey]);

  useEffect(() => {
    if (!station) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => {
      getFocusableElements(dialogRef.current)?.[0]?.focus();
    }, 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = originalOverflow;
      const focusTrigger = trigger;
      if (canRestoreFocusToTrigger(focusTrigger)) focusTrigger.focus();
    };
  }, [station, close, trigger]);

  const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const focusable = getFocusableElements(event.currentTarget);
    const target = focusTrapTarget(
      focusable.length,
      focusable.indexOf(document.activeElement as HTMLElement),
      event.shiftKey,
    );
    if (target === "dialog") {
      event.preventDefault();
      event.currentTarget.focus();
    }
    if (target === "first") {
      event.preventDefault();
      focusable[0]?.focus();
    }
    if (target === "last") {
      event.preventDefault();
      focusable[focusable.length - 1]?.focus();
    }
  };
  const presentation = useMemo(
    () => (station ? stationDetailsPresentation(station) : null),
    [station],
  );

  if (!station) return null;
  const artwork = sanitizeArtworkUrl(station.favicon);
  return (
    <div
      className="rp-insights-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        className="rp-insights-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="station-insights-title"
        tabIndex={-1}
        onKeyDown={trapFocus}
      >
        <header className="rp-insights-head">
          {artwork && (
            <img
              src={artwork}
              alt=""
              className="rp-insights-art"
              onError={(event) => {
                event.currentTarget.hidden = true;
              }}
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="rp-eyebrow">STATION DETAILS</p>
            <h2 id="station-insights-title">{station.name}</h2>
          </div>
          <button
            type="button"
            className="rp-close"
            onClick={close}
            aria-label={`Close details for ${station.name}`}
          >
            ×
          </button>
        </header>
        <div className="rp-insights-content">
          {presentation!.tags.length > 0 && (
            <div className="rp-insights-tags">
              {presentation!.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          )}
          <dl className="rp-insights-facts">
            {presentation!.details.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {presentation!.homepage && (
            <ExternalLinks
              links={[{ label: "Station homepage", url: presentation!.homepage }]}
              label="Station source"
            />
          )}
          <section className="rp-insights-section">
            <p className="rp-eyebrow">LIVE NOW</p>
            {!canRequestMetadata && (
              <p>Play this station to request live track metadata.</p>
            )}
            {canRequestMetadata && metadata.status === "idle" && (
              <p>Playback is paused.</p>
            )}
            {canRequestMetadata && metadata.status === "loading" && (
              <p role="status">Reading the live stream…</p>
            )}
            {canRequestMetadata && metadata.status === "empty" && (
              <p>
                {metadata.message ?? "No current track metadata is available."}
              </p>
            )}
            {canRequestMetadata && metadata.status === "error" && (
              <p role="alert">
                {metadata.message ?? "Live metadata could not be read."}
              </p>
            )}
            {canRequestMetadata && metadata.status === "ready" && metadata.track && (
              <>
                <p className="rp-track-line">
                  {[metadata.track.artist, metadata.track.title]
                    .filter(Boolean)
                    .join(" — ") || metadata.track.raw}
                </p>
                {metadata.refreshing && <p role="status">Refreshing live metadata…</p>}
              </>
            )}
          </section>
          {ownsMetadata && (
            <>
              <TriviaBlock
                title="SOURCE-BACKED TRACK CONTEXT"
                state={freeTrivia}
              />
              <section className="rp-insights-section">
                <p className="rp-eyebrow">AI TRACK CONTEXT</p>
                <div
                  ref={aiResultRef}
                  tabIndex={-1}
                  aria-label="AI track context results"
                >
                {!aiEnabled ? (
                  <button
                    type="button"
                    className="rp-insights-ai-action"
                    onClick={() => setAiRequestedFor(currentTrackKey)}
                  >
                    Generate AI context for this track
                  </button>
                ) : (
                  <TriviaBlock title="AI-GENERATED" state={aiTrivia} ai />
                )}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
