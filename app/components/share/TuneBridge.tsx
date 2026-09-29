import { useEffect, useState } from "react";
import { Button } from "~/components/ui/Button";
import { Eyebrow } from "~/components/ui/Eyebrow";
import { usePlayerStore } from "~/state/playerStore";
import type { Station } from "~/types/radio";
import { stationLocation } from "~/components/radio-passport/StationRow";
import { logUsage } from "~/utils/usage";
import { TUNE_PARAM } from "./shareStation";

let lookup: Promise<Station | null> | null = null;

/**
 * A friend's link (`/?tune=<uuid>`) lands here. The station is looked up and
 * offered on a card; audio starts only on the tap, because a browser will not
 * play sound for a page nobody has touched. The parameter is stripped from the
 * address once read so a reload does not offer it again.
 */
export function TuneBridge() {
  const startStation = usePlayerStore((state) => state.startStation);
  const [station, setStation] = useState<Station | null>(null);

  useEffect(() => {
    // Read and strip once. A dev StrictMode re-run finds the parameter gone, so
    // the lookup is kept for the page's life rather than tied to one effect run.
    if (!lookup) {
      const url = new URL(window.location.href);
      const uuid = url.searchParams.get(TUNE_PARAM)?.trim();
      if (!uuid) return;
      url.searchParams.delete(TUNE_PARAM);
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
      lookup = fetch(`/api/station?uuid=${encodeURIComponent(uuid)}`)
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: { station?: Station | null } | null) => payload?.station ?? null)
        .catch(() => null);
    }
    let alive = true;
    void lookup.then((found) => {
      if (alive && found) setStation(found);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!station) return null;
  const place = stationLocation(station);
  return (
    <aside className="ew-tune" role="dialog" aria-label="A friend tuned you in">
      <Eyebrow tone="foil">A friend tuned you in</Eyebrow>
      <strong className="ew-tune-name">{station.name}</strong>
      <span className="ew-tune-place">{[place, station.country].filter(Boolean).join(" · ")}</span>
      <div className="ew-tune-actions">
        <Button
          variant="mono"
          onClick={() => {
            logUsage("tune_join");
            startStation(station, { autoPlay: true });
            setStation(null);
          }}
        >
          Listen live
        </Button>
        <Button variant="text" onClick={() => setStation(null)}>
          Not now
        </Button>
      </div>
    </aside>
  );
}
