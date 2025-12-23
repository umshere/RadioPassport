import type { LinksFunction } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useNavigation } from "@remix-run/react";
import { MantineProvider, createTheme } from "@mantine/core";
import { useCallback, useEffect, useRef } from "react";
import { usePlayerStore } from "~/state/playerStore";
import { isStationTemporarilyUnavailable, useStationAvailabilityStore } from "~/state/stationAvailabilityStore";
import { isMixedContentStream } from "~/utils/streamHeuristics";
import stylesheet from "./tailwind.css?url";
import AppHeader from "~/components/AppHeader";
import PlayerDock from "~/components/PlayerDock";
import MobileSidebarMenu from "~/components/MobileSidebarMenu";
import { TuningOverlay } from "~/components/TuningOverlay";
import { usePlayerNoticeStore } from "~/state/playerNoticeStore";
import type { Station } from "~/types/radio";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@500;600;700&family=Poppins:wght@500;600;700&display=swap",
  },
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
  { rel: "manifest", href: "/manifest.json" },
];

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
    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  fontFamilyMonospace:
    '"Roboto Mono", "IBM Plex Mono", "SF Mono", Monaco, "Cascadia Code", "Courier New", monospace',
  headings: {
    fontFamily:
      '"Inter", "Satoshi", -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif',
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
    <html lang="en" className="min-h-full" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#e0e5ec" />
        <meta name="description" content="Radio Passport: Explore the world's radio stations with an elegant, minimal interface" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Roboto+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <Meta />
        <Links />
      </head>
      <body
        className="min-h-screen text-slate-900 bg-[#e0e5ec]"
        style={{
          background: "#e0e5ec",
        }}
        suppressHydrationWarning
      >
        <MantineProvider theme={theme} defaultColorScheme="light">
          <>
            {/* Loading progress bar */}
            {isNavigating && (
              <div className="fixed top-0 left-0 right-0 z-[200] h-1 bg-[#e0e5ec]">
                <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-[loading_1s_ease-in-out_infinite]"
                  style={{
                    animation: "loading 1s ease-in-out infinite",
                    transformOrigin: "left"
                  }}
                />
              </div>
            )}

            {/* Mobile Sidebar Menu */}
            <MobileSidebarMenu />

            {/* Global app shell header */}
            <AppHeader />

            {/* Main content area */}
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
              <Outlet />
            </div>

            {/* Player surfaces */}
            <PlayerDock />
            <TuningOverlay />
            <GlobalAudioBridge />
          </>
        </MantineProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

function GlobalAudioBridge() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nowPlayingRef = useRef<ReturnType<typeof usePlayerStore.getState>["nowPlaying"]>(null);
  const autoSkipRef = useRef<{ lastSkipAt: number; recentFailures: number[] }>({
    lastSkipAt: 0,
    recentFailures: [],
  });
  const {
    setAudioElement,
    setIsPlaying,
    setAudioLevel,
    isPlaying,
    nowPlaying,
  } = usePlayerStore();
  const markFailed = useStationAvailabilityStore((state) => state.markFailed);
  const clearFailure = useStationAvailabilityStore((state) => state.clearFailure);
  const setNotice = usePlayerNoticeStore((state) => state.setNotice);

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
      setNotice({
        kind: "warning",
        message: `${label} failed (${reason.replace(/_/g, " ")}). Skipping to the next station…`,
        durationMs: 4500,
      });

      state.startStation(candidate, { preserveQueue: true, autoPlay: true });
    },
    [setNotice]
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
      markFailed(current.uuid, reason);
      autoSkipToNext(current, reason);
    };
    const handlePlaying = () => {
      const current = nowPlayingRef.current;
      if (!current) return;
      clearFailure(current.uuid);
      autoSkipRef.current.recentFailures = [];
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
  }, []);

  useEffect(() => {
    nowPlayingRef.current = nowPlaying;
  }, [nowPlaying]);

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
          markFailed(nowPlaying.uuid, reason);
          autoSkipToNext(nowPlaying, reason);
        });
    } else {
      audio.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, nowPlaying]);

  useEffect(() => {
    if (!isPlaying) {
      setAudioLevel(0);
      return;
    }

    let frame = 0;

    const animate = () => {
      setAudioLevel(Math.random() * 0.6 + 0.2);
      frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  return <audio ref={audioRef} className="hidden" />;
}
