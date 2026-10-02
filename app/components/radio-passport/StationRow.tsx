import { titlePlace } from "~/utils/titlePlace";
import { useEffect, useState } from "react";
import { Row, RowText } from "~/components/ui/Row";
import type { Station } from "~/types/radio";
import {
  markArtworkUrlFailed,
  preferSecureArtworkUrl,
  sanitizeArtworkUrl,
} from "~/utils/stations";

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
    return titlePlace(withoutState || city);
  }
  return titlePlace(tidyPlace(state)) || country || "Unknown location";
}

const SHORT_COUNTRY: Record<string, string> = {
  "the united states of america": "USA",
  "united states of america": "USA",
  "the united states": "USA",
  "united states": "USA",
  "the united kingdom": "UK",
  "united kingdom": "UK",
  "islamic republic of iran": "Iran",
  "russian federation": "Russia",
  "republic of korea": "South Korea",
  "korea, republic of": "South Korea",
  "the netherlands": "Netherlands",
  "united arab emirates": "UAE",
  "the philippines": "Philippines",
};

/** A country short enough for a row: "USA", not "The United States Of America". */
export function shortCountry(country: string) {
  const name = country.trim();
  return SHORT_COUNTRY[name.toLowerCase()] ?? name.replace(/^the\s+/i, "");
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
  const artwork = sanitizeArtworkUrl(preferSecureArtworkUrl(station.favicon));
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setFailed(false);
    setReady(false);
  }, [artwork, station.uuid]);
  const showPlate = Boolean(artwork && !failed);
  return (
    <button
      type="button"
      onClick={onPlay}
      className={`rp-art${showPlate ? " has-plate" : ""}${showPlate && ready ? " is-ready" : ""}${active ? " is-live" : ""}`}
      aria-label={`Play ${station.name}`}
    >
      {/* The seal stands in until the plate has loaded, then the plate fades
          over it — a row never shows a black square while artwork travels. */}
      {!showPlate || !ready ? <ElsewhereMark /> : null}
      {showPlate ? (
        <img
          src={artwork!}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setReady(true)}
          onError={() => {
            markArtworkUrlFailed(artwork!);
            setFailed(true);
          }}
        />
      ) : null}
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
    <Row active={active}>
      <StationArt station={station} active={active} onPlay={onPlay} />
      <button
        type="button"
        onClick={onPlay}
        className="min-w-0 flex-1 text-left"
        aria-label={`Play ${station.name} from ${location}`}
      >
        <RowText title={station.name} sub={stationPlaceLine(station)} />
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
    </Row>
  );
}
