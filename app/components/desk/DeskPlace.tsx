import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { CountryFlag } from "~/components/CountryFlag";
import { FlipBoard } from "~/components/radio-passport/FlipBoard";
import { Eyebrow } from "~/components/ui/Eyebrow";
import { ShareButton } from "~/components/share/ShareButton";
import { keeperAnchor } from "~/components/keeper/keeperRoamModel";
import { spokenHour, titleCase, type KeeperFacts } from "~/components/keeper/keeperFacts";
import { hourWord, VOICE } from "~/components/keeper/keeperVoice";
import type { Station } from "~/types/radio";
import { DESK_ANCHORS } from "./deskKeeper";
import { skyHour, stampSecondsLeft } from "./deskModel";

/** The dock's stamp ink (0..1), re-read each second while a stamp is pending. */
function useStampInk(active: boolean): number | null {
  const [ink, setInk] = useState<number | null>(null);
  useEffect(() => {
    if (!active) {
      setInk(null);
      return;
    }
    const read = () => {
      const raw = window.getComputedStyle(document.documentElement).getPropertyValue("--stamp-ink").trim();
      const value = raw ? Number(raw) : NaN;
      setInk(Number.isFinite(value) ? value : null);
    };
    read();
    const timer = window.setInterval(read, 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  return ink;
}

/**
 * "You are not here": the station's place at its hour, in one compact card.
 * The clock is a split-flap at the station's longitude, the card wears the
 * hour as a light tint, and under it what is spoken, the signal and the
 * stamp (a ring that fills over the continuous minute). Every field is from
 * the record; a missing one says so.
 */
export function DeskPlace({
  facts,
  station,
  place,
  offset,
  playing,
  stamped,
  stampCount,
  children,
}: {
  facts: KeeperFacts;
  station: Station;
  place: string;
  /** "7 hours ahead of you", or null without an hour. */
  offset: string | null;
  playing: boolean;
  stamped: boolean;
  stampCount: number;
  /** Quiet extras under the place (the misplaced-hour mark). */
  children?: ReactNode;
}) {
  const hour = facts.hour;
  const country = facts.station.country;
  const when = [hour ? hourWord(hour.solar) : null, offset].filter(Boolean).join(" · ");
  const signal = [
    facts.station.codec ? facts.station.codec.toUpperCase() : null,
    facts.station.bitrate ? `${facts.station.bitrate}K` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // The stamp lands with a thunk only when it is inked while you watch.
  const wasStamped = useRef(stamped);
  const [fresh, setFresh] = useState(false);
  useEffect(() => {
    if (stamped && !wasStamped.current) {
      setFresh(true);
      const timer = window.setTimeout(() => setFresh(false), 1600);
      wasStamped.current = stamped;
      return () => window.clearTimeout(timer);
    }
    wasStamped.current = stamped;
  }, [stamped]);

  const ink = useStampInk(playing && !stamped);
  const seconds = stamped ? null : stampSecondsLeft(ink);
  const stampLine = stamped
    ? VOICE.stampedIn(place)
    : seconds !== null && seconds > 0
      ? VOICE.stampSeconds(seconds, place)
      : VOICE.stampPending;
  const fill = stamped ? 1 : (ink ?? 0);

  return (
    <section
      className="ew-desk-card ew-place"
      data-hour={skyHour(hour?.solar)}
      aria-label={VOICE.placeLabel}
      {...keeperAnchor(DESK_ANCHORS.place)}
    >
      <div className="ew-place-head">
        <Eyebrow as="span" tone="dust">{VOICE.placeTitle}</Eyebrow>
        <span className="ew-place-status" data-live={playing || undefined}>
          <i aria-hidden="true" />
          {playing ? VOICE.deskLive : VOICE.deskPaused}
        </span>
      </div>

      <div className="ew-place-where">
        {hour ? (
          <p className="ew-place-clock">
            <span className="sr-only">{VOICE.clockSpoken(spokenHour(hour.clock, hour.localHour), place)}</span>
            <FlipBoard text={hour.clock} className="is-clock" />
          </p>
        ) : (
          <p className="ew-place-clock is-unknown">{VOICE.hourUnknownShort}</p>
        )}
        <h1 id="ew-desk-place" className="ew-place-name">
          {place}
        </h1>
        <p className="ew-place-when">
          {station.countryCode ? (
            <CountryFlag iso={station.countryCode} title={country || place} em={0.9} className="ew-place-flag" />
          ) : null}
          <span>{[country && country !== place ? country : null, when].filter(Boolean).join(" · ") || facts.station.name}</span>
        </p>
        {hour ? null : <p className="ew-place-note">{VOICE.hourUnknown}</p>}
        {children}
      </div>

      <dl className="ew-place-grid">
        <div data-missing={facts.station.language ? undefined : ""}>
          <dt>{VOICE.passSpoken}</dt>
          <dd>{facts.station.language ? titleCase(facts.station.language) : VOICE.notInNotebook}</dd>
        </div>
        <div data-missing={signal ? undefined : ""}>
          <dt>{VOICE.passSignal}</dt>
          <dd>{signal || VOICE.notInNotebook}</dd>
        </div>
      </dl>

      <div className="ew-place-stamp" data-stamped={stamped || undefined} data-fresh={fresh || undefined}>
        <svg
          className="ew-place-ring"
          viewBox="0 0 52 52"
          aria-hidden="true"
          style={{ "--ring-fill": fill } as CSSProperties}
        >
          <circle cx="26" cy="26" r="22" className="ew-place-ring-track" />
          <circle cx="26" cy="26" r="22" className="ew-place-ring-ink" pathLength={100} transform="rotate(-90 26 26)" />
        </svg>
        <span className="ew-place-stamp-line">
          {stampLine}
          <small>{VOICE.stampCount(stampCount)}</small>
        </span>
        <ShareButton station={station} clock={hour?.clock ?? null} className="ew-place-share" />
      </div>
    </section>
  );
}
