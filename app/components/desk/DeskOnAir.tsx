import { useEffect, useState, type ReactNode } from "react";
import { Eyebrow } from "~/components/ui/Eyebrow";
import { keeperTrackLine, type KeeperFacts } from "~/components/keeper/keeperFacts";
import { VOICE } from "~/components/keeper/keeperVoice";
import { markArtworkUrlFailed } from "~/utils/stations";
import type { OnAir } from "./deskModel";

/**
 * What is on air, called what it is. A song gets its title large and the
 * artist under it, marked as sent by the station; an ident, an advert, talk or
 * a programme name gets a plain line from the keeper; a silent stream gets his
 * "no names here" and nothing invented.
 */
export function DeskOnAir({
  onAir,
  facts,
  plate,
  playing,
}: {
  onAir: OnAir;
  facts: KeeperFacts;
  plate: string | null;
  playing: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  useEffect(() => setFailed(null), [plate]);
  const showArt = Boolean(plate && failed !== plate);

  let body: ReactNode;
  switch (onAir.kind) {
    case "track":
      body = (
        <>
          <p className="ew-onair-title">{onAir.title ?? onAir.artist}</p>
          {onAir.title && onAir.artist ? <p className="ew-onair-artist">{onAir.artist}</p> : null}
          <span className="ew-onair-src">{VOICE.onAirSent}</span>
        </>
      );
      break;
    case "programme":
      body = (
        <>
          <p className="ew-onair-title is-programme">“{onAir.line}”</p>
          <p className="ew-onair-note">{VOICE.onAirProgramme}</p>
        </>
      );
      break;
    case "ident":
      body = <p className="ew-onair-note is-lead">{VOICE.onAirIdent}</p>;
      break;
    case "ad":
      body = <p className="ew-onair-note is-lead">{VOICE.onAirAd}</p>;
      break;
    case "talk":
      body = <p className="ew-onair-note is-lead">{VOICE.onAirTalk}</p>;
      break;
    case "waiting":
      body = <p className="ew-onair-note is-lead is-waiting">{VOICE.onAirWaiting}</p>;
      break;
    default:
      body = <p className="ew-onair-note is-lead">{keeperTrackLine({ ...facts, track: null, titles: "none" })}</p>;
  }

  return (
    <section className="ew-onair" data-kind={onAir.kind} aria-live="polite">
      <figure className="ew-onair-art" data-empty={showArt ? undefined : ""}>
        {showArt ? (
          <img
            src={plate!}
            alt=""
            onError={() => {
              markArtworkUrlFailed(plate!);
              setFailed(plate);
            }}
          />
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true">
            <circle cx="12" cy="12" r="8.5" />
            <circle cx="12" cy="12" r="2.6" fill="var(--ew-lacquer)" stroke="none" />
          </svg>
        )}
        {playing ? <i className="ew-onair-eq" aria-hidden="true"><b /><b /><b /></i> : null}
      </figure>
      <div className="ew-onair-copy">
        <Eyebrow as="span" tone={playing ? "ether" : "dust"} className="ew-onair-label">
          {playing ? <i className="rp-live-dot" /> : null}
          {VOICE.tabOnAir}
        </Eyebrow>
        {body}
      </div>
    </section>
  );
}
