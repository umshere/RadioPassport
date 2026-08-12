import type { Station } from "~/types/radio";
import { displayCountryName } from "~/utils/countryNames";

export function stationLocation(station: Station) {
  return station.city || station.state || station.country || "Unknown location";
}

/**
 * Display label for a station place: "Kochi, India" or "France" (never "France, France").
 * Country segment uses common display names only — stored country keys are unchanged.
 */
export function stationLocationLabel(station: Station) {
  const location = stationLocation(station);
  const country = (station.country || "").trim();
  if (!country) return location;
  const countryDisplay = displayCountryName(country, station.countryCode);
  if (location.toLowerCase() === country.toLowerCase()) return countryDisplay;
  if (location.toLowerCase() === countryDisplay.toLowerCase()) {
    return countryDisplay;
  }
  return `${location}, ${countryDisplay}`;
}

export function stationTelemetry(station: Station) {
  return station.bitrate
    ? `${station.bitrate}K ${station.codec?.toUpperCase() ?? "AUDIO"}`
    : station.codec
    ? station.codec.toUpperCase()
    : "LIVE";
}
function hue(id: string) {
  return [...id].reduce(
    (total, char) => (total * 31 + char.charCodeAt(0)) % 360,
    0
  );
}

export function StationRow({
  station,
  active,
  favorite,
  onPlay,
  onFavorite,
  onDetails,
}: {
  station: Station;
  active: boolean;
  favorite: boolean;
  onPlay: () => void;
  onFavorite: () => void;
  onDetails?: (trigger: HTMLElement) => void;
}) {
  const locationLabel = stationLocationLabel(station);
  return (
    <div className={`rp-station ${active ? "is-active" : ""}`}>
      <button
        type="button"
        onClick={onPlay}
        className="rp-art"
        aria-label={`Play ${station.name}`}
        style={{
          background: `radial-gradient(circle at 26% 20%, hsl(${hue(
            station.uuid
          )} 45% 42%), #14120F 72%)`,
        }}
      >
        {active ? (
          <span className="rp-eq">
            <i />
            <i />
            <i />
          </span>
        ) : (
          <span className="text-[13px] text-paper">▶</span>
        )}
      </button>
      <button
        type="button"
        onClick={onPlay}
        className="rp-station-title-action min-w-0 flex-1 text-left"
        aria-label={`Play ${station.name} from ${locationLabel}`}
      >
        <strong className="block truncate text-[13px] font-bold text-paper">
          {station.name}
        </strong>
        <span className="block truncate text-[11px] text-muted">
          {station.tagList?.slice(0, 2).join(" · ") || locationLabel}
        </span>
      </button>
      <span className="rp-telemetry hidden shrink-0 sm:block">
        {stationTelemetry(station)}
      </span>
      {onDetails && (
        <button
          type="button"
          onClick={(event) => onDetails(event.currentTarget)}
          className="rp-details-action"
          aria-label={`Open details for ${station.name}`}
        >
          <span aria-hidden="true">i</span>
        </button>
      )}
      <button
        type="button"
        onClick={onFavorite}
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg ${
          favorite ? "text-coral" : "text-muted"
        }`}
        aria-label={`${favorite ? "Remove" : "Add"} ${station.name} ${
          favorite ? "from" : "to"
        } favorites`}
      >
        {favorite ? "♥" : "♡"}
      </button>
    </div>
  );
}
