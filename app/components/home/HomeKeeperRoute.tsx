import type { Station } from "~/types/radio";
import { Button } from "~/components/ui/Button";
import { VOICE } from "~/components/keeper/keeperVoice";
import type { KeeperRoute } from "./keeperRoute";

/** A short, sourced route from the Keeper beside the arrival panel. */
export function HomeKeeperRoute({
  routes,
  playingUuid,
  onPlay,
}: {
  routes: readonly KeeperRoute[];
  playingUuid: string | null;
  onPlay: (station: Station, route: KeeperRoute) => void;
}) {
  return (
    <section className="ew-home-keeper-route" aria-label={VOICE.homeKeeperRoute}>
      {routes.map((route) => (
      <details className="ew-keeper-route" key={route.id}>
          <summary className="ew-keeper-route-summary">
            <span className="ew-keeper-route-heading">{VOICE.homeKeeperRoute}</span>
            <span className="ew-keeper-route-title">{route.title}</span>
            <span className="ew-keeper-route-switch" aria-hidden="true">
              <span className="ew-keeper-route-closed">+</span>
              <span className="ew-keeper-route-open">−</span>
            </span>
          </summary>
          <div className="ew-keeper-route-body">
            <p className="ew-keeper-route-intro">{route.intro}</p>
            <ol className="ew-keeper-route-stops" role="list" aria-label={route.title}>
              {route.stops.map((stop) => {
                const tuned = stop.station.uuid === playingUuid;
                return (
                  <li
                    className="ew-keeper-route-stop"
                    key={stop.station.uuid}
                  >
                    <div className="ew-keeper-route-copy">
                      <h3>{stop.name}</h3>
                      <p>{stop.reason}</p>
                    </div>
                    <div className="ew-keeper-route-actions">
                      <Button
                        className="ew-keeper-route-tune"
                        variant="mono"
                        aria-label={VOICE.homeKeeperRouteTune(stop.name)}
                        aria-current={tuned || undefined}
                        onClick={() => onPlay(stop.station, route)}
                      >
                        {tuned ? VOICE.homeKeeperRouteTuned : VOICE.homeKeeperRouteTuneAction}
                        {!tuned ? <span aria-hidden="true"> →</span> : null}
                      </Button>
                    </div>
                    <a
                      className="ew-keeper-route-source"
                      href={stop.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {stop.sourceLabel} ↗
                    </a>
                  </li>
                );
              })}
            </ol>
          </div>
        </details>
      ))}
    </section>
  );
}
