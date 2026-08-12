import type { Station } from "~/types/radio";

export function stationLocation(station: Station) {
  return station.city || station.state || station.country || "Unknown location";
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
  const location = stationLocation(station);
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
        aria-label={`Play ${station.name} from ${location}`}
      >
        <strong className="block truncate text-[13px] font-bold text-paper">
          {station.name}
        </strong>
        <span className="block truncate text-[11px] text-muted">
          {station.tagList?.slice(0, 2).join(" · ") ||
            `${location}, ${station.country}`}
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
