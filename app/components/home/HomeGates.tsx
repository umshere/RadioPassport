import { HourRail } from "~/components/radio-passport/HourRail";
import { SiteSeekRail } from "~/components/radio-passport/SiteSeek";
import { Button } from "~/components/ui/Button";
import { VOICE } from "~/components/keeper/keeperVoice";
import type { SolarHour } from "~/utils/localTime";

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
}: {
  hour: SolarHour | null;
  onHourTap: (item: SolarHour) => void;
  onAtlas: () => void;
}) {
  return (
    <section className="ew-gates" aria-label={VOICE.homeGates}>
      <div className="ew-gates-seek ew-gate-field">
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
    </section>
  );
}
