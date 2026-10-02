import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "@remix-run/react";
import { useKeeperStore, type KeeperFactEntry } from "~/state/keeperStore";
import type { SolarHour } from "~/utils/localTime";
import { foldName } from "./keeperAliases";
import { askKeeperDetailed } from "./keeperClient";
import { answerLocally, type KeeperFacts } from "./keeperFacts";
import { ruleClassify, type KeeperIntent } from "./keeperIntent";
import { speakingDurationMs } from "./keeperState";
import { VOICE } from "./keeperVoice";

/** A beat of thought before a local answer, so the figure can look up. */
const THINK_MS = 420;

/** Extra furniture an answer can carry, read live by the counter. */
export type TalkAttachment = "onair" | "station" | "similar";

export type KeeperTalk = {
  /** What was asked; null when the line is one he said unasked (a murmur). */
  question: string | null;
  answer: string | null;
  hop?: SolarHour;
  /** Knowledge answers wear a label: they are not about the station. */
  basis?: "station" | "knowledge";
  stationLine?: string;
  image?: string;
  pageUrl?: string;
  facts?: string[];
  /** The topic a knowledge answer was about. */
  topic?: string;
  attachment?: TalkAttachment;
};

type Extra = Omit<KeeperTalk, "question" | "answer" | "hop">;

/**
 * One exchange with the keeper, shared by the sheet and the desk: a move or a
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
  /** Postcards already told for this station: a topic already read is answered from them. */
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
  const talkRef = useRef<KeeperTalk | null>(null);
  talkRef.current = talk;
  /** The line to the notebook is down, or the desk is rationing: both are said once and shape the moves. */
  const [offline, setOffline] = useState(false);
  const [limited, setLimited] = useState(false);

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

  /** Say a line now, with whatever it carries. */
  const tell = useCallback(
    (question: string | null, answer: string, hop?: SolarHour, extra?: Extra) => {
      turn.current += 1;
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

  /** The grounded local answers: no network, a beat of thought first. */
  const askLocal = (intent: KeeperIntent, label: string, extra?: Extra) => {
    if (!facts) return;
    if (intent === "hour_hop") {
      const hop = answerLocally("hour_hop", facts).action?.hour;
      if (hop) hopTo(hop);
      return;
    }
    turn.current += 1;
    const mine = turn.current;
    setTalk({ question: label, answer: null });
    setExchange("thinking");
    later(() => {
      if (turn.current !== mine) return;
      const local = answerLocally(intent, facts);
      speak(label, local.text, local.action?.hour, extra);
    }, THINK_MS);
  };

  const speak = (question: string | null, answer: string, hop?: SolarHour, extra?: Extra) => {
    setTalk({ question, answer, hop, ...extra });
    setExchange("speaking");
    const mine = turn.current;
    later(() => {
      if (turn.current === mine) setExchange("none");
    }, speakingDurationMs(answer));
  };

  /** A topic already read this visit is answered from the notebook log, instantly. */
  const answerFromLog = (topic: string, question: string): boolean => {
    const entry = entries.find((e) => foldName(e.topic) === foldName(topic));
    if (!entry) return false;
    tell(question, entry.text, undefined, { basis: "knowledge", topic: entry.topic });
    return true;
  };

  const ask = async (question: string) => {
    if (!facts) return;
    turn.current += 1;
    const mine = turn.current;
    if (!askEnabled) {
      speak(question, VOICE.askOff);
      return;
    }
    // "A few facts" about the topic already on the sheet grows that answer in
    // place: the portrait and the caveat stay, no second echo, no filler line.
    const held = talkRef.current;
    const growing = Boolean(
      held?.answer && held.topic && /\b(facts?|trivia)\b/i.test(question) && foldName(question).includes(foldName(held.topic)),
    );
    if (!growing) setTalk({ question, answer: null });
    setExchange("thinking");
    const { reply, status } = await askKeeperDetailed(question, facts);
    if (turn.current !== mine) return;
    setOffline(status === "offline");
    setLimited(status === "limited");
    if (status === "offline") {
      speak(question, VOICE.offlineLine);
      return;
    }
    if (reply) {
      if (growing && held && reply.facts?.length) {
        setTalk({ ...held, facts: reply.facts, pageUrl: reply.pageUrl ?? held.pageUrl, image: held.image ?? reply.image });
        setExchange("speaking");
        later(() => {
          if (turn.current === mine) setExchange("none");
        }, speakingDurationMs(reply.facts.join(" ")));
        return;
      }
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
    if (growing && held) {
      // The article could not be reached: the answer stays as it was.
      setTalk(held);
      setExchange("none");
      return;
    }
    const intent = ruleClassify(question);
    const local = answerLocally(intent, facts);
    speak(question, local.text, local.action?.hour);
  };

  return { talk, ask, askLocal, answerFromLog, tell, hopTo, interrupt, offline, limited };
}
