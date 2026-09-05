import { useEffect, useState } from "react";
import type { Station } from "~/types/radio";
import { FlipBoard } from "~/components/radio-passport/FlipBoard";
import { markArtworkUrlFailed, sanitizeArtworkUrl } from "~/utils/stations";

function tidyPlace(value: string) {
  return value
    .replace(/[\s,\u00a0]+[A-Za-z]{2}$/u, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function stationLocation(station: Station) {
  const city = (station.city || "").trim();
  const state = (station.state || "").trim();
  const country = (station.country || "").trim();
  if (city) {
    const withoutState =
      state && city.toLowerCase().endsWith(` ${state.toLowerCase()}`)
        ? city.slice(0, city.length - state.length).trim()
        : tidyPlace(city);
    return withoutState || city;
  }
  return tidyPlace(state) || country || "Unknown location";
}

/** Row subtitle: skip "India, India" when the location fallback is the country. */
export function stationPlaceLine(station: Station) {
  const location = stationLocation(station);
  const country = (station.country || "").trim();
  if (!country || location === country) return location;
  return `${location}, ${country}`;
}
export function stationTelemetry(station: Station) {
  return station.bitrate
    ? `${station.bitrate}K ${station.codec?.toUpperCase() ?? "AUDIO"}`
    : station.codec
    ? station.codec.toUpperCase()
    : "LIVE";
}
function ElsewhereMark() {
  return (
    <span className="rp-art-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32">
        <circle
          cx="16"
          cy="16"
          r="11"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <circle cx="16" cy="16" r="4.5" fill="currentColor" className="rp-art-core" />
      </svg>
    </span>
  );
}

function StationArt({
  station,
  active,
  onPlay,
}: {
  station: Station;
  active: boolean;
  onPlay: () => void;
}) {
  const artwork = sanitizeArtworkUrl(station.favicon);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [artwork, station.uuid]);
  const showPlate = Boolean(artwork && !failed);
  return (
    <button
      type="button"
      onClick={onPlay}
      className={`rp-art${showPlate ? " has-plate" : ""}${active ? " is-live" : ""}`}
      aria-label={`Play ${station.name}`}
    >
      {showPlate ? (
        <img
          src={artwork!}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => {
            markArtworkUrlFailed(artwork!);
            setFailed(true);
          }}
        />
      ) : (
        <ElsewhereMark />
      )}
      {active ? (
        <span className="rp-eq">
          <i />
          <i />
          <i />
        </span>
      ) : null}
    </button>
  );
}

export function StationRow({
  station,
  active,
  favorite,
  onPlay,
  onFavorite,
  beat = 0,
}: {
  station: Station;
  active: boolean;
  favorite: boolean;
  onPlay: () => void;
  onFavorite?: () => void;
  beat?: number;
}) {
  const location = stationLocation(station);
  return (
    <div className={`rp-station ${active ? "is-active" : ""}`}>
      <StationArt station={station} active={active} onPlay={onPlay} />
      <button
        type="button"
        onClick={onPlay}
        className="min-w-0 flex-1 text-left"
        aria-label={`Play ${station.name} from ${location}`}
      >
        <strong className="block min-w-0 text-bone">
          <FlipBoard text={station.name} delayMs={beat} />
        </strong>
        <span className="mt-1 block min-w-0 text-dust">
          <FlipBoard
            text={stationPlaceLine(station)}
            className="is-meta"
            delayMs={beat + 40}
          />
        </span>
      </button>
      <span className="rp-telemetry hidden shrink-0 sm:block">
        {stationTelemetry(station)}
      </span>
      {onFavorite ? (
        <button
          type="button"
          onClick={onFavorite}
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg ${
            favorite ? "text-foil" : "text-dust"
          }`}
          aria-label={`${favorite ? "Remove" : "Add"} ${station.name} ${
            favorite ? "from" : "to"
          } favorites`}
        >
          {favorite ? "♥" : "♡"}
        </button>
      ) : null}
    </div>
  );
}
