import { useEffect, useRef, useState } from "react";
import { usePlayerStore } from "~/state/playerStore";
import { canMutateJourney, useJourneyStore } from "~/state/journeyStore";
import { usePlayerNoticeStore } from "~/state/playerNoticeStore";
import { stationLocationLabel } from "~/components/radio-passport/StationRow";
import { useStationInsightsStore } from "~/state/stationInsightsStore";
import { useNowPlayingMetadata } from "~/hooks/useNowPlayingMetadata";
import { useNowPlayingMetadataStore } from "~/state/nowPlayingMetadataStore";
import { CountryFlag } from "~/components/CountryFlag";
import { sanitizeArtworkUrl } from "~/utils/stations";

export function shouldAnimateDock(isPlaying: boolean, reducedMotion: boolean) {
  return isPlaying && !reducedMotion;
}

function hue(id: string) {
  return [...id].reduce(
    (total, char) => (total * 31 + char.charCodeAt(0)) % 360,
    0
  );
}

function trackLineFromMetadata(
  isPlaying: boolean,
  status: string,
  track: { artist: string | null; title: string | null; raw: string } | null
): string | null {
  if (!isPlaying) return null;
  if (status === "ready" && track) {
    const artist = track.artist?.trim() || null;
    const title = track.title?.trim() || null;
    if (artist && title) return `${artist} — ${title}`;
    if (title) return title;
    if (artist) return artist;
    const raw = track.raw?.trim();
    if (raw) return raw;
  }
  return "Live broadcast";
}

export default function PlayerDock() {
  const nowPlaying = usePlayerStore((state) => state.nowPlaying);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const queue = usePlayerStore((state) => state.queue);
  const index = usePlayerStore((state) => state.currentStationIndex);
  const startStation = usePlayerStore((state) => state.startStation);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const favorites = useJourneyStore((state) => state.favoriteStationIds);
  const hydrated = useJourneyStore((state) => state.hydrated);
  const toggleFavorite = useJourneyStore((state) => state.toggleFavorite);
  const notice = usePlayerNoticeStore((state) => state.notice);
  const openDetails = useStationInsightsStore((state) => state.open);
  // Single app-wide poller for the playing station; sheet reads the shared store.
  const metadata = useNowPlayingMetadata(nowPlaying, isPlaying);
  const setSharedMetadata = useNowPlayingMetadataStore(
    (state) => state.setMetadata
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [logoFailed, setLogoFailed] = useState(false);

  const artwork = nowPlaying ? sanitizeArtworkUrl(nowPlaying.favicon) : null;
  const showLogo = Boolean(artwork) && !logoFailed;
  const locationLabel = nowPlaying ? stationLocationLabel(nowPlaying) : "";
  const countryCode = nowPlaying?.countryCode?.trim() ?? "";
  const showFlag = countryCode.length === 2;
  const trackLine = trackLineFromMetadata(
    isPlaying,
    metadata.status,
    metadata.track
  );

  useEffect(() => {
    setSharedMetadata(metadata);
  }, [metadata, setSharedMetadata]);

  useEffect(() => {
    setLogoFailed(false);
  }, [nowPlaying?.uuid, artwork]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !nowPlaying || showLogo) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let reducedMotion = Boolean(media?.matches);
    let raf = 0,
      t = 0;
    const draw = () => {
      const rect = canvas.getBoundingClientRect(),
        dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const c = rect.width / 2,
        r = rect.width * 0.27;
      context.fillStyle = `hsl(${hue(nowPlaying.uuid)} 35% 24%)`;
      context.fillRect(0, 0, rect.width, rect.height);
      context.strokeStyle = "rgba(229,83,95,.8)";
      context.setLineDash([2, 3]);
      context.beginPath();
      context.arc(c, c, r, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2 + t,
          rr = r + (isPlaying ? Math.sin(t * 3 + i) * 3 : 0);
        context.fillStyle = i % 4 === 0 ? "#E5535F" : "#F2EDE4";
        context.beginPath();
        context.arc(
          c + Math.cos(a) * rr,
          c + Math.sin(a) * rr,
          1.5,
          0,
          Math.PI * 2
        );
        context.fill();
      }
      if (shouldAnimateDock(isPlaying, reducedMotion)) {
        t += 0.04;
        raf = requestAnimationFrame(draw);
      }
    };
    const onMotionChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;
      cancelAnimationFrame(raf);
      draw();
    };
    media?.addEventListener?.("change", onMotionChange);
    draw();
    return () => {
      cancelAnimationFrame(raf);
      media?.removeEventListener?.("change", onMotionChange);
    };
  }, [isPlaying, nowPlaying, showLogo]);
  useEffect(() => {
    if (!nowPlaying) return;
    document.documentElement.style.setProperty(
      "--player-dock-clearance",
      "126px"
    );
    return () => {
      document.documentElement.style.removeProperty("--player-dock-clearance");
    };
  }, [nowPlaying]);
  if (!nowPlaying) return null;
  const go = (direction: number) => {
    if (!queue.length) return;
    const next = queue[(index + direction + queue.length) % queue.length];
    if (next) startStation(next, { preserveQueue: true, autoPlay: true });
  };
  return (
    <aside className="rp-dock" aria-label="Now playing">
      {showLogo ? (
        <img
          src={artwork!}
          alt=""
          className="rp-dock-art rp-dock-logo"
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <canvas ref={canvasRef} className="rp-dock-art" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">
        <strong className="block truncate">{nowPlaying.name}</strong>
        {trackLine && (
          <span
            key={trackLine}
            className="rp-dock-track block truncate text-paper"
          >
            {trackLine}
          </span>
        )}
        <span className="rp-dock-location flex min-w-0 items-center gap-1.5 truncate text-muted">
          {showFlag && (
            <CountryFlag
              iso={countryCode}
              size={12}
              width={14}
              height={10}
              title={nowPlaying.country}
              className="rp-dock-flag shrink-0"
            />
          )}
          <span className="truncate">{locationLabel}</span>
        </span>
      </div>
      <button
        type="button"
        onClick={() =>
          canMutateJourney(hydrated) && toggleFavorite(nowPlaying.uuid)
        }
        disabled={!canMutateJourney(hydrated)}
        className={`rp-dock-favorite hidden h-11 w-11 place-items-center rounded-full text-lg sm:grid ${
          favorites.includes(nowPlaying.uuid) ? "text-coral" : "text-muted"
        }`}
        aria-label="Toggle favorite"
      >
        {favorites.includes(nowPlaying.uuid) ? "♥" : "♡"}
      </button>
      <button
        type="button"
        className="rp-dock-control"
        onClick={(event) => openDetails(nowPlaying, event.currentTarget)}
        aria-label={`Open details for ${nowPlaying.name}`}
      >
        <span aria-hidden="true">i</span>
      </button>
      <button
        type="button"
        className="rp-dock-control hidden sm:grid"
        onClick={() => go(-1)}
        aria-label="Previous station"
      >
        ‹
      </button>
      <button
        type="button"
        className="rp-dock-play"
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? "Ⅱ" : "▶"}
      </button>
      <button
        type="button"
        className="rp-dock-control"
        onClick={() => go(1)}
        aria-label="Next station"
      >
        ›
      </button>
      {notice && (
        <div
          className={`rp-player-notice rp-player-notice-${notice.kind}`}
          role={notice.kind === "error" ? "alert" : "status"}
          aria-live={notice.kind === "error" ? "assertive" : "polite"}
        >
          {notice.message}
        </div>
      )}
    </aside>
  );
}
