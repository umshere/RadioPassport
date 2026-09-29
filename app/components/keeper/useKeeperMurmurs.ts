import { useEffect, useRef } from "react";
import { useKeeperStore } from "~/state/keeperStore";
import { usePlayerStore } from "~/state/playerStore";
import { readKeeperFact } from "./keeperFactClient";
import {
  labelFor,
  localMurmur,
  MURMUR_EVERY_MS,
  MURMUR_FIRST_MS,
  MURMUR_MAX_PER_STATION,
  MURMUR_SHOW_MS,
  planMurmurs,
  type MurmurStep,
} from "./keeperMurmur";
import type { KeeperView } from "./useKeeper";

/**
 * The keeper does something now and then. While a station plays and nobody is
 * talking to it: a beat of "reading" (the searching pose), then a line beside
 * it — an hour, a place, a language, a genre, the artist on air — spoken
 * unasked and gone in ten seconds. Local lines first (instant, always true),
 * then grounded facts from the server. It stops when the sheet opens, when the
 * tab is hidden, when the listener asks it to be quiet, or after eight lines.
 */
export function useKeeperMurmurs(view: KeeperView, askEnabled: boolean) {
  const stationId = usePlayerStore((state) => state.nowPlaying?.uuid ?? null);
  const hushed = useKeeperStore((state) => state.hushed);
  const factsRef = useRef(view.facts);
  factsRef.current = view.facts;
  const plan = useRef<{
    stationId: string | null;
    steps: MurmurStep[];
    at: number;
    count: number;
    since: number;
    artist: string | null;
  }>({ stationId: null, steps: [], at: 0, count: 0, since: 0, artist: null });
  const seq = useRef(0);
  const active = view.present && !view.sheetOpen && !hushed && Boolean(stationId);

  useEffect(() => {
    const store = useKeeperStore.getState();
    if (!active || !stationId) {
      store.setMurmur(null);
      return;
    }
    if (plan.current.stationId !== stationId) {
      const facts = factsRef.current;
      plan.current = {
        stationId,
        steps: facts ? planMurmurs(facts) : [],
        at: 0,
        count: 0,
        since: Date.now(),
        artist: null,
      };
    }
    let cancelled = false;
    let timer: number | undefined;
    let hide: number | undefined;

    const pick = (): MurmurStep | null => {
      const facts = factsRef.current;
      const state = plan.current;
      const artist = facts?.track?.artist ?? null;
      if (artist && askEnabled && state.artist !== artist) {
        state.artist = artist;
        return { type: "fact", kind: "artist", name: artist };
      }
      while (state.at < state.steps.length) {
        const step = state.steps[state.at++]!;
        if (step.type === "fact" && !askEnabled) continue;
        return step;
      }
      return null;
    };

    const say = (topic: string, text: string) => {
      seq.current += 1;
      const id = seq.current;
      useKeeperStore.getState().setMurmur({ id, topic, text });
      plan.current.count += 1;
      hide = window.setTimeout(() => {
        if (useKeeperStore.getState().murmur?.id === id) useKeeperStore.getState().setMurmur(null);
      }, MURMUR_SHOW_MS);
    };

    const tick = async () => {
      if (cancelled) return;
      const facts = factsRef.current;
      if (document.hidden || !facts || useKeeperStore.getState().murmur) {
        timer = window.setTimeout(tick, 6000);
        return;
      }
      if (plan.current.count >= MURMUR_MAX_PER_STATION) return;
      // Two tries: a step with nothing to say (or a fact that never came)
      // must not leave the keeper silent for another half minute.
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const step = pick();
        if (!step) return;
        let text: string | null = null;
        if (step.type === "local") {
          text = localMurmur(step, facts, {
            listenerHour: new Date().getHours(),
            minutesHere: Math.round((Date.now() - plan.current.since) / 60000),
          });
        } else {
          text = await readKeeperFact(stationId, step.kind, step.name);
        }
        if (cancelled) return;
        if (text) {
          say(labelFor(step, facts), text);
          break;
        }
      }
      timer = window.setTimeout(tick, MURMUR_EVERY_MS + Math.round(Math.random() * 8000));
    };

    timer = window.setTimeout(tick, plan.current.count === 0 ? MURMUR_FIRST_MS : MURMUR_EVERY_MS);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      if (hide) window.clearTimeout(hide);
      useKeeperStore.getState().setMurmur(null);
    };
  }, [active, askEnabled, stationId]);
}
