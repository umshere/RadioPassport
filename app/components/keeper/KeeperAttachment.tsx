import { useState } from "react";
import { markArtworkUrlFailed } from "~/utils/stations";
import type { Station } from "~/types/radio";
import { keeperTrackLine, tidyStationName, titleCase, type KeeperFacts } from "./keeperFacts";
import { similarWhere, type Similar } from "./keeperSimilar";
import type { KeeperTalk } from "./useKeeperTalk";
import { VOICE } from "./keeperVoice";

/** Where an utterance came from, read before the words: the notebook, or the station itself. */
export function Provenance({ kind }: { kind: "notebook" | "station" }) {
  return (
    <span className="ew-counter-tag" data-kind={kind}>
      {kind === "notebook" ? VOICE.notebook : VOICE.onAirSent}
    </span>
  );
}

function fileRows(facts: KeeperFacts): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  if (facts.station.country) rows.push({ label: "Land", value: facts.station.country });
  rows.push({ label: "Spoken", value: facts.station.language ? titleCase(facts.station.language) : "Not listed" });
  rows.push({ label: "Hour", value: facts.hour ? `${facts.hour.clock} · ${facts.hour.solar}` : "No coordinates sent" });
  if (facts.station.bitrate || facts.station.codec) {
    rows.push({
      label: "Signal",
      value: [facts.station.bitrate ? `${facts.station.bitrate} kbps` : null, facts.station.codec ? facts.station.codec.toUpperCase() : null]
        .filter(Boolean)
        .join(" · "),
    });
  }
  if (facts.station.tags.length) rows.push({ label: "Tags", value: facts.station.tags.slice(0, 5).join(", ") });
  return rows;
}

/**
 * The one thing that can ride under an utterance: a portrait with its facts,
 * what is on air, the station's file, or three stations to board. Everything
 * here is read live from the facts, so it never goes stale inside a talk.
 */
export function KeeperAttachment({
  talk,
  facts,
  plate,
  similar,
  onBoard,
}: {
  talk: KeeperTalk;
  facts: KeeperFacts;
  plate?: string | null;
  similar?: Similar | null;
  onBoard?: (station: Station) => void;
}) {
  const [plateFailed, setPlateFailed] = useState(false);
  if (!talk.answer) return null;

  if (talk.attachment === "onair") {
    return (
      <div className="ew-counter-onair">
        {plate && !plateFailed ? (
          <img
            src={plate}
            alt=""
            width={48}
            height={48}
            onError={() => {
              markArtworkUrlFailed(plate);
              setPlateFailed(true);
            }}
          />
        ) : null}
        <p className={facts.track ? "is-track" : "is-none"}>{keeperTrackLine(facts)}</p>
      </div>
    );
  }
  if (talk.attachment === "station") {
    return (
      <dl className="ew-keeper-file">
        {fileRows(facts).map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    );
  }
  if (talk.attachment === "similar" && similar) {
    return (
      <ol className="ew-counter-board">
        {similar.stations.map((station) => (
          <li key={station.uuid}>
            <button type="button" className="ew-counter-board-row" onClick={() => onBoard?.(station)}>
              <b>{similarWhere(station)}</b>
              <small>{tidyStationName(station.name)}</small>
              <span aria-hidden="true">{VOICE.board} →</span>
            </button>
          </li>
        ))}
      </ol>
    );
  }
  return null;
}
