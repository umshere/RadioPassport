import { useState } from "react";
import { Button, Chip } from "~/components/ui/Button";
import { Eyebrow } from "~/components/ui/Eyebrow";
import { FlapText } from "~/components/keeper/FlapText";
import {
  keeperOpeningLine,
  suggestedQuestions,
  type KeeperFacts,
} from "~/components/keeper/keeperFacts";
import { KEEPER_QUESTION_MAX } from "~/components/keeper/keeperIntent";
import { planMurmurs } from "~/components/keeper/keeperMurmur";
import { VOICE } from "~/components/keeper/keeperVoice";
import { useKeeperTalk } from "~/components/keeper/useKeeperTalk";
import { KeeperTalkExtras } from "~/components/keeper/KeeperTalkExtras";
import { useStationSubject } from "~/components/keeper/useStationSubject";
import { useKeeperStore, type KeeperFactEntry } from "~/state/keeperStore";

/**
 * Ask the desk, on the desk page: the keeper's greeting until you ask, then
 * the question and his answer (labelled when it comes out of his notebook),
 * the box, and the questions worth asking now. Chips wrap; nothing scrolls
 * sideways. The chatter switch lives here too: it is his voice.
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
  const setTyping = useKeeperStore((state) => state.setTyping);
  const setExchange = useKeeperStore((state) => state.setExchange);
  const hushed = useKeeperStore((state) => state.hushed);
  const setHushed = useKeeperStore((state) => state.setHushed);
  const { talk, ask, onChip, hopTo, interrupt } = useKeeperTalk({ facts, askEnabled, entries });
  const [draft, setDraft] = useState("");
  const subject = useStationSubject(facts, askEnabled);
  // "What's playing?" is already answered by the On air card beside this one.
  const chips = suggestedQuestions(facts).filter((chip) => chip.intent !== "track");
  const topics = askEnabled
    ? planMurmurs(facts)
        .flatMap((step) => (step.type === "fact" ? [step] : []))
        .slice(0, 3)
    : [];

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const question = draft.trim().slice(0, KEEPER_QUESTION_MAX);
    if (!question) return;
    setDraft("");
    setTyping(false);
    await ask(question);
  };

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

      <div className="ew-ask-talk" aria-live="polite">
        {talk ? (
          <>
            <p className="ew-ask-q">{talk.question}</p>
            {talk.answer && talk.basis === "knowledge" ? (
              <Eyebrow as="span" tone="dust" className="ew-desk-notebook">{VOICE.notebook}</Eyebrow>
            ) : null}
            {talk.answer ? (
              <FlapText className="ew-ask-a" text={talk.answer} />
            ) : (
              <p className="ew-ask-a is-pending">
                <span className="sr-only">The keeper is thinking.</span>
                <span aria-hidden="true">…</span>
              </p>
            )}
            {talk.answer && talk.stationLine ? <p className="ew-ask-station">{talk.stationLine}</p> : null}
            <KeeperTalkExtras talk={talk} className="ew-ask" onFacts={(topic) => void ask(VOICE.askFacts(topic))} />
            {talk.answer && talk.hop ? (
              <Chip className="ew-ask-hop" onClick={() => hopTo(talk.hop!)}>
                Off we go →
              </Chip>
            ) : null}
          </>
        ) : (
          <>
            <FlapText className="ew-ask-a" text={keeperOpeningLine(facts)} />
            <p className="ew-ask-lead">{VOICE.askLead}</p>
          </>
        )}
      </div>

      <form className="ew-ask-form" onSubmit={onSubmit}>
        <label htmlFor="ew-desk-ask" className="sr-only">
          Ask the desk a question
        </label>
        <input
          id="ew-desk-ask"
          type="text"
          value={draft}
          maxLength={KEEPER_QUESTION_MAX}
          autoComplete="off"
          enterKeyHint="send"
          placeholder={VOICE.askPlaceholder}
          onChange={(event) => {
            const typing = event.target.value.trim().length > 0;
            setDraft(event.target.value);
            setTyping(typing);
            if (typing && useKeeperStore.getState().exchange === "speaking") {
              interrupt();
              setExchange("none");
            }
          }}
          onBlur={() => setTyping(false)}
        />
        <Button type="submit" variant="mono" disabled={!draft.trim()}>
          Ask
        </Button>
      </form>

      <div className="ew-ask-chips" role="group" aria-label="Ask the keeper">
        {chips.map((chip) => (
          <Chip key={chip.label} onClick={() => onChip(chip)}>
            {chip.label}
          </Chip>
        ))}
        {subject ? (
          <Chip className="is-topic is-subject" onClick={() => void ask(VOICE.askAbout(subject.title))}>
            {VOICE.askAbout(subject.title)}
          </Chip>
        ) : null}
        {topics.map((step) => (
          <Chip key={`${step.kind}:${step.name}`} className="is-topic" onClick={() => void ask(VOICE.askAbout(step.name))}>
            {VOICE.askAbout(step.name)}
          </Chip>
        ))}
      </div>
    </section>
  );
}
