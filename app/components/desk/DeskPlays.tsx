import { Link } from "@remix-run/react";
import { useState } from "react";
import { keeperAnchor } from "~/components/keeper/keeperRoamModel";
import { VOICE } from "~/components/keeper/keeperVoice";
import { DESK_ANCHORS } from "./deskKeeper";
import { deskPlays, playsSearchTerm } from "./deskModel";

/**
 * What this station plays: up to three readable labels, worked out once,
 * offline, from how the station describes itself (never from what is on air
 * now), with the station's own raw tags one tap away. A station without
 * confident labels shows its raw tags as they are.
 */
/** One chip: a link to Home searching for it, or plain text when there is nothing to search. */
function PlaysChip({ text, kind = "label" }: { text: string; kind?: "label" | "tag" }) {
  const term = playsSearchTerm(text, kind);
  if (!term) return <li>{text}</li>;
  return (
    <li>
      <Link
        to={`/?q=${encodeURIComponent(term)}`}
        className="ew-plays-link"
        title={VOICE.playsTravel(text)}
        prefetch="intent"
      >
        {text}
      </Link>
    </li>
  );
}

export function DeskPlays({ labels, tags }: { labels: string[] | null; tags: string[] }) {
  const [open, setOpen] = useState(false);
  const plays = deskPlays(labels, tags);
  const rawId = "ew-plays-raw";
  return (
    <section
      className="ew-desk-card ew-plays"
      aria-labelledby="ew-plays-title"
      {...keeperAnchor(DESK_ANCHORS.plays)}
    >
      <h2 id="ew-plays-title" className="ew-plays-title">{VOICE.playsTitle}</h2>
      {plays.rawOnly ? (
        plays.raw.length ? (
          <ul className="ew-plays-raw" aria-label={VOICE.playsRaw(plays.raw.length)}>
            {plays.raw.map((tag) => (
              <PlaysChip key={tag} text={tag} kind="tag" />
            ))}
          </ul>
        ) : (
          <p className="ew-plays-none">{VOICE.playsNone}</p>
        )
      ) : (
        <>
          <ul className="ew-plays-labels">
            {plays.labels.map((label) => (
              <PlaysChip key={label} text={label} />
            ))}
          </ul>
          <p className="ew-plays-basis">{VOICE.playsBasis}</p>
          {plays.raw.length ? (
            <>
              <button
                type="button"
                className="ew-plays-toggle"
                aria-expanded={open}
                aria-controls={rawId}
                onClick={() => setOpen((value) => !value)}
              >
                {open ? VOICE.playsRawHide : VOICE.playsRaw(plays.raw.length)}
              </button>
              {open ? (
                <ul id={rawId} className="ew-plays-raw">
                  {plays.raw.map((tag) => (
                    <PlaysChip key={tag} text={tag} kind="tag" />
                  ))}
                </ul>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </section>
  );
}
