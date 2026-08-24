import type { LinksFunction } from "@remix-run/node";
import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useNavigation,
  useRouteError,
} from "@remix-run/react";
import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { usePlayerStore } from "~/state/playerStore";
import {
  isStationTemporarilyUnavailable,
  useStationAvailabilityStore,
} from "~/state/stationAvailabilityStore";
import { isMixedContentStream } from "~/utils/streamHeuristics";
import {
  canRetryPlayback,
  getRetryDelayMs,
  MAX_PLAYBACK_RECOVERY_ATTEMPTS,
  withRetryToken,
} from "~/utils/playbackRecovery";
import { playbackNoticeCopy } from "~/utils/playbackNoticeCopy";
import stylesheet from "./tailwind.css?url";
import PlayerDock from "~/components/PlayerDock";
import SiteBar from "~/components/SiteBar";
import { usePlayerNoticeStore } from "~/state/playerNoticeStore";
import type { Station } from "~/types/radio";
import { sanitizeArtworkUrl } from "~/utils/stations";
import { JourneyBridge } from "~/components/radio-passport/JourneyBridge";
import { useAtmosphereStore } from "~/state/atmosphereStore";
import { ATMOSPHERE_BOOT_SCRIPT, ATMOSPHERE_THEME_COLOR } from "~/utils/atmosphere";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Azeret+Mono:wght@400;500&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500&family=Schibsted+Grotesk:wght@400;500;600&display=swap",
  },
  { rel: "icon", type: "image/svg+xml", href: "/elsewhere-favicon.svg" },
  { rel: "icon", type: "image/jpeg", sizes: "512x512", href: "/elsewhere-mark.jpg" },
  { rel: "apple-touch-icon", href: "/elsewhere-mark.jpg" },
  { rel: "manifest", href: "/manifest.json" },
];

function Document({
  children,
  title,
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <html lang="en" className="min-h-full" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <meta name="theme-color" content={ATMOSPHERE_THEME_COLOR.night} />
        <script
          dangerouslySetInnerHTML={{ __html: ATMOSPHERE_BOOT_SCRIPT }}
        />
        <link rel="icon" href="/elsewhere-favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/elsewhere-mark.jpg" />
        <meta
          name="description"
          content="Elsewhere: live radio from someone else's now. Land in a city, stay long enough to be stamped."
        />
        {/* Social card defaults; routes override only title/description/url.
            The still is rendered from scripts/og-still.html (render-og.mjs). */}
        <meta property="og:site_name" content="Elsewhere" />
        <meta property="og:type" content="website" />
        <meta
          property="og:image"
          content="https://elsewheremusic.com/elsewhere-og.jpg"
        />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta
          property="og:image:alt"
          content="Elsewhere — You are not here. Live radio from cities that are awake without you."
        />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Azeret+Mono:wght@400;500&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500&family=Schibsted+Grotesk:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        {title ? <title>{title}</title> : null}
        <Meta />
        <Links />
      </head>
      <body
        className="min-h-screen text-[var(--rp-text)] bg-[var(--rp-bg)]"
        style={{ background: "var(--rp-bg)" }}
        suppressHydrationWarning
      >
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const previousTitleRef = useRef("Elsewhere");
  const navigation = useNavigation();
  const location = useLocation();
  const isNavigating = navigation.state !== "idle";

  useEffect(() => {
    if (typeof document === "undefined") return;

    const DEFAULT_TITLE = "Elsewhere";
    const AWAY_TITLE = "Elsewhere — still elsewhere";
    const establishTitle = document.title || DEFAULT_TITLE;
    previousTitleRef.current = establishTitle;

    if (!document.title) {
      document.title = establishTitle;
    }

    const handleVisibility = () => {
      if (document.hidden) {
        previousTitleRef.current = document.title || DEFAULT_TITLE;
        document.title = AWAY_TITLE;
      } else {
        document.title = previousTitleRef.current || DEFAULT_TITLE;
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      document.title = previousTitleRef.current || DEFAULT_TITLE;
    };
  }, []);

  return (
    <Document>
      <>
        <SiteBar />
        {isNavigating && (
          <div className="ew-passage-bar" aria-hidden="true">
            <i />
          </div>
        )}

        <div
          key={location.pathname}
          className="ew-page w-full"
          style={{
            paddingBottom: "calc(var(--player-dock-clearance, 0px) + 1.5rem)",
          }}
        >
          <Outlet />
        </div>

        <PlayerDock />
        <JourneyBridge />
        <AtmosphereBridge />
        <GlobalAudioBridge />
      </>
    </Document>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  let title = "Something went wrong";
  let message =
    "The page hit an unexpected problem. You can jump back home or try reloading this route.";
  let statusLabel = "Application error";
  let details: string | null = null;

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    statusLabel = "Request error";
    if (error.status === 404) {
      message =
        "That room is not on the map.";
    } else if (typeof error.data === "string" && error.data.trim()) {
      message = error.data;
    } else {
      message =
        "The route failed to load correctly. Try going back home and re-entering this view.";
    }
  } else if (error instanceof Error) {
    message = error.message || message;
    details = error.stack ?? null;
  }

  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <Document title="404 | Elsewhere">
        <NotFoundEasterEgg title={title} message={message} />
      </Document>
    );
  }

  return (
    <Document title={`${title} | Elsewhere`}>
      <div className="min-h-screen bg-ink px-6 py-10 text-bone">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center">
          <div className="w-full">
            <p className="rp-eyebrow text-foil">{statusLabel}</p>
            <h1 className="ew-coverline mt-6">{title}</h1>
            <p className="rp-lede mt-4">{message}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/" className="ew-land" prefetch="intent">
                <span className="ew-land-kicker">EW · Return</span>
                <span className="ew-land-city">Back to Elsewhere</span>
              </Link>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rp-chip"
              >
                Reload
              </button>
            </div>
            {details ? (
              <details className="mt-8 border border-[var(--ew-rule)] bg-leather p-4 text-sm text-dust">
                <summary className="cursor-pointer text-bone">
                  Technical details
                </summary>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[12px] leading-6">
                  {details}
                </pre>
              </details>
            ) : null}
          </div>
        </div>
      </div>
    </Document>
  );
}

function NotFoundEasterEgg({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <main className="not-found-easter-egg relative min-h-screen overflow-hidden px-6 py-10 text-bone">
      <div className="not-found-easter-egg__pattern" aria-hidden="true" />
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-3xl flex-col items-start justify-center">
        <p className="rp-eyebrow text-foil">Lost</p>
        <h1 className="ew-coverline mt-4">{title}</h1>
        <p className="rp-lede mt-4 max-w-xl">{message}</p>
        <Link to="/" className="ew-land mt-8" prefetch="intent">
          <span className="ew-land-kicker">EW · Return</span>
          <span className="ew-land-city">Back to Elsewhere</span>
        </Link>
      </section>
    </main>
  );
}

function AtmosphereBridge() {
  const hydrate = useAtmosphereStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return null;
}

function GlobalAudioBridge() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nowPlayingRef =
    useRef<ReturnType<typeof usePlayerStore.getState>["nowPlaying"]>(null);
  const retryRef = useRef<{
    stationId: string | null;
    attempts: number;
    timer: number | null;
  }>({
    stationId: null,
    attempts: 0,
    timer: null,
  });
  const autoSkipRef = useRef<{ lastSkipAt: number; recentFailures: number[] }>({
    lastSkipAt: 0,
    recentFailures: [],
  });
  const setAudioElement = usePlayerStore((state) => state.setAudioElement);
  const setIsPlaying = usePlayerStore((state) => state.setIsPlaying);
  const setAudioLevel = usePlayerStore((state) => state.setAudioLevel);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const nowPlaying = usePlayerStore((state) => state.nowPlaying);
  const queue = usePlayerStore((state) => state.queue);
  const currentStationIndex = usePlayerStore(
    (state) => state.currentStationIndex
  );
  const startStation = usePlayerStore((state) => state.startStation);
  const playPause = usePlayerStore((state) => state.playPause);
  const stop = usePlayerStore((state) => state.stop);
  const markFailed = useStationAvailabilityStore((state) => state.markFailed);
  const clearFailure = useStationAvailabilityStore(
    (state) => state.clearFailure
  );
  const setNotice = usePlayerNoticeStore((state) => state.setNotice);
  const recordSkippedStation = usePlayerStore(
    (state) => state.recordSkippedStation
  );

  const clearRetryTimer = useCallback(() => {
    const active = retryRef.current.timer;
    if (active !== null && typeof window !== "undefined") {
      window.clearTimeout(active);
    }
    retryRef.current.timer = null;
  }, []);

  const normalizeStreamUrl = useCallback((url?: string | null) => {
    if (!url) return "";
    const trimmed = url.trim();
    const lower = trimmed.toLowerCase();
    if (
      !trimmed ||
      ["null", "undefined", "n/a", "na", "-", "0"].includes(lower)
    )
      return "";
    try {
      const candidate = trimmed.startsWith("//")
        ? `${window.location.protocol}${trimmed}`
        : trimmed;
      const parsed = new URL(candidate, window.location.origin);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.href;
      }
      return "";
    } catch {
      return "";
    }
  }, []);

  const autoSkipToNext = useCallback(
    (
      failedStation: Station | null,
      _reason: Parameters<typeof markFailed>[1]
    ) => {
      const now = Date.now();
      const guard = autoSkipRef.current;
      if (now - guard.lastSkipAt < 800) return;
      guard.lastSkipAt = now;

      // Avoid infinite spin if a bunch of stations fail quickly.
      guard.recentFailures = guard.recentFailures.filter(
        (ts) => now - ts < 20_000
      );
      guard.recentFailures.push(now);
      if (guard.recentFailures.length >= 4) {
        setNotice({
          kind: "error",
          message: playbackNoticeCopy("too-many-failures"),
          durationMs: 6000,
        });
        return;
      }

      const state = usePlayerStore.getState();
      const availability = useStationAvailabilityStore.getState().failuresById;
      const currentQueue = state.queue;

      if (currentQueue.length <= 1) {
        // Keep the current station displayed even if it failed
        state.setIsPlaying(false);
        setNotice({
          kind: "warning",
          message: playbackNoticeCopy("queue-empty"),
        });
        return;
      }

      const startIndex = Math.max(0, state.currentStationIndex);
      const pinnedId = state.nowPlaying?.uuid ?? null;
      const protocol =
        typeof window !== "undefined" ? window.location.protocol : "https:";

      let candidate: Station | null = null;
      for (let offset = 1; offset <= currentQueue.length; offset++) {
        const idx = (startIndex + offset) % currentQueue.length;
        const station = currentQueue[idx];
        if (!station) continue;
        if (pinnedId && station.uuid === pinnedId) continue;
        if (isStationTemporarilyUnavailable(availability[station.uuid], now))
          continue;
        const url = station.streamUrl ?? station.url ?? "";
        if (isMixedContentStream(url, protocol)) continue;
        candidate = station;
        break;
      }

      if (!candidate) {
        // Keep the current nowPlaying station (even if failed) so player doesn't disappear
        state.setIsPlaying(false);
        setNotice({
          kind: "warning",
          message: playbackNoticeCopy("queue-empty"),
          durationMs: 5000,
        });
        return;
      }

      if (failedStation?.uuid) {
        recordSkippedStation(failedStation.uuid);
      }
      setNotice({
        kind: "warning",
        message: playbackNoticeCopy("skip"),
        durationMs: 4500,
      });

      state.startStation(candidate, { preserveQueue: true, autoPlay: true });
    },
    [recordSkippedStation, setNotice]
  );

  const tryPlaybackRecovery = useCallback(
    (station: Station, reason: Parameters<typeof markFailed>[1]): boolean => {
      if (!canRetryPlayback(reason)) return false;
      if (!audioRef.current) return false;

      const retryState = retryRef.current;
      if (retryState.stationId !== station.uuid) {
        clearRetryTimer();
        retryState.stationId = station.uuid;
        retryState.attempts = 0;
      }

      if (retryState.attempts >= MAX_PLAYBACK_RECOVERY_ATTEMPTS) {
        return false;
      }

      retryState.attempts += 1;
      const retryAttempt = retryState.attempts;
      const delay = getRetryDelayMs(retryAttempt);
      const streamUrl = normalizeStreamUrl(
        station.streamUrl ?? station.url ?? ""
      );
      if (!streamUrl) return false;

      setNotice({
        kind: "info",
        message: playbackNoticeCopy("retrying", {
          attempt: retryAttempt,
          maxAttempts: MAX_PLAYBACK_RECOVERY_ATTEMPTS,
        }),
        durationMs: Math.max(2500, delay + 1200),
      });

      clearRetryTimer();
      retryState.timer = window.setTimeout(() => {
        const current = nowPlayingRef.current;
        if (!current || current.uuid !== station.uuid) return;
        const audio = audioRef.current;
        if (!audio) return;

        const retryToken = `${Date.now()}-${retryAttempt}`;
        audio.src = withRetryToken(streamUrl, retryToken);
        void audio.play().catch(() => {
          // Let normal error handlers decide whether to keep retrying or skip.
        });
      }, delay);

      return true;
    },
    [clearRetryTimer, normalizeStreamUrl, setNotice]
  );

  useEffect(() => {
    const element = audioRef.current;
    if (element) {
      element.autoplay = false;
      element.preload = "none";
      element.crossOrigin = "anonymous";
    }
    setAudioElement(element ?? null);

    return () => {
      clearRetryTimer();
      setAudioElement(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => setIsPlaying(false);
    const handleError = () => {
      setIsPlaying(false);
      const current = nowPlayingRef.current;
      if (!current) return;
      const url = current.streamUrl ?? current.url ?? "";
      const reason = isMixedContentStream(url, window.location.protocol)
        ? "mixed_content"
        : current.hls
        ? "hls_stream"
        : "audio_error";
      if (tryPlaybackRecovery(current, reason)) {
        return;
      }
      markFailed(current.uuid, reason);
      autoSkipToNext(current, reason);
    };
    const handlePlaying = () => {
      const current = nowPlayingRef.current;
      if (!current) return;
      clearFailure(current.uuid);
      autoSkipRef.current.recentFailures = [];
      clearRetryTimer();
      retryRef.current.stationId = current.uuid;
      retryRef.current.attempts = 0;
    };

    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("playing", handlePlaying);

    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("playing", handlePlaying);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    autoSkipToNext,
    clearFailure,
    clearRetryTimer,
    markFailed,
    setIsPlaying,
    tryPlaybackRecovery,
  ]);

  useEffect(() => {
    nowPlayingRef.current = nowPlaying;
    clearRetryTimer();
    retryRef.current.stationId = nowPlaying?.uuid ?? null;
    retryRef.current.attempts = 0;
  }, [clearRetryTimer, nowPlaying]);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!("mediaSession" in navigator)) return;

    const mediaSession = navigator.mediaSession;

    const safeSetHandler = (
      action: MediaSessionAction,
      handler: MediaSessionActionHandler | null
    ) => {
      try {
        mediaSession.setActionHandler(action, handler);
      } catch {
        // Some browsers throw on unsupported actions; ignore.
      }
    };

    safeSetHandler("play", () => playPause());
    safeSetHandler("pause", () => playPause());
    safeSetHandler("stop", () => stop());
    safeSetHandler("previoustrack", () => {
      if (!queue.length) return;
      const currentIndex = Math.max(0, currentStationIndex);
      const prevIndex = (currentIndex - 1 + queue.length) % queue.length;
      const station = queue[prevIndex];
      if (!station) return;
      startStation(station, { preserveQueue: true, autoPlay: true });
    });
    safeSetHandler("nexttrack", () => {
      if (!queue.length) return;
      const currentIndex = Math.max(0, currentStationIndex);
      const nextIndex = (currentIndex + 1) % queue.length;
      const station = queue[nextIndex];
      if (!station) return;
      startStation(station, { preserveQueue: true, autoPlay: true });
    });

    return () => {
      safeSetHandler("play", null);
      safeSetHandler("pause", null);
      safeSetHandler("stop", null);
      safeSetHandler("previoustrack", null);
      safeSetHandler("nexttrack", null);
    };
  }, [queue, currentStationIndex, startStation, playPause, stop]);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (!("mediaSession" in navigator)) return;
    const mediaSession = navigator.mediaSession;

    if (!nowPlaying) {
      mediaSession.metadata = null;
      mediaSession.playbackState = "none";
      return;
    }

    const artworkUrl = sanitizeArtworkUrl(nowPlaying.favicon);
    const artwork = artworkUrl
      ? [{ src: artworkUrl, sizes: "512x512", type: "image/png" }]
      : [];

    mediaSession.metadata = new MediaMetadata({
      title: nowPlaying.name ?? "Elsewhere",
      artist: nowPlaying.country ?? "Live radio",
      album: "Elsewhere",
      artwork,
    });

    mediaSession.playbackState = isPlaying ? "playing" : "paused";
  }, [nowPlaying, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!nowPlaying) {
      audio.pause();
      audio.removeAttribute("src");
      return;
    }

    const streamUrl = normalizeStreamUrl(
      nowPlaying.streamUrl ?? nowPlaying.url ?? ""
    );
    if (!streamUrl) {
      audio.pause();
      audio.removeAttribute("src");
      return;
    }

    if (isMixedContentStream(streamUrl, window.location.protocol)) {
      markFailed(nowPlaying.uuid, "mixed_content");
      setIsPlaying(false);
      audio.pause();
      audio.removeAttribute("src");
      autoSkipToNext(nowPlaying, "mixed_content");
      return;
    }

    if (audio.src !== streamUrl) {
      audio.src = streamUrl;
    }
  }, [nowPlaying, normalizeStreamUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!nowPlaying) {
      audio.pause();
      return;
    }

    if (isPlaying) {
      void audio
        .play()
        .then(() => {
          clearFailure(nowPlaying.uuid);
        })
        .catch(() => {
          setIsPlaying(false);
          const url = nowPlaying.streamUrl ?? nowPlaying.url ?? "";
          const reason = isMixedContentStream(url, window.location.protocol)
            ? "mixed_content"
            : nowPlaying.hls
            ? "hls_stream"
            : "play_rejected";
          if (tryPlaybackRecovery(nowPlaying, reason)) {
            return;
          }
          markFailed(nowPlaying.uuid, reason);
          autoSkipToNext(nowPlaying, reason);
        });
    } else {
      audio.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    autoSkipToNext,
    isPlaying,
    markFailed,
    nowPlaying,
    setIsPlaying,
    tryPlaybackRecovery,
  ]);

  useEffect(() => {
    if (!isPlaying) {
      setAudioLevel(0);
      return;
    }
    setAudioLevel(0.62);
  }, [isPlaying, nowPlaying?.uuid, setAudioLevel]);

  return <audio ref={audioRef} className="hidden" />;
}
