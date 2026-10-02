import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Chip } from "~/components/ui/Button";
import { shareStation } from "~/components/share/shareStation";
import { usePlayerNoticeStore } from "~/state/playerNoticeStore";
import { useKeeperStore, type KeeperFactEntry } from "~/state/keeperStore";
import { usePlayerStore } from "~/state/playerStore";
import type { Station } from "~/types/radio";
import { FlapText } from "./FlapText";
import { foldName } from "./keeperAliases";
import { KeeperAttachment, Provenance } from "./KeeperAttachment";
import { keeperOpeningLine, spokenHour, type KeeperFacts } from "./keeperFacts";
import { KEEPER_QUESTION_MAX } from "./keeperIntent";
import { keeperMoves, type Last, type Move } from "./keeperMoves";
import { planMurmurs } from "./keeperMurmur";
import { findSimilar } from "./keeperSimilarClient";
import type { Similar } from "./keeperSimilar";
import { useKeeperTalk } from "./useKeeperTalk";
import { useStationSubject } from "./useStationSubject";
import { VOICE } from "./keeperVoice";

const MET_KEY = "elsewhere.keeper.met";
function firstVisit(): boolean {
  try {
    return window.localStorage.getItem(MET_KEY) === null;
  } catch {
    return false;
  }
}

/** The moves, wrapped (never scrolled): shared by the sheet, the desk card and the home. */
export function KeeperMoves({
  moves,
  onMove,
  className = "ew-counter-moves",
}: {
  moves: Array<{ id: string; label: string }>;
  onMove: (id: string) => void;
  className?: string;
}) {
  if (moves.length === 0) return null;
  return (
    <div className={className} role="group" aria-label="Ask the keeper">
      {moves.map((move) => (
        <Chip key={move.id} onClick={() => onMove(move.id)}>
          {move.label}
        </Chip>
      ))}
    </div>
  );
}

/** "Ask me: where, when, who…" and Ask. One field for the sheet, the desk and the home. */
export function KeeperAskField({
  draft,
  onDraft,
  onSubmit,
  disabled,
  placeholder = VOICE.askPlaceholder,
  inputId,
  className = "ew-counter-field",
  autoFocus,
  onFocusChange,
}: {
  draft: string;
  onDraft: (value: string) => void;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  inputId: string;
  className?: string;
  autoFocus?: boolean;
  onFocusChange?: (focused: boolean) => void;
}) {
  return (
    <form
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        const question = draft.trim().slice(0, KEEPER_QUESTION_MAX);
        if (question) onSubmit(question);
      }}
    >
      <label htmlFor={inputId} className="sr-only">
        {VOICE.askFieldLabel}
      </label>
      <input
        id={inputId}
        type="text"
        value={draft}
        maxLength={KEEPER_QUESTION_MAX}
        autoComplete="off"
        enterKeyHint="send"
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onDraft(event.target.value)}
        onFocus={() => onFocusChange?.(true)}
        onBlur={() => onFocusChange?.(false)}
      />
      <Button type="submit" variant="mono" disabled={disabled || !draft.trim()}>
        {VOICE.guideAskSend}
      </Button>
    </form>
  );
}

/**
 * The counter: one line at a time, where it came from, at most three next
 * moves, and a quiet field. The sheet and the desk card both wear it.
 */
export function KeeperCounter({
  facts,
  askEnabled,
  surface,
  plate,
  paused,
  entries,
  onLeave,
  idPrefix,
}: {
  facts: KeeperFacts;
  askEnabled: boolean;
  surface: "sheet" | "desk";
  plate?: string | null;
  paused?: boolean;
  entries: KeeperFactEntry[];
  onLeave?: () => void;
  idPrefix: string;
}) {
  const hushed = useKeeperStore((state) => state.hushed);
  const setHushed = useKeeperStore((state) => state.setHushed);
  const setTyping = useKeeperStore((state) => state.setTyping);
  const setExchange = useKeeperStore((state) => state.setExchange);
  const exchange = useKeeperStore((state) => state.exchange);
  const nowStation = usePlayerStore((state) => state.nowPlaying);
  const queue = usePlayerStore((state) => state.queue);
  const startStation = usePlayerStore((state) => state.startStation);
  const setNotice = usePlayerNoticeStore((state) => state.setNotice);
  const stationId = nowStation?.uuid ?? null;

  const { talk, ask, askLocal, answerFromLog, tell, hopTo, interrupt, offline, limited } = useKeeperTalk({
    facts,
    askEnabled,
    entries,
    onLeave,
  });
  const subject = useStationSubject(facts, askEnabled);
  const [similar, setSimilar] = useState<Similar | null>(null);
  useEffect(() => {
    if (surface !== "sheet" || !nowStation) return;
    let live = true;
    setSimilar(null);
    void findSimilar(nowStation, queue).then((found) => {
      if (live) setSimilar(found);
    });
    return () => {
      live = false;
    };
    // The queue changes as stations board; the thread is about the one on air.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationId, surface]);

  const topics = useMemo(
    () =>
      planMurmurs(facts)
        .flatMap((step) => (step.type === "fact" ? [step.name] : []))
        .slice(0, 4),
    [facts],
  );

  const [draft, setDraft] = useState("");
  const [asked, setAsked] = useState<{ station: string | null; ids: ReadonlySet<string> }>({ station: stationId, ids: new Set() });
  const [last, setLast] = useState<Last | null>(null);
  const askedIds = asked.station === stationId ? asked.ids : new Set<string>();
  const talkRef = useRef<HTMLDivElement>(null);
  // Read after mount: the desk is server-rendered, and storage is not.
  const [lead, setLead] = useState(false);
  useEffect(() => setLead(firstVisit()), []);

  // The first visit's lead line is said once; closing the counter marks it met.
  useEffect(
    () => () => {
      try {
        window.localStorage.setItem(MET_KEY, "1");
      } catch {
        // He will say it again next time.
      }
    },
    [],
  );

  const mark = (id: string) =>
    setAsked((held) => ({ station: stationId, ids: new Set([...(held.station === stationId ? held.ids : []), id]) }));

  const focusTalk = () => window.requestAnimationFrame(() => talkRef.current?.focus({ preventScroll: true }));

  // Opened on a murmur he just said, or on a question already asked.
  const entryTaken = useRef(false);
  useEffect(() => {
    // Only the sheet is opened on a line or a question; the desk card never takes it.
    if (surface !== "sheet" || entryTaken.current) return;
    entryTaken.current = true;
    const taken = useKeeperStore.getState().takeSheetEntry();
    if (!taken) return;
    if (taken.line) {
      const known = entries.some((e) => e.text === taken.line!.text);
      tell(null, taken.line.text, undefined, { basis: known ? "knowledge" : "station", topic: taken.line.topic });
      setLast({ role: "murmur", topic: taken.line.topic });
    } else if (taken.ask) {
      const name = taken.ask.replace(/^Tell me about /, "");
      setLast({ role: "topic", topic: name });
      mark(`topic:${foldName(name)}`);
      void ask(taken.ask);
    }
    // Once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A typed question about a person or a place deserves the follow-ups a tapped one gets.
  const effectiveLast: Last | null =
    last?.role === "typed" && talk?.topic
      ? { role: talk.image ? "subject" : "topic", topic: talk.topic }
      : last;
  const moves = keeperMoves({
    facts,
    askEnabled,
    offline,
    subject: subject?.title ?? null,
    topics,
    hasSimilar: Boolean(similar),
    canShare: Boolean(nowStation) && surface === "sheet",
    hushed,
    surface,
    last: effectiveLast,
    asked: askedIds,
  });

  const onShare = async () => {
    if (!nowStation) return;
    const clock = facts.hour ? spokenHour(facts.hour.clock, facts.hour.localHour) : null;
    const result = await shareStation(nowStation, clock);
    if (result === "copied") setNotice({ kind: "info", message: VOICE.shared, durationMs: 3200 });
  };

  const onMove = (id: string) => {
    const move = moves.find((m) => m.id === id);
    if (!move) return;
    if (move.role !== "hop" && move.role !== "hush") mark(move.id);
    runMove(move);
    if (move.role !== "hop" && move.role !== "ticket") focusTalk();
  };

  const runMove = (move: Move) => {
    switch (move.role) {
      case "subject":
        setLast({ role: "subject", topic: move.topic });
        void ask(move.question!);
        return;
      case "facts":
        setLast({ role: "facts", topic: move.topic });
        void ask(move.question!);
        return;
      case "topic":
        setLast({ role: "topic", topic: move.topic });
        if (!answerFromLog(move.topic!, move.question!)) void ask(move.question!);
        return;
      case "artist":
        setLast({ role: "artist" });
        askLocal("artist", move.label);
        return;
      case "playing":
        setLast({ role: facts.track ? "playing" : "deadend" });
        askLocal("track", move.label, { attachment: "onair" });
        return;
      case "language":
      case "city":
        setLast({ role: move.role });
        askLocal(move.intent!, move.label);
        return;
      case "station":
        setLast({ role: "station" });
        askLocal("station", move.label, { attachment: "station" });
        return;
      case "hop":
        hopTo(move.hour!);
        return;
      case "similar":
        if (!similar) return;
        setLast({ role: "similar" });
        tell(move.label, VOICE.similarAnswer(similar.label), undefined, { attachment: "similar" });
        return;
      case "ticket":
        void onShare();
        return;
      case "hush":
        setHushed(!hushed);
        setLast({ role: "hush" });
        tell(null, hushed ? VOICE.speakUpDone : VOICE.hushDone);
        return;
    }
  };

  const board = (station: Station) => {
    startStation(station, { preserveQueue: true, autoPlay: true });
    onLeave?.();
  };

  const onSubmit = (question: string) => {
    setDraft("");
    setTyping(false);
    setLast({ role: "typed" });
    void ask(question);
    focusTalk();
  };

  const thinking = Boolean(talk && !talk.answer);
  const opening = paused ? VOICE.deskPaused : keeperOpeningLine(facts);
  const tagKind: "notebook" | "station" | null =
    talk?.answer && talk.basis === "knowledge" ? "notebook" : talk?.answer && talk.attachment === "onair" && facts.track ? "station" : null;
  const lineId = surface === "sheet" ? "ew-keeper-line" : undefined;
  const typing = draft.trim().length > 0;
  const fieldOff = !askEnabled;

  return (
    <div className="ew-counter" data-surface={surface}>
      <div className="ew-counter-scroll">
        <div className="ew-counter-talk" ref={talkRef} tabIndex={-1} aria-live="polite" aria-busy={thinking || undefined}>
          {talk ? (
            <>
              {talk.question ? <p className="ew-counter-q">{talk.question}</p> : null}
              {tagKind ? <Provenance kind={tagKind} /> : null}
              {talk.answer ? (
                <div className="ew-counter-answer">
                  {talk.image ? (
                    <img
                      className="ew-counter-portrait"
                      src={talk.image}
                      alt={talk.topic ?? ""}
                      width={76}
                      height={100}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                  ) : null}
                  <FlapText
                    id={lineId}
                    className={`ew-counter-line${talk.answer.length > 160 ? " is-long" : ""}`}
                    text={talk.answer}
                  />
                  {talk.stationLine ? <p className="ew-counter-note">{talk.stationLine}</p> : null}
                </div>
              ) : (
                <p className="ew-counter-line is-pending" id={lineId}>
                  <span className="sr-only">The keeper is thinking.</span>
                  <span aria-hidden="true">{VOICE.askingNow}</span>
                </p>
              )}
              {talk.answer && talk.facts?.length ? (
                <ul className="ew-counter-facts">
                  {talk.facts.map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>
              ) : null}
              {talk.answer && talk.pageUrl && (talk.image || talk.facts?.length) ? (
                <p className="ew-counter-source">
                  <a href={talk.pageUrl} target="_blank" rel="noreferrer">
                    {VOICE.factsSource}
                  </a>
                </p>
              ) : null}
              {talk.answer && talk.hop ? (
                <Chip className="ew-counter-hop" onClick={() => hopTo(talk.hop!)}>
                  Off we go →
                </Chip>
              ) : null}
              <KeeperAttachment talk={talk} facts={facts} plate={plate} similar={similar} onBoard={board} />
            </>
          ) : (
            <>
              <FlapText id={lineId} className="ew-counter-line" text={opening} />
              {hushed ? <p className="ew-counter-lead">{VOICE.hushedLine}</p> : null}
              {lead && !hushed ? <p className="ew-counter-lead">{VOICE.askLead}</p> : null}
            </>
          )}
        </div>
        {!typing && !thinking ? <KeeperMoves moves={moves} onMove={onMove} /> : null}
      </div>
      {fieldOff ? (
        <p className="ew-counter-closed">{VOICE.askOff}</p>
      ) : (
        <KeeperAskField
          draft={draft}
          onDraft={(value) => {
            const nowTyping = value.trim().length > 0;
            setDraft(value);
            setTyping(nowTyping);
            // Typing interrupts the keeper: it stops talking and listens.
            if (nowTyping && exchange === "speaking") {
              interrupt();
              setExchange("none");
            }
          }}
          onSubmit={onSubmit}
          disabled={limited}
          placeholder={limited ? VOICE.limitedPlaceholder : VOICE.askPlaceholder}
          inputId={`${idPrefix}-input`}
          onFocusChange={(focused) => {
            if (!focused) setTyping(false);
          }}
        />
      )}
    </div>
  );
}
