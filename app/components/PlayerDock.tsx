import { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "@remix-run/react";
import {
  homeWithPassportHref,
  openPassportNow,
} from "~/components/radio-passport/productFlow";
import { useHydrated } from "~/hooks/useHydrated";
import { usePlayerStore } from "~/state/playerStore";
import { canMutateJourney, useJourneyStore } from "~/state/journeyStore";
import { usePlayerNoticeStore } from "~/state/playerNoticeStore";
import { useRoom } from "~/hooks/useRoom";
import { dispatchRequestFor, roomForStation, useRoomStore } from "~/state/roomStore";
import {
  sharedSignals,
  upNextFresh,
  useUpNextStore,
} from "~/state/upNextStore";
import type { DispatchResponse } from "~/types/ai";
import { stationLocation } from "~/components/radio-passport/StationRow";

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
  const location = useLocation();
  const navigate = useNavigate();
  const mounted = useHydrated();
  const nowPlaying = usePlayerStore((state) => state.nowPlaying);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const queue = usePlayerStore((state) => state.queue);
  const index = usePlayerStore((state) => state.currentStationIndex);
  const startStation = usePlayerStore((state) => state.startStation);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const favorites = useJourneyStore((state) => state.favoriteStationIds);
  const hydrated = useJourneyStore((state) => state.hydrated);
  const toggleFavorite = useJourneyStore((state) => state.toggleFavorite);
  const stamps = useJourneyStore((state) => state.stamps);
  const notice = usePlayerNoticeStore((state) => state.notice);
  useRoom(nowPlaying, isPlaying);
  const storedRoom = useRoomStore((state) => state.room);
  const room = roomForStation(storedRoom, nowPlaying?.uuid);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !nowPlaying) return;
    const context = canvas.getContext("2d");
    if (!context) return;
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
      context.fillStyle = `hsl(${hue(nowPlaying.uuid)} 28% 16%)`;
      context.fillRect(0, 0, rect.width, rect.height);
      context.strokeStyle = "rgba(198,165,106,.85)";
      context.beginPath();
      context.arc(c, c, r, 0, Math.PI * 2);
      context.stroke();
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2 + t,
          rr = r + (isPlaying ? Math.sin(t * 3 + i) * 3 : 0);
        context.fillStyle = i % 4 === 0 ? "#C73A3A" : "#E8DFD0";
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
      if (isPlaying) {
        t += 0.04;
        raf = requestAnimationFrame(draw);
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, nowPlaying]);

  useEffect(() => {
    if (!mounted || !nowPlaying) return;
    const next = queue.length
      ? queue[(index + 1) % queue.length]
      : null;
    if (!isPlaying || !next || next.uuid === nowPlaying.uuid) return;
    const id = next.uuid;
    const store = useUpNextStore.getState();
    if (upNextFresh(store.entries[id], Date.now())) return;
    store.put(id, {
      dispatch: null,
      shared: sharedSignals(nowPlaying, next),
      fetchedAt: Date.now(),
    });
    let alive = true;
    void fetch("/api/ai/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dispatchRequestFor(next, null)),
    })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((payload: DispatchResponse | null) => {
        if (!alive || !payload?.dispatch) return;
        useUpNextStore.getState().put(id, {
          dispatch: payload.dispatch,
          shared: sharedSignals(nowPlaying, next),
          fetchedAt: Date.now(),
        });
      })
      .catch(() => { });
    return () => {
      alive = false;
    };
  }, [index, isPlaying, mounted, nowPlaying, queue]);

  useEffect(() => {
    if (!nowPlaying) return;
    const apply = () => {
      const mobile = window.matchMedia("(max-width: 960px)").matches;
      document.documentElement.style.setProperty(
        "--player-dock-clearance",
        mobile ? "108px" : "88px"
      );
    };
    apply();
    const media = window.matchMedia("(max-width: 960px)");
    media.addEventListener("change", apply);
    return () => {
      media.removeEventListener("change", apply);
      document.documentElement.style.removeProperty("--player-dock-clearance");
    };
  }, [nowPlaying]);

  if (!mounted || !nowPlaying) return null;

  const go = (direction: number) => {
    if (!queue.length) return;
    const next = queue[(index + direction + queue.length) % queue.length];
    if (next) startStation(next, { preserveQueue: true, autoPlay: true });
  };

  const city = stationLocation(nowPlaying);
  const stamped = stamps.some(
    (stamp) =>
      stamp.city.toLowerCase() === city.toLowerCase() &&
      stamp.country.toLowerCase() === (nowPlaying.country || "").toLowerCase()
  );
  const track = room.signal.track;
  const trackLine = track
    ? [track.artist, track.title].filter(Boolean).join(" — ")
    : null;

  return (
    <aside className="rp-dock" aria-label="Now playing">
      <Link to="/listen" prefetch="intent" viewTransition aria-label="Open listening theater">
        <canvas ref={canvasRef} className="rp-dock-art" aria-hidden="true" />
      </Link>
      <div className="min-w-0 flex-1">
        <strong className="block truncate">{nowPlaying.name}</strong>
        <span className="ew-dock-sub rp-telemetry mt-0.5 block truncate">
          LIVE · {city}
        </span>
        <span className="ew-dock-track mt-0.5 block truncate text-[12px] text-dust">
          {trackLine ||
            room.caption?.localLabel ||
            `Live from ${city}. No track title from this station.`}
        </span>
      </div>
      <button
        type="button"
        className="ew-stamp-ring"
        onClick={() =>
          openPassportNow(location.pathname, () =>
            navigate(homeWithPassportHref())
          )
        }
        aria-label={
          stamped ? "Open passport — this city is stamped" : "Open passport"
        }
        title={stamped ? "Stamped" : "Stay 60 seconds to ink this city"}
        style={{
          borderRadius: "50%",
          border: `1px solid ${stamped ? "var(--ew-foil)" : "var(--ew-ghost)"
            }`,
          // Unstamped background belongs to the stylesheet: the ink fill is a
          // conic-gradient driven by --stamp-ink, written by JourneyBridge.
          ...(stamped ? { background: "var(--ew-foil-wash-strong)" } : {}),
        }}
      />
      <button
        type="button"
        onClick={() =>
          canMutateJourney(hydrated) &&
          toggleFavorite(nowPlaying.uuid, nowPlaying)
        }
        disabled={!canMutateJourney(hydrated)}
        className={`rp-dock-heart grid h-11 w-11 place-items-center rounded-full text-lg ${favorites.includes(nowPlaying.uuid) ? "text-foil" : "text-dust"
          }`}
        aria-label="Toggle favorite"
      >
        {favorites.includes(nowPlaying.uuid) ? "♥" : "♡"}
      </button>
      <button
        type="button"
        className="rp-dock-control"
        onClick={() => go(-1)}
        aria-label="Previous station"
      >
        ‹
      </button>
      <button
        type="button"
        className={`rp-dock-play${isPlaying ? " is-live" : ""}`}
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
      <Link
        to="/listen"
        className="rp-theater-link rp-eyebrow text-foil"
        prefetch="intent"
        viewTransition
      >
        Theater
      </Link>
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
