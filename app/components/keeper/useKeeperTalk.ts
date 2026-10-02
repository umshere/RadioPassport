import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "@remix-run/react";
import { useKeeperStore, type KeeperFactEntry } from "~/state/keeperStore";
import type { SolarHour } from "~/utils/localTime";
import { askKeeper } from "./keeperClient";
import { answerLocally, type KeeperFacts, type KeeperQuestion } from "./keeperFacts";
import { ruleClassify } from "./keeperIntent";
import { speakingDurationMs } from "./keeperState";
import { VOICE } from "./keeperVoice";

/** A beat of thought before a local answer, so the figure can look up. */
const THINK_MS = 420;

export type KeeperTalk = {
  question: string;
  answer: string | null;
  hop?: SolarHour;
  /** Knowledge answers wear a label: they are not about the station. */
  basis?: "station" | "knowledge";
  stationLine?: string;
  image?: string;
  pageUrl?: string;
  facts?: string[];
  /** The topic a knowledge answer was about: the "a few facts" follow-up asks about it. */
  topic?: string;
};

/**
 * One exchange with the keeper, shared by the sheet and the desk: a chip or a
 * typed question goes out, the figure thinks, the answer lands and the figure
 * speaks for as long as the line takes to read. A newer question (or typing,
 * or leaving) always wins over an older one still in flight.
 */
export function useKeeperTalk({
  facts,
  askEnabled,
  entries,
  onLeave,
}: {
  facts: KeeperFacts | null;
  askEnabled: boolean;
  /** Postcards already told for this station: a dead end pivots to one. */
  entries: KeeperFactEntry[];
  /** Called before an hour hop leaves the page (the sheet closes itself). */
  onLeave?: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const setExchange = useKeeperStore((state) => state.setExchange);
  const requestHour = useKeeperStore((state) => state.requestHour);
  const timers = useRef<number[]>([]);
  const turn = useRef(0);
  const [talk, setTalk] = useState<KeeperTalk | null>(null);

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

  /** Drop whatever is in flight: its answer, if it comes, is not shown. */
  const interrupt = useCallback(() => {
    turn.current += 1;
  }, []);

  const speak = useCallback(
    (
      question: string,
      answer: string,
      hop?: SolarHour,
      extra?: Omit<KeeperTalk, "question" | "answer" | "hop">,
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
      turn.current += 1;
      onLeave?.();
      if (location.pathname === "/") {
        requestHour(hour);
      } else {
        navigate(`/?hour=${hour}`);
      }
    },
    [location.pathname, navigate, onLeave, requestHour],
  );

  /** A dead end ("no titles") never ends the exchange: offer what the desk knows. */
  const withPivot = (text: string, intent: string) => {
    if (!facts || facts.track || (intent !== "track" && intent !== "artist")) return text;
    const pivot = entries[0];
    return pivot ? `${text} While you wait: ${pivot.text}` : text;
  };

  const onChip = (question: KeeperQuestion) => {
    if (!facts) return;
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
    if (!facts) return;
    turn.current += 1;
    const mine = turn.current;
    if (!askEnabled) {
      speak(question, VOICE.askOff);
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
        image: reply.image,
        pageUrl: reply.pageUrl,
        facts: reply.facts,
        topic: reply.topic,
      });
      return;
    }
    const intent = ruleClassify(question);
    const local = answerLocally(intent, facts);
    speak(question, withPivot(local.text, intent), local.action?.hour);
  };

  return { talk, ask, onChip, hopTo, interrupt };
}
