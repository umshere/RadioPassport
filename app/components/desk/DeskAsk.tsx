import { KeeperCounter } from "~/components/keeper/KeeperCounter";
import type { KeeperFacts } from "~/components/keeper/keeperFacts";
import { VOICE } from "~/components/keeper/keeperVoice";
import { useKeeperStore, type KeeperFactEntry } from "~/state/keeperStore";

/**
 * Ask the desk, on the desk page: the same counter the sheet wears, in the
 * desk card. The desk shows the pass, what is on air and the departures
 * itself, so the counter leaves those moves out here. The chatter switch
 * lives in the card head: it is his voice.
 */
export function DeskAsk({
  facts,
  askEnabled,
  entries,
}: {
  facts: KeeperFacts;
  askEnabled: boolean;
  entries: KeeperFactEntry[];
}) {
  const hushed = useKeeperStore((state) => state.hushed);
  const setHushed = useKeeperStore((state) => state.setHushed);
  return (
    <section className="ew-desk-card ew-ask" aria-labelledby="ew-ask-title">
      <header className="ew-desk-card-head">
        <h2 id="ew-ask-title" className="ew-desk-card-title">{VOICE.askTitle}</h2>
        <button
          type="button"
          className="ew-ask-chatter"
          aria-pressed={!hushed}
          onClick={() => setHushed(!hushed)}
        >
          <i aria-hidden="true" />
          <span>{hushed ? VOICE.actChatterOff : VOICE.actChatterOn}</span>
        </button>
      </header>
      <KeeperCounter facts={facts} askEnabled={askEnabled} surface="desk" entries={entries} idPrefix="ew-desk-ask" />
    </section>
  );
}
