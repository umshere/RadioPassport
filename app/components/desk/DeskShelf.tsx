import type { ReactNode } from "react";
import { FlipBoard } from "~/components/radio-passport/FlipBoard";
import { stationLocation } from "~/components/radio-passport/StationRow";
import { keeperAnchor } from "~/components/keeper/keeperRoamModel";
import { tidyStationName } from "~/components/keeper/keeperFacts";
import { VOICE } from "~/components/keeper/keeperVoice";
import { usePlayerStore } from "~/state/playerStore";
import type { Station } from "~/types/radio";
import { DESK_ANCHORS } from "./deskKeeper";
import type { ShelfCard } from "./deskModel";

function initial(name: string): string {
  return (tidyStationName(name).match(/[\p{L}\p{N}]/u)?.[0] ?? "·").toUpperCase();
}

/**
 * "Next on this shelf": the keeper's similar picks (what they share, said
 * plainly) and then the room's queue, as a strip of cards with each place's
 * own clock. Board one and the audio hops there; the room stays. The gate
 * field under it changes the room.
 */
export function DeskShelf({
  cards,
  label,
  pointed,
  children,
}: {
  cards: ShelfCard[];
  /** Why the similar picks are here ("More in Italian"), when there are some. */
  label: string | null;
  /** The keeper just pointed at the shelf ("Somewhere like this"). */
  pointed: boolean;
  children?: ReactNode;
}) {
  const startStation = usePlayerStore((state) => state.startStation);
  const board = (station: Station) => startStation(station, { preserveQueue: true, autoPlay: true });
  return (
    <section
      id="ew-desk-shelf"
      className="ew-shelf"
      data-pointed={pointed || undefined}
      aria-labelledby="ew-shelf-title"
      {...keeperAnchor(DESK_ANCHORS.next)}
    >
      <header className="ew-shelf-head">
        <h2 id="ew-shelf-title" className="ew-shelf-title">
          {VOICE.shelfTitle}
          {label ? <em> · {label}</em> : null}
        </h2>
      </header>
      {cards.length ? (
        <ol className="ew-shelf-strip">
          {cards.map(({ station, clock, solar, shared, similar }) => {
            const where = stationLocation(station);
            const name = tidyStationName(station.name);
            return (
              <li key={station.uuid}>
                <button
                  type="button"
                  className="ew-shelf-card"
                  data-hour={solar?.toLowerCase() ?? "unknown"}
                  data-similar={similar || undefined}
                  onClick={() => board(station)}
                  aria-label={`${VOICE.board}: ${name}, ${where}${clock ? `, ${clock} there` : ""}`}
                >
                  <span className="ew-shelf-art" aria-hidden="true">{initial(station.name)}</span>
                  <span className="ew-shelf-copy">
                    <b>{name}</b>
                    <small>
                      <span className="ew-shelf-clock" aria-hidden="true">
                        <FlipBoard text={clock ?? "--:--"} className="is-board" />
                      </span>
                      {where}
                    </small>
                    {shared.length || similar ? (
                      <small className="ew-shelf-why">{similar && label ? label : shared.join(" · ")}</small>
                    ) : null}
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
