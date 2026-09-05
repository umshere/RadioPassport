import { useEffect, useState } from "react";
import { usePlayerStore } from "~/state/playerStore";
import { useUpNextStore } from "~/state/upNextStore";
import { stationLocation } from "./StationRow";
import { useHydrated } from "~/hooks/useHydrated";
import {
  markArtworkUrlFailed,
  sanitizeArtworkUrl,
} from "~/utils/stations";

export default function UpNextRow() {
  const hydrated = useHydrated();
  const queue = usePlayerStore((state) => state.queue);
  const index = usePlayerStore((state) => state.currentStationIndex);
  const nowPlaying = usePlayerStore((state) => state.nowPlaying);
  const startStation = usePlayerStore((state) => state.startStation);
  const entries = useUpNextStore((state) => state.entries);
  const [artFailed, setArtFailed] = useState(false);

  const next = nowPlaying ? queue[(index + 1) % queue.length] : undefined;
  useEffect(() => {
    setArtFailed(false);
  }, [next?.uuid]);

  if (!hydrated || !nowPlaying || queue.length < 2) return null;
  if (!next || next.uuid === nowPlaying.uuid) return null;
  const entry = entries[next.uuid];
  if (!entry) return null;

  const city = stationLocation(next);
  const sub = [
    city && city !== stationLocation(nowPlaying) ? city : null,
    entry.shared.length ? entry.shared.join(" · ") : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const art = artFailed ? null : sanitizeArtworkUrl(next.favicon);

  return (
    <button
      type="button"
      className="ew-upnext"
      onClick={() =>
        startStation(next, { preserveQueue: true, autoPlay: true })
      }
      aria-label={`Play next: ${next.name}${city ? ` from ${city}` : ""}`}
    >
      <span className="ew-upnext-art" aria-hidden="true">
        {art ? (
          <img
            src={art}
            alt=""
            loading="lazy"
            onError={() => {
              markArtworkUrlFailed(art);
              setArtFailed(true);
            }}
          />
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.1"
          >
            <circle cx="12" cy="12" r="8.5" />
            <circle cx="12" cy="12" r="2.6" fill="#C73A3A" stroke="none" />
          </svg>
        )}
      </span>
      <span className="ew-upnext-copy">
        <span className="rp-eyebrow text-foil">Up next</span>
        <strong className="ew-upnext-name">{next.name}</strong>
        {sub ? <span className="ew-upnext-sub">{sub}</span> : null}
      </span>
      <span className="ew-upnext-go" aria-hidden="true">
        →
      </span>
    </button>
  );
}
