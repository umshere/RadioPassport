import type { Station } from "~/types/radio";

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
}: {
  station: Station;
  active: boolean;
  favorite: boolean;
  onPlay: () => void;
  onFavorite: () => void;
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
          )} 32% 28%), #0C0B09 72%)`,
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
        className="min-w-0 flex-1 text-left"
        aria-label={`Play ${station.name} from ${location}`}
      >
        <strong className="block truncate text-[15px] font-medium text-bone">
          {station.name}
        </strong>
        <span className="block truncate text-[12px] text-dust">
          {`${location}, ${station.country}`}
        </span>
      </button>
      <span className="rp-telemetry hidden shrink-0 sm:block">
        {stationTelemetry(station)}
      </span>
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
    </div>
  );
}
