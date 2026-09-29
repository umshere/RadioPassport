import { useEffect, useState } from "react";
import { useLocation } from "@remix-run/react";
import { Button } from "~/components/ui/Button";
import { Eyebrow } from "~/components/ui/Eyebrow";
import { usePlayerStore } from "~/state/playerStore";
import type { Station } from "~/types/radio";
import { stationLocation } from "~/components/radio-passport/StationRow";
import { VOICE } from "~/components/keeper/keeperVoice";
import { logUsage } from "~/utils/usage";
import { TUNE_FROM_PARAM, TUNE_PARAM } from "./shareStation";

type Lookup = { uuid: string; from: "ticket" | "link"; station: Promise<Station | null>; done?: boolean };
let lookup: Lookup | null = null;

/**
 * A friend's link lands here: `/?tune=<uuid>` directly, or a ticket page
 * (`/t/<uuid>`) that hands on to `/?tune=<uuid>&from=ticket`. The station is looked up and
 * offered on a card; audio starts only on the tap, because a browser will not
 * play sound for a page nobody has touched. The parameter is stripped from the
 * address once read so a reload does not offer it again.
 */
export function TuneBridge() {
  const startStation = usePlayerStore((state) => state.startStation);
  const { search } = useLocation();
  const [station, setStation] = useState<Station | null>(null);

  useEffect(() => {
    // Read and strip the parameter. It is re-read whenever the search changes,
    // because a ticket page hands on here by client navigation, after this
    // bridge has already mounted. A dev StrictMode re-run finds the parameter
    // gone, so the lookup is kept for the page's life, not one effect run.
    const url = new URL(window.location.href);
    const uuid = url.searchParams.get(TUNE_PARAM)?.trim();
    if (uuid && uuid !== lookup?.uuid) {
      const from = url.searchParams.get(TUNE_FROM_PARAM) === "ticket" ? "ticket" : "link";
      url.searchParams.delete(TUNE_PARAM);
      url.searchParams.delete(TUNE_FROM_PARAM);
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
      lookup = {
        uuid,
        from,
        station: fetch(`/api/station?uuid=${encodeURIComponent(uuid)}`)
          .then((response) => (response.ok ? response.json() : null))
          .then((payload: { station?: Station | null } | null) => payload?.station ?? null)
          .catch(() => null),
      };
    }
    if (!lookup) return;
    const current = lookup;
    let alive = true;
    void current.station.then((found) => {
      if (alive && found && lookup === current && !current.done) setStation(found);
    });
    return () => {
      alive = false;
    };
  }, [search]);

  if (!station) return null;
  const place = stationLocation(station);
  return (
    <aside className="ew-tune" role="dialog" aria-label={VOICE.friendCard}>
      <Eyebrow tone="foil">{VOICE.friendCard}</Eyebrow>
      <strong className="ew-tune-name">{station.name}</strong>
      <span className="ew-tune-place">{[place, station.country].filter(Boolean).join(" · ")}</span>
      <div className="ew-tune-actions">
        <Button
          variant="mono"
          onClick={() => {
            logUsage("tune_join", lookup?.from ?? "link");
            if (lookup) lookup.done = true;
            startStation(station, { autoPlay: true });
            setStation(null);
          }}
        >
          {VOICE.listenLive}
        </Button>
        <Button
          variant="text"
          onClick={() => {
            if (lookup) lookup.done = true;
            setStation(null);
          }}
        >
          {VOICE.notNow}
        </Button>
      </div>
    </aside>
  );
}
