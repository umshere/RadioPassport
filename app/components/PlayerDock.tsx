import { useEffect, useRef } from "react";
import { usePlayerStore } from "~/state/playerStore";
import { canMutateJourney, useJourneyStore } from "~/state/journeyStore";
import { usePlayerNoticeStore } from "~/state/playerNoticeStore";
import {
  stationLocation,
  stationTelemetry,
} from "~/components/radio-passport/StationRow";
import { useStationInsightsStore } from "~/state/stationInsightsStore";

export function shouldAnimateDock(isPlaying: boolean, reducedMotion: boolean) {
  return isPlaying && !reducedMotion;
}

function hue(id: string) {
  return [...id].reduce(
    (total, char) => (total * 31 + char.charCodeAt(0)) % 360,
    0
  );
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !nowPlaying) return;
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
  }, [isPlaying, nowPlaying]);
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
      <canvas ref={canvasRef} className="rp-dock-art" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <strong className="block truncate">{nowPlaying.name}</strong>
        <span className="rp-telemetry block truncate">
          {stationLocation(nowPlaying)}, {nowPlaying.country} ·{" "}
          {stationTelemetry(nowPlaying)} · LIVE
        </span>
      </div>
      <button
        type="button"
        onClick={() =>
          canMutateJourney(hydrated) && toggleFavorite(nowPlaying.uuid)
        }
        disabled={!canMutateJourney(hydrated)}
        className={`grid h-11 w-11 place-items-center rounded-full text-lg ${
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
