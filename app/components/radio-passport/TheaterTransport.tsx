import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@remix-run/react";
import {
  homeWithPassportHref,
  openPassportNow,
} from "~/components/radio-passport/productFlow";
import { stationLocation } from "~/components/radio-passport/StationRow";
import { canMutateJourney, useJourneyStore } from "~/state/journeyStore";
import { usePlayerStore } from "~/state/playerStore";

export function TheaterTransport() {
  const location = useLocation();
  const navigate = useNavigate();
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
  const [ink, setInk] = useState<number | null>(null);

  useEffect(() => {
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
  }, [nowPlaying?.uuid, isPlaying, stamps.length]);

  if (!nowPlaying) return null;

  const go = (direction: number) => {
    if (!queue.length) return;
    const next = queue[(index + direction + queue.length) % queue.length];
    if (next) startStation(next, { preserveQueue: true, autoPlay: true });
  };

  const city = stationLocation(nowPlaying);
  const kept = favorites.includes(nowPlaying.uuid);
  const stamped = stamps.some(
    (stamp) =>
      stamp.city.toLowerCase() === city.toLowerCase() &&
      stamp.country.toLowerCase() === (nowPlaying.country || "").toLowerCase(),
  );

  return (
    <div className="ew-theater-transport">
      <button
        type="button"
        className="ew-theater-tbtn"
        onClick={() => go(-1)}
        aria-label="Previous station"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18 5.5v13L9 12l9-6.5Z" />
          <rect x="5.5" y="5.5" width="2.4" height="13" rx="1" />
        </svg>
      </button>
      <button
        type="button"
        className={`ew-theater-tbtn${kept ? " is-on" : ""}`}
        onClick={() =>
          canMutateJourney(hydrated) && toggleFavorite(nowPlaying.uuid, nowPlaying)
        }
        disabled={!canMutateJourney(hydrated)}
        aria-label="Keep"
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
      <button
        type="button"
        className="ew-theater-tplay"
        onClick={togglePlay}
        aria-label={isPlaying ? "Pause" : "Play"}
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
      <button
        type="button"
        className="ew-theater-tbtn"
        onClick={() => go(1)}
        aria-label="Next station"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M6 5.5v13L15 12 6 5.5Z" />
          <rect x="16.1" y="5.5" width="2.4" height="13" rx="1" />
        </svg>
      </button>
      <button
        type="button"
        className={`ew-theater-ring${stamped ? " is-stamped" : ""}`}
        onClick={() =>
          openPassportNow(location.pathname, () => navigate(homeWithPassportHref()))
        }
        aria-label={
          stamped ? "Open passport — this city is stamped" : "Open passport"
        }
      >
        <span>
          {stamped ? (
            <i className="ew-theater-ring-dot" aria-hidden="true" />
          ) : ink === null ? (
            ""
          ) : (
            `${Math.max(0, Math.ceil((1 - ink) * 60))}s`
          )}
        </span>
      </button>
    </div>
  );
}
