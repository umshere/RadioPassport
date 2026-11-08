import { useState } from "react";
import type { Station } from "~/types/radio";
import { Button } from "~/components/ui/Button";
import { VOICE } from "~/components/keeper/keeperVoice";
import type { KeeperRoute } from "./keeperRoute";

/**
 * The Keeper's Route: one closed strip. Open it, choose an artist, and tune
 * the live stream given to them, next to a stable page about the artist.
 */
export function HomeKeeperRoute({
  routes,
  playingUuid,
  onPlay,
}: {
  routes: readonly KeeperRoute[];
  playingUuid: string | null;
  onPlay: (station: Station, route: KeeperRoute) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const first = routes[0];
  if (!first) return null;
  // The artist you are listening to leads, otherwise the one you chose last.
  const playingRoute = routes.find((route) =>
    route.stops.some((stop) => stop.station.uuid === playingUuid),
  );
  const route =
    routes.find((candidate) => candidate.id === activeId) ?? playingRoute ?? first;

  return (
    <section className="ew-home-keeper-route" aria-label={VOICE.homeKeeperRoute}>
      <details className="ew-keeper-route">
        <summary className="ew-keeper-route-summary">
          <span className="ew-keeper-route-heading">{VOICE.homeKeeperRoute}</span>
          <span className="ew-keeper-route-title">{route.title}</span>
          <span className="ew-keeper-route-switch" aria-hidden="true">
            <span className="ew-keeper-route-closed">+</span>
            <span className="ew-keeper-route-open">−</span>
          </span>
        </summary>
        <div className="ew-keeper-route-body">
          <div
            className="ew-keeper-route-artists"
            role="group"
            aria-label={VOICE.homeKeeperRouteChoose}
          >
            {routes.map((candidate) => (
              <button
                type="button"
                key={candidate.id}
                className="ew-keeper-route-artist"
                aria-pressed={candidate.id === route.id}
                onClick={() => setActiveId(candidate.id)}
              >
                {candidate.label}
              </button>
            ))}
          </div>
          <p className="ew-keeper-route-intro">{route.intro}</p>
          <ol className="ew-keeper-route-stops" role="list" aria-label={route.title}>
            {route.stops.map((stop) => {
              const tuned = stop.station.uuid === playingUuid;
              return (
                <li className="ew-keeper-route-stop" key={stop.station.uuid}>
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
    </section>
  );
}
