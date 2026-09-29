import { useLocation, useNavigate, useRouteLoaderData } from "@remix-run/react";
import { Eyebrow } from "~/components/ui/Eyebrow";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { snapBoardSheet } from "~/components/radio-passport/BoardSheet";
import { FlipBoard } from "~/components/radio-passport/FlipBoard";
import { Button, ButtonLink, Chip } from "~/components/ui/Button";
import { markArtworkUrlFailed } from "~/utils/stations";
import { useKeeperStore } from "~/state/keeperStore";
import { usePlayerStore } from "~/state/playerStore";
import { ShareButton } from "~/components/share/ShareButton";
import type { SolarHour } from "~/utils/localTime";
import { FlapText } from "./FlapText";
import { Keeper } from "./Keeper";
import { askKeeper } from "./keeperClient";
import { readKeeperFact } from "./keeperFactClient";
import { planMurmurs } from "./keeperMurmur";
import { VOICE } from "./keeperVoice";
import {
  answerLocally,
  keeperOpeningLine,
  spokenHour,
  titleCase,
  keeperTrackLine,
  suggestedQuestions,
  type KeeperFacts,
  type KeeperQuestion,
} from "./keeperFacts";
import { KEEPER_QUESTION_MAX, ruleClassify } from "./keeperIntent";
import { speakingDurationMs } from "./keeperState";
import type { KeeperView } from "./useKeeper";

/** Root loader data: the one public flag the keeper reads. */
export function useKeeperAskEnabled(): boolean {
  const data = useRouteLoaderData("root") as { keeperAskEnabled?: boolean } | undefined;
  return Boolean(data?.keeperAskEnabled);
}

/** A beat of thought before a local answer, so the figure can look up. */
const THINK_MS = 420;
const FLAG_OFF_LINE = VOICE.askOff;

type Talk = {
  question: string;
  answer: string | null;
  hop?: SolarHour;
  /** Knowledge answers wear a label: they are not about the station. */
  basis?: "station" | "knowledge";
  stationLine?: string;
};

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

function factRows(facts: KeeperFacts): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [];
  if (facts.station.country) rows.push({ label: "Land", value: facts.station.country });
  rows.push({
    label: "Spoken",
    value: facts.station.language ? titleCase(facts.station.language) : "Not listed",
  });
  rows.push({
    label: "Hour",
    value: facts.hour
      ? `${facts.hour.clock} · ${facts.hour.solar}`
      : "No coordinates sent",
  });
  if (facts.station.bitrate || facts.station.codec) {
    rows.push({
      label: "Signal",
      value: [
        facts.station.bitrate ? `${facts.station.bitrate} kbps` : null,
        facts.station.codec ? facts.station.codec.toUpperCase() : null,
      ]
        .filter(Boolean)
        .join(" · "),
    });
  }
  if (facts.station.tags.length) {
    rows.push({ label: "Tags", value: facts.station.tags.slice(0, 5).join(", ") });
  }
  return rows;
}

/** Where the dock (or band) begins, as px from the viewport bottom. */
function dockFloor(): number {
  const dock = document.querySelector<HTMLElement>(".rp-dock");
  if (!dock) return 0;
  return Math.max(0, window.innerHeight - dock.getBoundingClientRect().top);
}

/**
 * The keeper's sheet: a bottom sheet over the page on the phone that stops
 * at the top of the dock (the transport stays in reach), a quiet side panel
 * on desktop. Dialog semantics: focus moves in and is trapped, Esc closes,
 * focus returns to the keeper. Drag the grip down to close.
 */
export function KeeperSheet({ view }: { view: KeeperView & { facts: KeeperFacts } }) {
  const { facts } = view;
  const askEnabled = useKeeperAskEnabled();
  const navigate = useNavigate();
  const location = useLocation();
  const closeSheet = useKeeperStore((state) => state.closeSheet);
  const setTyping = useKeeperStore((state) => state.setTyping);
  const setExchange = useKeeperStore((state) => state.setExchange);
  const requestHour = useKeeperStore((state) => state.requestHour);
  const factLog = useKeeperStore((state) => state.factLog);
  const reading = useKeeperStore((state) => state.reading);
  const hushed = useKeeperStore((state) => state.hushed);
  const setHushed = useKeeperStore((state) => state.setHushed);
  const nowStation = usePlayerStore((state) => state.nowPlaying);
  const stationId = nowStation?.uuid ?? null;
  const entries = stationId && factLog.stationId === stationId ? factLog.entries : [];
  const topicSteps = planMurmurs(facts).flatMap((step) => (step.type === "fact" ? [step] : [])).slice(0, 3);
  const sheetRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);
  const turn = useRef(0);
  const [talk, setTalk] = useState<Talk | null>(null);
  const [draft, setDraft] = useState("");
  const [floor, setFloor] = useState(0);
  const [dragY, setDragY] = useState<number | null>(null);
  const [plateFailed, setPlateFailed] = useState(false);
  useEffect(() => setPlateFailed(false), [view.plate]);
  const drag = useRef<{ startY: number; startT: number; moved: boolean } | null>(null);
  const suppressGripClick = useRef(false);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    },
    [],
  );

  // The sheet stands on the dock, never over it.
  useLayoutEffect(() => {
    const update = () => setFloor(dockFloor());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Opened with nothing to say yet? Read up on the place and the country now,
  // so the sheet is never a dead end.
  useEffect(() => {
    if (!askEnabled || !stationId) return;
    const held = useKeeperStore.getState().factLog;
    if (held.stationId === stationId && held.entries.length >= 2) return;
    for (const step of planMurmurs(facts)) {
      if (step.type === "fact") void readKeeperFact(stationId, step.kind, step.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [askEnabled, stationId]);

  const close = useCallback(() => {
    turn.current += 1;
    closeSheet();
  }, [closeSheet]);

  // Focus in, trap, Esc, focus back to the keeper.
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const previous = document.activeElement as HTMLElement | null;
    const first =
      sheet.querySelector<HTMLElement>(".ew-keeper-chips button") ??
      sheet.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const items = Array.from(sheet.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (node) => node.offsetParent !== null,
      );
      const head = items[0];
      const tail = items[items.length - 1];
      if (!head || !tail) return;
      const active = document.activeElement;
      if (event.shiftKey && (active === head || !sheet.contains(active))) {
        event.preventDefault();
        tail.focus();
      } else if (!event.shiftKey && (active === tail || !sheet.contains(active))) {
        event.preventDefault();
        head.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.requestAnimationFrame(() => {
        // Only a real close hands focus back (a dev StrictMode re-run of
        // this effect must not pull focus out of an open sheet).
        if (useKeeperStore.getState().sheetOpen) return;
        const keeper = document.querySelector<HTMLElement>(".ew-keeper-float button");
        (keeper ?? previous)?.focus?.({ preventScroll: true });
      });
    };
  }, [close]);

  const speak = useCallback(
    (
      question: string,
      answer: string,
      hop?: SolarHour,
      extra?: { basis?: "station" | "knowledge"; stationLine?: string },
    ) => {
      setTalk({ question, answer, hop, ...extra });
      setExchange("speaking");
      const mine = turn.current;
      later(() => {
        if (turn.current === mine) setExchange("none");
      }, speakingDurationMs(answer));
    },
    [later, setExchange],
  );

  const hopTo = useCallback(
    (hour: SolarHour) => {
      close();
      if (location.pathname === "/") {
        requestHour(hour);
      } else {
        navigate(`/?hour=${hour}`);
      }
    },
    [close, location.pathname, navigate, requestHour],
  );

  /** A dead end ("no titles") never ends the exchange: offer what the desk knows. */
  const withPivot = (text: string, intent: string) => {
    if (facts.track || (intent !== "track" && intent !== "artist")) return text;
    const pivot = entries[0];
    return pivot ? `${text} While you wait: ${pivot.text}` : text;
  };

  const onChip = (question: KeeperQuestion) => {
    if (question.intent === "hour_hop" && question.hour) {
      hopTo(question.hour);
      return;
    }
    turn.current += 1;
    const mine = turn.current;
    setTalk({ question: question.label, answer: null });
    setExchange("thinking");
    later(() => {
      if (turn.current !== mine) return;
      speak(question.label, withPivot(answerLocally(question.intent, facts).text, question.intent));
    }, THINK_MS);
  };

  const ask = async (question: string) => {
    turn.current += 1;
    const mine = turn.current;
    if (!askEnabled) {
      speak(question, FLAG_OFF_LINE);
      return;
    }
    setTalk({ question, answer: null });
    setExchange("thinking");
    const reply = await askKeeper(question, facts);
    if (turn.current !== mine) return;
    if (reply) {
      speak(question, reply.answer, reply.action?.hour, {
        basis: reply.basis,
        stationLine: reply.stationLine,
      });
      return;
    }
    const intent = ruleClassify(question);
    const local = answerLocally(intent, facts);
    speak(question, withPivot(local.text, intent), local.action?.hour);
  };

  const onAsk = async (event: React.FormEvent) => {
    event.preventDefault();
    const question = draft.trim().slice(0, KEEPER_QUESTION_MAX);
    if (!question) return;
    setDraft("");
    setTyping(false);
    await ask(question);
  };

  const chips = suggestedQuestions(facts);
  const opening = keeperOpeningLine(facts);
  const where = [facts.city || facts.station.country, facts.hour?.clock]
    .filter(Boolean)
    .join(" · ");
  const title = where ? `The keeper · ${where}` : "The keeper";

  return (
    <div
      className="ew-keeper-layer"
      style={{ ["--keeper-floor" as string]: `${floor}px` }}
    >
      <div className="ew-keeper-scrim" aria-hidden="true" onClick={close} />
      <section
        ref={sheetRef}
        className="ew-keeper-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ew-keeper-title"
        aria-describedby="ew-keeper-line"
        data-state={view.state}
        style={
          dragY !== null
            ? { transform: `translateY(${dragY}px)`, transition: "none", animation: "none" }
            : undefined
        }
      >
        <Button
          variant="text"
          className="ew-keeper-grip"
          aria-label="Close the keeper"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { startY: event.clientY, startT: performance.now(), moved: false };
          }}
          onPointerMove={(event) => {
            const start = drag.current;
            if (!start) return;
            const travel = event.clientY - start.startY;
            if (Math.abs(travel) > 4) start.moved = true;
            setDragY(Math.max(0, travel));
          }}
          onPointerUp={(event) => {
            const start = drag.current;
            drag.current = null;
            setDragY(null);
            if (!start?.moved) return;
            suppressGripClick.current = true;
            const travel = event.clientY - start.startY;
            const velocity = travel / Math.max(1, performance.now() - start.startT);
            if (snapBoardSheet(travel, velocity, "open") === "peek") close();
          }}
          onPointerCancel={() => {
            drag.current = null;
            setDragY(null);
          }}
          onClick={() => {
            if (suppressGripClick.current) {
              suppressGripClick.current = false;
              return;
            }
            close();
          }}
        >
          <i className="ew-keeper-grip-bar" aria-hidden="true" />
        </Button>
        <header className="ew-keeper-top">
          <Keeper state={view.state} mood={view.mood} size="sheet" />
          <div className="ew-keeper-heading">
            <h2 id="ew-keeper-title" className="ew-keeper-eyebrow">
              <span className="sr-only">{title}</span>
              <span aria-hidden="true">The keeper</span>
              {where ? <FlipBoard text={where} className="is-meta" /> : null}
            </h2>
            <FlapText id="ew-keeper-line" className="ew-keeper-line" text={opening} />
          </div>
          <Button variant="text" className="ew-keeper-close" onClick={close}>
            Close
          </Button>
        </header>
        <div className="ew-keeper-body">
          <div className="ew-keeper-onair-row">
            {view.plate && !plateFailed ? (
              <img
                className="ew-keeper-plate-art"
                src={view.plate}
                alt=""
                width={56}
                height={56}
                onError={() => {
                  markArtworkUrlFailed(view.plate!);
                  setPlateFailed(true);
                }}
              />
            ) : null}
            <p className="ew-keeper-onair">
              <span className="ew-keeper-label">On air</span>
              <span className={facts.track ? "ew-keeper-track" : "ew-keeper-notrack"}>
                {keeperTrackLine(facts)}
              </span>
            </p>
          </div>
          {entries.length || (reading && askEnabled) ? (
            <section className="ew-keeper-know" aria-label={VOICE.postcards(facts.city || facts.station.country)}>
              <Eyebrow tone="foil">{VOICE.postcards(facts.city || facts.station.country)}</Eyebrow>
              {entries.slice(-3).map((entry) => (
                <div key={`${entry.kind}:${entry.topic}`} className="ew-keeper-know-item">
                  <Eyebrow as="span" tone="dust">{entry.topic}</Eyebrow>
                  <p>{entry.text}</p>
                </div>
              ))}
              {reading && entries.length < 3 ? (
                <p className="ew-keeper-know-wait">{VOICE.reading(facts.city || facts.station.country)}</p>
              ) : null}
              {entries.length ? (
                <Eyebrow as="span" tone="dust" className="ew-keeper-basis">
                  {VOICE.notebook}
                </Eyebrow>
              ) : null}
            </section>
          ) : null}
          <dl className="ew-keeper-facts">
            {factRows(facts).map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
          <div className="ew-keeper-talk" aria-live="polite">
            {talk ? (
              <>
                <p className="ew-keeper-q">{talk.question}</p>
                {talk.answer && talk.basis === "knowledge" ? (
                  <Eyebrow as="span" tone="dust" className="ew-keeper-basis">
                    {VOICE.notebook}
                  </Eyebrow>
                ) : null}
                {talk.answer ? (
                  <FlapText className="ew-keeper-a" text={talk.answer} />
                ) : (
                  <p className="ew-keeper-a is-pending">
                    <span className="sr-only">The keeper is thinking.</span>
                    <span aria-hidden="true">&hellip;</span>
                  </p>
                )}
                {talk.answer && talk.stationLine ? (
                  <p className="ew-keeper-station-line">{talk.stationLine}</p>
                ) : null}
                {talk.answer && talk.hop ? (
                  <Chip className="ew-keeper-hop" onClick={() => hopTo(talk.hop!)}>
                    Off we go &rarr;
                  </Chip>
                ) : null}
              </>
            ) : null}
          </div>
          <div className="ew-keeper-chips" role="group" aria-label="Ask the keeper">
            {chips.map((chip) => (
              <Chip key={chip.label} onClick={() => onChip(chip)}>
                {chip.label}
              </Chip>
            ))}
            {askEnabled
              ? topicSteps.map((step) => (
                  <Chip key={`${step.kind}:${step.name}`} onClick={() => void ask(VOICE.askAbout(step.name))}>
                    {VOICE.askAbout(step.name)}
                  </Chip>
                ))
              : null}
          </div>
          <form className="ew-keeper-ask" onSubmit={onAsk}>
            <label htmlFor="ew-keeper-input" className="sr-only">
              Ask the desk a question
            </label>
            <input
              ref={inputRef}
              id="ew-keeper-input"
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
                // Typing interrupts the keeper: it stops talking and listens.
                if (typing && useKeeperStore.getState().exchange === "speaking") {
                  turn.current += 1;
                  setExchange("none");
                }
              }}
              onBlur={() => setTyping(false)}
            />
            <Button type="submit" variant="mono" disabled={!draft.trim()}>
              Ask
            </Button>
          </form>
          {nowStation ? (
            <ShareButton station={nowStation} clock={facts.hour ? spokenHour(facts.hour.clock, facts.hour.localHour) : null} className="ew-keeper-share" />
          ) : null}
          <Button variant="text" className="ew-keeper-hush" aria-pressed={hushed} onClick={() => setHushed(!hushed)}>
            {hushed ? VOICE.hushOff : VOICE.hushOn}
          </Button>
          {/* SPA link: the audio bridge in root keeps playing. */}
          <ButtonLink to="/listen" variant="atlas" className="ew-keeper-desk" onClick={close}>
            Open the desk <span aria-hidden="true">&rarr;</span>
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
