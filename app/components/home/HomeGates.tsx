import { HourRail } from "~/components/radio-passport/HourRail";
import { SiteSeekRail } from "~/components/radio-passport/SiteSeek";
import { Button } from "~/components/ui/Button";
import { VOICE } from "~/components/keeper/keeperVoice";
import { keeperAnchor } from "~/components/keeper/keeperRoamModel";
import type { SolarHour } from "~/utils/localTime";
import type { PassportStamp } from "~/state/journeyStore";

/**
 * The gates: where you ask to go. The intent field (a real child of its rail,
 * never a portal: Safari drops portaled forms out of sticky boxes), the four
 * hour gates and the Atlas door. Square, full width, 48px, always on; it
 * sticks under the header while the board scrolls beneath it.
 */
export function HomeGates({
  hour,
  onHourTap,
  onAtlas,
  stamps,
  onPassport,
}: {
  hour: SolarHour | null;
  onHourTap: (item: SolarHour) => void;
  onAtlas: () => void;
  /** The last few stamps: a quick way into the passport on wider screens. */
  stamps?: PassportStamp[];
  onPassport?: () => void;
}) {
  return (
    <section className="ew-gates" aria-label={VOICE.homeGates}>
      <div className="ew-gates-seek ew-gate-field" {...keeperAnchor("seek")}>
        <SiteSeekRail />
      </div>
      <div className="ew-gates-row">
        <div className="ew-gates-hours">
          <p className="ew-gates-hint">{VOICE.homeHourHint}</p>
          <HourRail hour={hour} onTap={onHourTap} />
        </div>
        <Button variant="atlas" className="ew-gates-atlas" onClick={onAtlas}>
          Atlas
          <span aria-hidden="true">→</span>
        </Button>
      </div>
      {stamps && onPassport ? (
        <div className="ew-gates-passport">
          <p className="ew-gates-hint">{stamps.length ? VOICE.homeRecent : VOICE.homePassport}</p>
          <p className="ew-gates-passport-count">{VOICE.stampCount(stamps.length)}</p>
          {stamps.length ? (
            <ul className="ew-gates-stamps">
              {stamps.map((stamp) => (
                <li key={stamp.id}>
                  <b>{stamp.city}</b>
                  <span>{stamp.country}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ew-gates-passport-empty">{VOICE.homePassportEmpty}</p>
          )}
          <Button variant="text" className="ew-gates-passport-open" onClick={onPassport}>
            {VOICE.homeRecentOpen} <span aria-hidden="true">→</span>
          </Button>
        </div>
      ) : null}
    </section>
  );
}
