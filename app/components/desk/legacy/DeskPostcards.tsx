import { useEffect, useRef } from "react";
import { Eyebrow } from "~/components/ui/Eyebrow";
import { VOICE } from "~/components/keeper/keeperVoice";
import { KEEPER_DELIGHT_MS } from "~/components/keeper/keeperState";
import { useKeeperStore, type KeeperFactEntry } from "~/state/keeperStore";

/**
 * The keeper's postcards: one grounded fact each about the place, the
 * country, the language, the genre or the artist, written on cream card in
 * blue ink with his postmark. A card that arrives while you watch is stamped
 * as it lands (and he looks up). The honesty label heads the stack: these are
 * out of his notebook, not the station's word.
 */
export function DeskPostcards({
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
  // Cards already on the desk when it opened are history, not news.
  const seen = useRef<Set<string> | null>(null);
  const keys = entries.map((entry) => `${entry.kind}:${entry.topic}`);
  if (seen.current === null) seen.current = new Set(keys);
  const fresh = keys.filter((key) => !seen.current!.has(key));
  useEffect(() => {
    if (!fresh.length) return;
    useKeeperStore.getState().delight(KEEPER_DELIGHT_MS);
    const timer = window.setTimeout(() => {
      for (const key of fresh) seen.current!.add(key);
    }, 1800);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fresh.join("|")]);

  const shown = [...entries].reverse().slice(0, 6);

  return (
    <section className="ew-desk-card ew-cards" aria-labelledby="ew-cards-title">
      <header className="ew-desk-card-head">
        <h2 id="ew-cards-title" className="ew-desk-card-title">{VOICE.postcards(place)}</h2>
      </header>
      {shown.length ? (
        <Eyebrow as="p" tone="dust" className="ew-desk-notebook">{VOICE.notebook}</Eyebrow>
      ) : null}
      {shown.length || (reading && askEnabled) ? (
        <ol className="ew-cards-grid">
          {reading && askEnabled ? (
            <li className="ew-postcard is-reading">
              <img src="/keeper/searching.webp" alt="" width={56} height={56} className="ew-postcard-keeper" />
              <p>{VOICE.reading(place)}</p>
            </li>
          ) : null}
          {shown.map((entry) => {
            const key = `${entry.kind}:${entry.topic}`;
            return (
              <li key={key} className="ew-postcard" data-kind={entry.kind} data-fresh={fresh.includes(key) || undefined}>
                <span className="ew-postmark" aria-hidden="true">
                  <b>{entry.kind}</b>
                  <i>{date}</i>
                </span>
                <h3 className="ew-postcard-topic">{entry.topic}</h3>
                <p className="ew-postcard-text">{entry.text}</p>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="ew-cards-empty">{askEnabled ? VOICE.noPostcards(place) : VOICE.postcardsOff}</p>
      )}
    </section>
  );
}
