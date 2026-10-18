import { useState } from "react";
import { keeperAnchor } from "~/components/keeper/keeperRoamModel";
import { VOICE } from "~/components/keeper/keeperVoice";
import { DESK_ANCHORS } from "./deskKeeper";
import { deskPlays } from "./deskModel";

/**
 * What this station plays: up to three readable labels, worked out once,
 * offline, from how the station describes itself (never from what is on air
 * now), with the station's own raw tags one tap away. A station without
 * confident labels shows its raw tags as they are.
 */
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
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        ) : (
          <p className="ew-plays-none">{VOICE.playsNone}</p>
        )
      ) : (
        <>
          <ul className="ew-plays-labels">
            {plays.labels.map((label) => (
              <li key={label}>{label}</li>
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
                    <li key={tag}>{tag}</li>
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
