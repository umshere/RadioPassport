import { useEffect, useRef, useState } from "react";
import { CountryFlag } from "~/components/CountryFlag";
import { Eyebrow } from "~/components/ui/Eyebrow";
import { ShareButton } from "~/components/share/ShareButton";
import { titleCase, type KeeperFacts } from "~/components/keeper/keeperFacts";
import { hourWord, VOICE } from "~/components/keeper/keeperVoice";
import type { Station } from "~/types/radio";

type Field = { label: string; value: string; sub?: string | null; missing?: boolean; flag?: string | null };

/**
 * The station as a boarding pass: from your hour to theirs, what is spoken,
 * the signal, how long you have been aboard. The stub carries the stamp
 * (inked once you have stayed a minute) and the ticket you can send a friend.
 * Every field is from the record; a missing one says so, plainly.
 */
export function DeskPass({
  facts,
  station,
  place,
  hereClock,
  offset,
  minutes,
  stamped,
  stampCount,
}: {
  facts: KeeperFacts;
  station: Station;
  place: string;
  hereClock: string;
  offset: string | null;
  minutes: number;
  stamped: boolean;
  stampCount: number;
}) {
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

  const signal = [
    facts.station.bitrate ? `${facts.station.bitrate}K` : null,
    facts.station.codec ? facts.station.codec.toUpperCase() : null,
  ]
    .filter(Boolean)
    .join(" ");
  const fields: Field[] = [
    { label: VOICE.passFrom, value: VOICE.passHere, sub: hereClock },
    {
      label: VOICE.passTo,
      value: place,
      sub: facts.station.country && facts.station.country !== place ? facts.station.country : null,
      flag: station.countryCode ?? null,
    },
    facts.hour
      ? { label: VOICE.passLocal, value: facts.hour.clock, sub: offset ?? hourWord(facts.hour.solar) }
      : { label: VOICE.passLocal, value: VOICE.notInNotebook, missing: true },
    facts.station.language
      ? { label: VOICE.passSpoken, value: titleCase(facts.station.language) }
      : { label: VOICE.passSpoken, value: VOICE.notInNotebook, missing: true },
    signal
      ? { label: VOICE.passSignal, value: signal }
      : { label: VOICE.passSignal, value: VOICE.notInNotebook, missing: true },
    { label: VOICE.passAboard, value: VOICE.aboard(minutes) },
  ];
  const tags = facts.station.tags.slice(0, 6);

  return (
    <section className="ew-pass" aria-label={VOICE.passLabel}>
      <div className="ew-pass-body">
        <div className="ew-pass-main">
          <div className="ew-pass-head">
            <Eyebrow as="span" tone="foil">
              {VOICE.passLabel}
            </Eyebrow>
            <span className="ew-pass-count">{VOICE.stampCount(stampCount)}</span>
          </div>
          <h2 className="ew-pass-name">{facts.station.name}</h2>
          <dl className="ew-pass-grid">
            {fields.map((field) => (
              <div key={field.label} className="ew-pass-field" data-missing={field.missing || undefined}>
                <dt>{field.label}</dt>
                <dd>
                  <span className="ew-pass-value">
                    {field.flag ? (
                      <CountryFlag
                        iso={field.flag}
                        title={facts.station.country || field.value}
                        em={0.85}
                        className="ew-pass-flag"
                      />
                    ) : null}
                    {field.value}
                  </span>
                  {field.sub ? <span className="ew-pass-sub">{field.sub}</span> : null}
                </dd>
              </div>
            ))}
          </dl>
          {tags.length ? (
            <ul className="ew-pass-tags" aria-label="How they describe themselves">
              {tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="ew-pass-stub">
          <div className="ew-pass-stamp" data-stamped={stamped || undefined} data-fresh={fresh || undefined}>
            <span className="ew-pass-stamp-ring" aria-hidden="true">
              <b>{stamped ? VOICE.stampedHere : "·"}</b>
              <i>{place.slice(0, 14)}</i>
            </span>
            <span className="ew-pass-stamp-copy">
              {stamped ? `${VOICE.stampedHere}. ${place}.` : VOICE.stampPending}
            </span>
          </div>
          <ShareButton station={station} clock={facts.hour?.clock ?? null} className="ew-pass-share" />
        </div>
      </div>
    </section>
  );
}
