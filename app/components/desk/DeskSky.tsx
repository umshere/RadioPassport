import type { CSSProperties, ReactNode } from "react";
import { CountryFlag } from "~/components/CountryFlag";
import { FlipBoard } from "~/components/radio-passport/FlipBoard";
import { Eyebrow } from "~/components/ui/Eyebrow";
import { Keeper } from "~/components/keeper/Keeper";
import { FlapText } from "~/components/keeper/FlapText";
import { spokenHour, type KeeperFacts } from "~/components/keeper/keeperFacts";
import { hourWord, VOICE } from "~/components/keeper/keeperVoice";
import type { KeeperMood, KeeperState } from "~/components/keeper/keeperState";
import type { KeeperMurmur } from "~/state/keeperStore";
import { skyBody, skyHour } from "./deskModel";

/**
 * The top of the desk: the station's sky at the station's hour. The band is
 * tinted by the hour there (dawn, midday, dusk, night), the sun or the moon
 * stands where it would, the clock is a split-flap that turns each minute,
 * and the keeper stands on the horizon, saying his lines beside himself.
 * Without coordinates there is no sun, no clock and no guess: he says so.
 */
export function DeskSky({
  facts,
  place,
  countryCode,
  offset,
  playing,
  keeper,
  murmur,
  onDismissMurmur,
  children,
}: {
  facts: KeeperFacts;
  place: string;
  countryCode?: string | null;
  /** "7 hours ahead of you", or null without an hour. */
  offset: string | null;
  playing: boolean;
  keeper: { state: KeeperState; mood: KeeperMood };
  murmur: KeeperMurmur | null;
  onDismissMurmur: () => void;
  /** Quiet extras under the place (the misplaced-hour mark). */
  children?: ReactNode;
}) {
  const hour = facts.hour;
  const sky = skyHour(hour?.solar);
  const body = hour ? skyBody(hour.localHour, Number(hour.clock.slice(3, 5))) : null;
  const country = facts.station.country;
  const sub = [
    country && country !== place ? country : null,
    hour ? hourWord(hour.solar) : null,
    offset,
  ].filter(Boolean);

  return (
    <section className="ew-sky" data-hour={sky} aria-labelledby="ew-desk-place">
      <div className="ew-sky-field" aria-hidden="true">
        <i className="ew-sky-stars" />
        {body ? (
          <i className="ew-sky-lane">
            <i
              className="ew-sky-body"
              data-kind={body.kind}
              style={{ "--sky-x": body.x, "--sky-y": body.y } as CSSProperties}
            />
          </i>
        ) : null}
        <i className="ew-sky-grain" />
      </div>

      <div className="ew-sky-head">
        <Eyebrow as="span" tone="foil">{VOICE.deskTitle}</Eyebrow>
        <span className="ew-sky-status" data-live={playing || undefined}>
          <i aria-hidden="true" />
          {playing ? VOICE.deskLive : VOICE.deskPaused}
        </span>
      </div>

      <div className="ew-sky-copy">
        {hour ? (
          <p className="ew-sky-clock">
            <span className="sr-only">{VOICE.clockSpoken(spokenHour(hour.clock, hour.localHour), place)}</span>
            <FlipBoard text={hour.clock} className="is-clock" />
          </p>
        ) : (
          <p className="ew-sky-clock is-unknown">{VOICE.hourUnknownShort}</p>
        )}
        <h1 id="ew-desk-place" className="ew-sky-place">
          {place}
        </h1>
        <p className="ew-sky-sub">
          {countryCode ? (
            <CountryFlag iso={countryCode} title={country || place} em={0.9} className="ew-sky-flag" />
          ) : null}
          <span>{sub.join(" · ") || facts.station.name}</span>
        </p>
        {hour ? null : <p className="ew-sky-note">{VOICE.hourUnknown}</p>}
        {children}
      </div>

      <div className="ew-sky-ground">
        <div className="ew-sky-say" aria-live="polite">
          {murmur ? (
            <div className="ew-sky-bubble" key={murmur.id}>
              <Eyebrow as="span" tone="foil">{murmur.topic}</Eyebrow>
              <FlapText className="ew-sky-bubble-text" text={murmur.text} />
              <button type="button" className="ew-sky-bubble-x" aria-label="Dismiss" onClick={onDismissMurmur}>
                ×
              </button>
            </div>
          ) : null}
        </div>
        <Keeper state={keeper.state} mood={keeper.mood} size="desk" className="ew-sky-keeper" />
      </div>
    </section>
  );
}
