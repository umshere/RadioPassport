import { useEffect, useRef, useState } from "react";
import { Eyebrow } from "~/components/ui/Eyebrow";
import { keeperAnchor } from "~/components/keeper/keeperRoamModel";
import { VOICE } from "~/components/keeper/keeperVoice";
import { KEEPER_DELIGHT_MS } from "~/components/keeper/keeperState";
import { useKeeperStore, type KeeperFactEntry } from "~/state/keeperStore";
import { DESK_ANCHORS } from "./deskKeeper";
import { nextNoteIndex } from "./deskModel";

/**
 * One note from the keeper's notebook at a time: a grounded fact about the
 * place, the country, the language, the genre or the artist, on cream card
 * with his postmark. "One more note" turns to the next. The honesty label
 * heads it: these are out of his notebook, not the station's word. A note
 * that arrives while you watch comes to the top, stamped as it lands.
 */
export function DeskNote({
  place,
  entries,
  reading,
  askEnabled,
  date,
}: {
  place: string;
  entries: KeeperFactEntry[];
  reading: boolean;
  askEnabled: boolean;
  /** "29 SEP", for the postmark. */
  date: string;
}) {
  // Notes already on the desk when it opened are history, not news.
  const seen = useRef<Set<string> | null>(null);
  const keys = entries.map((entry) => `${entry.kind}:${entry.topic}`);
  if (seen.current === null) seen.current = new Set(keys);
  const fresh = keys.filter((key) => !seen.current!.has(key));
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!fresh.length) return;
    setIndex(0);
    useKeeperStore.getState().delight(KEEPER_DELIGHT_MS);
    const timer = window.setTimeout(() => {
      for (const key of fresh) seen.current!.add(key);
    }, 1800);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fresh.join("|")]);

  // Newest first.
  const stack = [...entries].reverse();
  const shown = stack[Math.min(index, Math.max(0, stack.length - 1))];
  const key = shown ? `${shown.kind}:${shown.topic}` : "";

  return (
    <section
      className="ew-desk-card ew-cards ew-note"
      aria-labelledby="ew-cards-title"
      {...keeperAnchor(DESK_ANCHORS.note)}
    >
      <header className="ew-desk-card-head">
        <h2 id="ew-cards-title" className="ew-desk-card-title">{VOICE.postcards(place)}</h2>
        {stack.length > 1 ? (
          <span className="ew-note-count">{VOICE.noteCount(Math.min(index, stack.length - 1), stack.length)}</span>
        ) : null}
      </header>
      {shown ? <Eyebrow as="p" tone="dust" className="ew-desk-notebook">{VOICE.notebook}</Eyebrow> : null}
      {shown ? (
        <article key={key} className="ew-postcard" data-kind={shown.kind} data-fresh={fresh.includes(key) || undefined} aria-live="polite">
          <span className="ew-postmark" aria-hidden="true">
            <b>{shown.kind}</b>
            <i>{date}</i>
          </span>
          <h3 className="ew-postcard-topic">{shown.topic}</h3>
          <p className="ew-postcard-text">{shown.text}</p>
        </article>
      ) : reading && askEnabled ? (
        <div className="ew-postcard is-reading">
          <img src="/keeper/searching.webp" alt="" width={56} height={56} className="ew-postcard-keeper" />
          <p>{VOICE.reading(place)}</p>
        </div>
      ) : (
        <p className="ew-cards-empty">{askEnabled ? VOICE.noPostcards(place) : VOICE.postcardsOff}</p>
      )}
      {stack.length > 1 ? (
        <button
          type="button"
          className="ew-note-more"
          onClick={() => setIndex((value) => nextNoteIndex(Math.min(value, stack.length - 1), stack.length))}
        >
          {VOICE.noteMore} →
        </button>
      ) : null}
    </section>
  );
}
