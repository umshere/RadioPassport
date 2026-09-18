import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "@remix-run/react";
import {
  freshlyInkedStampIds,
  homeWithPassportHref,
  openPassportNow,
  stampMatchesCity,
  theaterTransportCopy,
} from "~/components/radio-passport/productFlow";
import { useHydrated } from "~/hooks/useHydrated";
import { usePlayerStore } from "~/state/playerStore";
import { canMutateJourney, useJourneyStore } from "~/state/journeyStore";
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
  useRoom(nowPlaying, isPlaying);
  const storedRoom = useRoomStore((state) => state.room);
  const room = roomForStation(storedRoom, nowPlaying?.uuid);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  // The deck is the dock expanded: labeled transport cells (Back / Keep /
  // Play / Next / Passport) that used to live a second life in the theater
  // letter. One transport, one object — the row stays the compact face.
  const [deckOpen, setDeckOpen] = useState(false);
  const [ink, setInk] = useState<number | null>(null);

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

  // Stamp countdown for the deck ring — read from the ink JourneyBridge
  // writes. The deck stays mounted (one object), inert while closed.
  useEffect(() => {
    if (!nowPlaying) return;
    const read = () => {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--stamp-ink")
        .trim();
      if (!raw) {
        setInk(null);
        return;
      }
      const next = Number(raw);
      setInk(Number.isFinite(next) ? Math.min(1, Math.max(0, next)) : null);
    };
    read();
    const timer = window.setInterval(read, 1000);
    return () => window.clearInterval(timer);
  }, [nowPlaying?.uuid, isPlaying]);

  useEffect(() => {
    if (deckRef.current)
      deckRef.current.toggleAttribute("inert", !deckOpen);
  }, [deckOpen ]);

  const city = nowPlaying ? stationLocation(nowPlaying) : "";
  const stamped = nowPlaying
    ? stamps.some((stamp) =>
        stampMatchesCity(stamp, city, nowPlaying.country || "")
      )
    : false;

  // Fresh-stamp slam: celebrate only a stamp id that actually appeared while
  // this city is on the dial. A station switch onto an old stamp adds no id,
  // so the beat can never fire for a stay that already happened.
  const seenStampIds = useRef<string[] | null>(null);
  const [freshCity, setFreshCity] = useState<string | null>(null);
  useEffect(() => {
    const ids = stamps.map((stamp) => stamp.id);
    const seen = seenStampIds.current;
    seenStampIds.current = ids;
    if (!seen) return;
    const added = new Set(freshlyInkedStampIds(seen, stamps));
    if (!added.size) return;
    const hit = stamps.some(
      (stamp) => added.has(stamp.id) && stampMatchesCity(stamp, city, nowPlaying?.country || "")
    );
    if (!hit) return;
    setFreshCity(city);
    const timer = window.setTimeout(() => setFreshCity(null), 2600);
    return () => window.clearTimeout(timer);
  }, [stamps, city, nowPlaying?.country]);
  const fresh = freshCity !== null && freshCity === city;

  useEffect(() => {
    if (!deckOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDeckOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deckOpen ]);

  if (!mounted || !nowPlaying) return null;

  const go = (direction: number) => {
    if (!queue.length) return;
    const next = queue[(index + direction + queue.length) % queue.length];
    if (next) startStation(next, { preserveQueue: true, autoPlay: true });
  };

  const track = room.signal.track;
  const trackLine = track
    ? [track.artist, track.title].filter(Boolean).join(" — ")
    : null;
  const kept = favorites.includes(nowPlaying.uuid);
  const secondsLeft =
    ink === null ? null : Math.max(0, Math.ceil((1 - ink) * 60));
  const deckCopy = theaterTransportCopy({
    isPlaying,
    kept,
    stamped,
    secondsLeft,
  });

  return (
    <aside
      className={`rp-dock${deckOpen ? " is-open" : ""}`}
      aria-label="Now playing"
    >
      <div ref={deckRef} className="rp-dock-deck" aria-hidden={!deckOpen}>
        <div className="rp-dock-deck-clip">
          <div className="rp-dock-deck-row" role="group" aria-label="Room controls">
            <span className="rp-dock-cell">
              <button
                type="button"
                className="rp-dock-tbtn"
                onClick={() => go(-1)}
                aria-label="Previous station"
                tabIndex={deckOpen ? undefined : -1}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M18 5.5v13L9 12l9-6.5Z" />
                  <rect x="5.5" y="5.5" width="2.4" height="13" rx="1" />
                </svg>
              </button>
              <span className="rp-dock-clabel" aria-hidden="true">{deckCopy.back}</span>
            </span>
            <span className={`rp-dock-cell${kept ? " is-on" : ""}`}>
              <button
                type="button"
                className={`rp-dock-tbtn${kept ? " is-on" : ""}`}
                onClick={() =>
                  canMutateJourney(hydrated) && toggleFavorite(nowPlaying.uuid, nowPlaying)
                }
                disabled={!canMutateJourney(hydrated)}
                aria-label={kept ? "Kept — this signal is in your passport" : "Keep this signal"}
                tabIndex={deckOpen ? undefined : -1}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill={kept ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="1.3"
                  aria-hidden="true"
                >
                  <path d="M12 20s-7.5-4.7-7.5-9.6A4.4 4.4 0 0 1 12 7.5a4.4 4.4 0 0 1 7.5 2.9C19.5 15.3 12 20 12 20Z" />
                </svg>
              </button>
              <span className="rp-dock-clabel" aria-hidden="true">{deckCopy.keep}</span>
            </span>
            <span className="rp-dock-cell">
              <button
                type="button"
                className="rp-dock-tplay"
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause" : "Play"}
                tabIndex={deckOpen ? undefined : -1}
              >
                {isPlaying ? (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <rect x="6.5" y="4.5" width="4" height="15" rx="1" />
                    <rect x="13.5" y="4.5" width="4" height="15" rx="1" />
                  </svg>
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M8 5.5v13L19 12 8 5.5Z" />
                  </svg>
                )}
              </button>
              <span className="rp-dock-clabel" aria-hidden="true">{deckCopy.play}</span>
            </span>
            <span className="rp-dock-cell">
              <button
                type="button"
                className="rp-dock-tbtn"
                onClick={() => go(1)}
                aria-label="Next station"
                tabIndex={deckOpen ? undefined : -1}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M6 5.5v13L15 12 6 5.5Z" />
                  <rect x="16.1" y="5.5" width="2.4" height="13" rx="1" />
                </svg>
              </button>
              <span className="rp-dock-clabel" aria-hidden="true">{deckCopy.next}</span>
            </span>
            <span className={`rp-dock-cell${stamped ? " is-on" : ""}`}>
              <button
                type="button"
                className={`rp-dock-ring${stamped ? " is-stamped" : ""}`}
                onClick={() =>
                  openPassportNow(location.pathname, () =>
                    navigate(homeWithPassportHref())
                  )
                }
                aria-label={`Passport — ${deckCopy.passportHint}`}
                title={deckCopy.passportHint}
                tabIndex={deckOpen ? undefined : -1}
              >
                <span>
                  {stamped ? (
                    <i className="rp-dock-ring-dot" aria-hidden="true" />
                  ) : secondsLeft === null ? (
                    ""
                  ) : (
                    `${secondsLeft}s`
                  )}
                </span>
              </button>
              <span className="rp-dock-clabel" aria-hidden="true">{deckCopy.passport}</span>
            </span>
          </div>
        </div>
      </div>
      <div className="rp-dock-row">
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
        title={
          fresh
            ? "Freshly inked — this city just stamped itself"
            : stamped
              ? "Stamped"
              : "Stay 60 seconds to ink this city"
        }
        data-stamped={stamped || undefined}
        data-fresh={fresh || undefined}
        style={{
          borderRadius: "50%",
          border: `1px solid ${stamped ? "var(--ew-foil)" : "var(--ew-ghost)"
            }`,
          // Unstamped background belongs to the stylesheet: the ink fill is a
          // conic-gradient driven by --stamp-ink, written by JourneyBridge.
          ...(stamped ? { background: "var(--ew-foil-wash-strong)" } : {}),
        }}
      >
        <i className="ew-stamp-ring-dot" aria-hidden="true" />
      </button>
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
        className="rp-dock-control rp-dock-prev"
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
        className="rp-dock-control rp-dock-next"
        onClick={() => go(1)}
        aria-label="Next station"
      >
        ›
      </button>
      <button
        type="button"
        className="rp-dock-more"
        aria-expanded={deckOpen}
        aria-label={deckOpen ? "Fewer controls" : "More controls"}
        onClick={() => setDeckOpen((value) => !value)}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 14.5 12 8.5 18 14.5" />
        </svg>
      </button>
      <Link
        to="/listen"
        className="rp-theater-link rp-eyebrow text-foil"
        prefetch="intent"
        viewTransition
      >
        Theater
      </Link>
      </div>
    </aside>
  );
}
