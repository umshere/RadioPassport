import type { ReactNode } from "react";
import { FlipBoard } from "~/components/radio-passport/FlipBoard";
import { stationLocation } from "~/components/radio-passport/StationRow";
import { tidyStationName } from "~/components/keeper/keeperFacts";
import { VOICE } from "~/components/keeper/keeperVoice";
import { usePlayerStore } from "~/state/playerStore";
import type { Departure } from "./deskModel";

/**
 * The room's queue as a departures board: the hour it is there now (a
 * split-flap, like the real thing), where, which station, and what it shares
 * with this one. Board one and the audio hops there; the room stays.
 */
export function DeskDepartures({ rows, children }: { rows: Departure[]; children?: ReactNode }) {
  const startStation = usePlayerStore((state) => state.startStation);
  return (
    <section className="ew-desk-card ew-departures" aria-labelledby="ew-departures-title">
      <header className="ew-desk-card-head">
        <h2 id="ew-departures-title" className="ew-desk-card-title">{VOICE.departures}</h2>
      </header>
      {rows.length ? (
        <ol className="ew-board">
          {rows.map(({ station, clock, solar, shared }) => {
            const where = stationLocation(station);
            return (
              <li key={station.uuid}>
                <button
                  type="button"
                  className="ew-board-row"
                  data-hour={solar?.toLowerCase() ?? "unknown"}
                  onClick={() => startStation(station, { preserveQueue: true, autoPlay: true })}
                  aria-label={`${VOICE.board}: ${tidyStationName(station.name)}, ${where}${clock ? `, ${clock} there` : ""}`}
                >
                  <span className="ew-board-time" aria-hidden="true">
                    <FlipBoard text={clock ?? "--:--"} className="is-board" />
                  </span>
                  <span className="ew-board-dest">
                    <b>{where}</b>
                    <small>
                      {tidyStationName(station.name)}
                      {shared.length ? ` · ${shared.join(" · ")}` : ""}
                    </small>
                  </span>
                  <span className="ew-board-go" aria-hidden="true">
                    {VOICE.board} →
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="ew-cards-empty">{VOICE.departuresNone}</p>
      )}
      {children ? (
        <div className="ew-departures-gate ew-gate-field">
          <span className="ew-departures-gate-label">{VOICE.changeGate}</span>
          {children}
        </div>
      ) : null}
    </section>
  );
}
