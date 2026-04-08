import type { LinksFunction } from "@remix-run/node";
import { isRouteErrorResponse, Link, Links, Meta, Outlet, Scripts, ScrollRestoration, useNavigation, useRouteError } from "@remix-run/react";
import { MantineProvider, createTheme } from "@mantine/core";
import { type ReactNode, useCallback, useEffect, useRef } from "react";
import { usePlayerStore } from "~/state/playerStore";
import { isStationTemporarilyUnavailable, useStationAvailabilityStore } from "~/state/stationAvailabilityStore";
import { isMixedContentStream } from "~/utils/streamHeuristics";
import {
  canRetryPlayback,
  getRetryDelayMs,
  MAX_PLAYBACK_RECOVERY_ATTEMPTS,
  withRetryToken,
} from "~/utils/playbackRecovery";
import stylesheet from "./tailwind.css?url";
import AppHeader from "~/components/AppHeader";
import PlayerDock from "~/components/PlayerDock";
import MobileSidebarMenu from "~/components/MobileSidebarMenu";
import { TuningOverlay } from "~/components/TuningOverlay";
import { usePlayerNoticeStore } from "~/state/playerNoticeStore";
import type { Station } from "~/types/radio";
import { sanitizeArtworkUrl } from "~/utils/stations";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700,800&display=swap",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap",
  },
  { rel: "icon", type: "image/png", sizes: "48x48", href: "/favicon48.png" },
  { rel: "manifest", href: "/manifest.json" },
];

function Document({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <html lang="en" className="min-h-full" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0b0c10" />
        <meta name="description" content="Radio Passport: Curated live radio discovery with moods, regional picks, and strong stations worth playing now" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700,800&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
        {title ? <title>{title}</title> : null}
        <Meta />
        <Links />
      </head>
      <body
        className="min-h-screen text-[var(--rp-text)] bg-[var(--rp-bg)]"
        style={{ background: "var(--rp-bg)" }}
        suppressHydrationWarning
      >
        <MantineProvider theme={theme} defaultColorScheme="light">
          {children}
        </MantineProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

const ocean = [
  "#e1f0ff",
  "#c3dcf3",
  "#9cc1e5",
  "#74a5d6",
  "#4d8ac7",
  "#296faf",
  "#15598f",
  "#0a4875",
  "#04345b",
  "#013a63",
] as const;

const passport = [
  "#fffaf4",
  "#fdf2e6",
  "#f9e6d2",
  "#f3d7b9",
  "#edc8a0",
  "#d8b084",
  "#ba9063",
  "#987249",
  "#755532",
  "#4a3721",
] as const;

const stamp = [
  "#ffe7eb",
  "#ffcdd5",
  "#fda3b5",
  "#fa7a95",
  "#f55478",
  "#e63a60",
  "#d1495b",
  "#a93250",
  "#7d2340",
  "#4f162a",
] as const;

const horizon = [
  "#e7f6f9",
  "#d1eef2",
  "#a9dee4",
  "#80cdd5",
  "#57bcc7",
  "#3ca0ac",
  "#2c7f8a",
  "#21626b",
  "#16444c",
  "#0b262d",
] as const;

const theme = createTheme({
  colors: {
    ocean,
    passport,
    stamp,
    horizon,
  },
  primaryColor: "ocean",
  primaryShade: 8,
  defaultRadius: "xl",
  fontFamily:
    '"General Sans", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  fontFamilyMonospace:
    '"IBM Plex Mono", "SF Mono", Monaco, "Cascadia Code", "Courier New", monospace',
  headings: {
    fontFamily:
      '"General Sans", "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    fontWeight: "700",
  },
  shadows: {
    xs: "0 1px 2px rgba(0, 0, 0, 0.04)",
    sm: "0 2px 8px rgba(0, 0, 0, 0.06)",
    md: "0 4px 12px rgba(0, 0, 0, 0.08)",
    lg: "0 8px 24px rgba(0, 0, 0, 0.12)",
    xl: "0 16px 48px rgba(0, 0, 0, 0.16)",
  },
  defaultGradient: {
    from: "#f8fafc",
    to: "#e2e8f0",
    deg: 135,
  },
});

export default function App() {
  const previousTitleRef = useRef("Radio Passport");
  const navigation = useNavigation();
  const isNavigating = navigation.state !== "idle";

  useEffect(() => {
    if (typeof document === "undefined") return;

    const DEFAULT_TITLE = "Radio Passport";
    const AWAY_TITLE = "🌐 Radio Passport — Still Traveling…";
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
        {isNavigating && (
          <div className="fixed top-0 left-0 right-0 z-[200] h-1 bg-[#0b0c10]">
            <div
              className="h-full bg-gradient-to-r from-[#f6c86f] via-[#f1aa45] to-[#e99f2b] animate-[loading_1s_ease-in-out_infinite]"
              style={{
                animation: "loading 1s ease-in-out infinite",
                transformOrigin: "left",
              }}
            />
          </div>
        )}

        <MobileSidebarMenu />
        <AppHeader />

        <div
          className="w-full"
          style={{ paddingBottom: "calc(var(--player-dock-clearance, 0px) + 1.5rem)" }}
        >
          <Outlet />
        </div>

        <PlayerDock />
        <TuningOverlay />
        <GlobalAudioBridge />
      </>
    </Document>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();

  let title = "Something went wrong";
  let message = "The page hit an unexpected problem. You can jump back home or try reloading this route.";
  let statusLabel = "Application error";
  let details: string | null = null;

  if (isRouteErrorResponse(error)) {
    title = `${error.status} ${error.statusText}`;
    statusLabel = "Request error";
    if (typeof error.data === "string" && error.data.trim()) {
      message = error.data;
    } else if (error.status === 404) {
      message = "That page is not available anymore, or the route changed during the redesign.";
    } else {
      message = "The route failed to load correctly. Try going back home and re-entering this view.";
    }
  } else if (error instanceof Error) {
    message = error.message || message;
    details = error.stack ?? null;
  }

  return (
    <Document title={`${title} | Radio Passport`}>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(245,177,45,0.12),transparent_28%),linear-gradient(180deg,#090b10_0%,#11141b_100%)] px-6 py-10 text-[var(--rp-text)]">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center justify-center">
          <div className="w-full rounded-[2rem] border border-white/10 bg-[rgba(9,11,16,0.84)] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(245,177,45,0.28)] bg-[rgba(245,177,45,0.1)] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--rp-gold)]">
              {statusLabel}
            </div>
            <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-4xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/72">{message}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/"
                className="inline-flex items-center rounded-full border border-[rgba(245,177,45,0.38)] bg-[rgba(245,177,45,0.12)] px-5 py-3 text-sm font-semibold text-[var(--rp-gold)]"
              >
                Back Home
              </Link>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/78"
              >
                Reload Page
              </button>
            </div>
            {details ? (
              <details className="mt-8 rounded-[1.25rem] border border-white/10 bg-black/20 p-4 text-sm text-white/58">
                <summary className="cursor-pointer font-semibold text-white/72">Technical details</summary>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[12px] leading-6 text-white/55">
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

function GlobalAudioBridge() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nowPlayingRef = useRef<ReturnType<typeof usePlayerStore.getState>["nowPlaying"]>(null);
  const retryRef = useRef<{ stationId: string | null; attempts: number; timer: number | null }>({
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
  const currentStationIndex = usePlayerStore((state) => state.currentStationIndex);
  const startStation = usePlayerStore((state) => state.startStation);
  const playPause = usePlayerStore((state) => state.playPause);
  const stop = usePlayerStore((state) => state.stop);
  const markFailed = useStationAvailabilityStore((state) => state.markFailed);
  const clearFailure = useStationAvailabilityStore((state) => state.clearFailure);
  const setNotice = usePlayerNoticeStore((state) => state.setNotice);
  const recordSkippedStation = usePlayerStore((state) => state.recordSkippedStation);

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
    if (!trimmed || ["null", "undefined", "n/a", "na", "-", "0"].includes(lower)) return "";
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
    (failedStation: Station | null, reason: Parameters<typeof markFailed>[1]) => {
      const now = Date.now();
      const guard = autoSkipRef.current;
      if (now - guard.lastSkipAt < 800) return;
      guard.lastSkipAt = now;

      // Avoid infinite spin if a bunch of stations fail quickly.
      guard.recentFailures = guard.recentFailures.filter((ts) => now - ts < 20_000);
      guard.recentFailures.push(now);
      if (guard.recentFailures.length >= 4) {
        setNotice({
          kind: "error",
          message: "Playback paused: too many stations failed in a row. Try toggling filters or switching countries.",
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
          message: "This station failed to play. Try another station.",
        });
        return;
      }

      const startIndex = Math.max(0, state.currentStationIndex);
      const pinnedId = state.nowPlaying?.uuid ?? null;
      const protocol = typeof window !== "undefined" ? window.location.protocol : "https:";

      let candidate: Station | null = null;
      for (let offset = 1; offset <= currentQueue.length; offset++) {
        const idx = (startIndex + offset) % currentQueue.length;
        const station = currentQueue[idx];
        if (!station) continue;
        if (pinnedId && station.uuid === pinnedId) continue;
        if (isStationTemporarilyUnavailable(availability[station.uuid], now)) continue;
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
          message: "Couldn’t find another playable station in this queue. Try changing filters.",
          durationMs: 5000,
        });
        return;
      }

      const label = failedStation?.name ? `“${failedStation.name}”` : "That station";
      if (failedStation?.uuid) {
        recordSkippedStation(failedStation.uuid);
      }
      setNotice({
        kind: "warning",
        message: `${label} failed (${reason.replace(/_/g, " ")}). Skipping to the next station…`,
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
      const streamUrl = normalizeStreamUrl(station.streamUrl ?? station.url ?? "");
      if (!streamUrl) return false;

      setNotice({
        kind: "info",
        message: `Signal unstable for “${station.name}”. Retrying (${retryAttempt}/${MAX_PLAYBACK_RECOVERY_ATTEMPTS})…`,
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
  }, [autoSkipToNext, clearFailure, clearRetryTimer, markFailed, setIsPlaying, tryPlaybackRecovery]);

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
      title: nowPlaying.name ?? "Radio Passport",
      artist: nowPlaying.country ?? "Curated Live Radio",
      album: "Radio Passport",
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

    const streamUrl = normalizeStreamUrl(nowPlaying.streamUrl ?? nowPlaying.url ?? "");
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
  }, [autoSkipToNext, isPlaying, markFailed, nowPlaying, setIsPlaying, tryPlaybackRecovery]);

  useEffect(() => {
    if (!isPlaying) {
      setAudioLevel(0);
      return;
    }
    setAudioLevel(0.62);
  }, [isPlaying, nowPlaying?.uuid, setAudioLevel]);

  return <audio ref={audioRef} className="hidden" />;
}
