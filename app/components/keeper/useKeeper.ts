import { logUsage } from "~/utils/usage";
import { useEffect, useMemo, useRef, useState } from "react";
import { freshlyInkedStampIds } from "~/components/radio-passport/productFlow";
import { trackKey } from "~/components/radio-passport/stationInsights";
import { useHydrated } from "~/hooks/useHydrated";
import { useJourneyStore } from "~/state/journeyStore";
import { useKeeperStore } from "~/state/keeperStore";
import { usePlayerStore } from "~/state/playerStore";
import { roomForStation, useRoomStore } from "~/state/roomStore";
import { preferSecureArtworkUrl, sanitizeArtworkUrl } from "~/utils/stations";
import { stationLocation } from "~/components/radio-passport/StationRow";
import { VOICE } from "./keeperVoice";
import { findSimilar } from "./keeperSimilarClient";
import { buildKeeperFacts, type KeeperFacts } from "./keeperFacts";
import {
  deriveKeeperState,
  KEEPER_DELIGHT_MS,
  keeperMood,
  shouldDelight,
  type KeeperMood,
  type KeeperState,
} from "./keeperState";

const SPREAD_KEY = "elsewhere.keeper.spread";
/** True the first time only; a blocked store means he asks again next visit, not every stamp. */
function askToSpread(): boolean {
  try {
    if (window.localStorage.getItem(SPREAD_KEY)) return false;
    window.localStorage.setItem(SPREAD_KEY, "1");
  } catch {
    // Private mode: fine.
  }
  return true;
}

/** Re-read the clock once a minute so the hour and the mood keep time. */
function useMinute() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

export type KeeperView = {
  /** A station is on and playing: the keeper is at the desk. */
  present: boolean;
  /** A station is loaded (playing or paused). */
  hasStation: boolean;
  state: KeeperState;
  mood: KeeperMood;
  facts: KeeperFacts | null;
  sheetOpen: boolean;
  /** The Room's artwork for the title on air, else the station's own logo. */
  plate: string | null;
};

/** Read-only view of the keeper, for every place it appears. */
export function useKeeperView(): KeeperView {
  const hydrated = useHydrated();
  const nowPlaying = usePlayerStore((state) => state.nowPlaying);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const storedRoom = useRoomStore((state) => state.room);
  const sheetOpen = useKeeperStore((state) => state.sheetOpen);
  const typing = useKeeperStore((state) => state.typing);
  const exchange = useKeeperStore((state) => state.exchange);
  const delighting = useKeeperStore((state) => state.delighting);
  const reading = useKeeperStore((state) => state.reading);
  const murmuring = useKeeperStore((state) => Boolean(state.murmur));
  const now = useMinute();
  const station = hydrated ? nowPlaying : null;
  const room = roomForStation(storedRoom, station?.uuid);
  // Once the title feed has answered for this station, a re-poll (which
  // briefly reads "loading") must not flip the sheet back to "listening".
  const settledFor = useRef<string | null>(null);
  const status = room.signal.status;
  if (station && (status === "ready" || status === "empty" || status === "error")) {
    settledFor.current = station.uuid;
  }
  const titlesSettled = Boolean(station && settledFor.current === station.uuid);
  const facts = useMemo(
    () => (station ? buildKeeperFacts(station, room, now, titlesSettled) : null),
    [station, room, now, titlesSettled],
  );
  const playing = Boolean(station && hydrated && isPlaying);
  const state = deriveKeeperState({
    hasStation: Boolean(station),
    isPlaying: playing,
    sheetOpen,
    typing,
    exchange,
    localHour: facts?.hour?.localHour ?? null,
    delight: delighting,
    reading,
    murmuring,
  });
  return {
    present: playing,
    hasStation: Boolean(station),
    state,
    mood: keeperMood(facts?.hour?.solar ?? null),
    facts,
    sheetOpen,
    plate:
      sanitizeArtworkUrl(room.plate) ??
      sanitizeArtworkUrl(preferSecureArtworkUrl(station?.favicon ?? null)),
  };
}

/**
 * Side effects, mounted once (beside the sheet): a fresh ICY title or a
 * freshly inked stamp makes the keeper look up (one flap roll). Only titles
 * the stream really sent, and only stamp ids that just appeared, count.
 */
export function useKeeperDelight() {
  const nowPlaying = usePlayerStore((state) => state.nowPlaying);
  const storedRoom = useRoomStore((state) => state.room);
  const room = roomForStation(storedRoom, nowPlaying?.uuid);
  const track = room.signal.track;
  const key =
    track && (track.title || track.artist) ? trackKey(track) || null : null;
  const previous = useRef<string | null>(null);
  const stationRef = useRef<string | null>(null);
  useEffect(() => {
    const stationId = nowPlaying?.uuid ?? null;
    const sameStation = stationRef.current === stationId;
    stationRef.current = stationId;
    const before = previous.current;
    previous.current = key;
    // Nothing on mount or on a station switch — the keeper does not jump at
    // a page load. A title arriving on the station already playing is news.
    if (!sameStation || !shouldDelight(before, key)) return;
    useKeeperStore.getState().delight(KEEPER_DELIGHT_MS);
  }, [key, nowPlaying?.uuid]);

  const stamps = useJourneyStore((state) => state.stamps);
  const journeyReady = useJourneyStore((state) => state.hydrated);
  const seenStamps = useRef<string[] | null>(null);
  useEffect(() => {
    // Stamps restored from storage are history, not news.
    if (!journeyReady) return;
    const ids = stamps.map((stamp) => stamp.id);
    const seen = seenStamps.current;
    seenStamps.current = ids;
    if (!seen) return;
    if (freshlyInkedStampIds(seen, stamps).length) {
      logUsage("stamp");
      useKeeperStore.getState().delight(KEEPER_DELIGHT_MS);
      useKeeperStore.getState().showScene("passport", KEEPER_DELIGHT_MS);
      // The keeper says so, in a bubble, the moment the stamp lands.
      const here = usePlayerStore.getState().nowPlaying;
      if (here) {
        const id = Date.now();
        const store = useKeeperStore.getState();
        store.setMurmur({ id, topic: "Stamped", text: VOICE.stamped(stationLocation(here)) });
        window.setTimeout(() => {
          if (useKeeperStore.getState().murmur?.id === id) useKeeperStore.getState().setMurmur(null);
        }, 7000);
        // The second stamp earns the one ask to pass the radio on, once per browser.
        if (stamps.length === 2 && askToSpread()) {
          window.setTimeout(() => {
            const now = useKeeperStore.getState();
            if (now.hushed || now.sheetOpen || now.murmur) return;
            const askId = Date.now();
            now.setMurmur({ id: askId, topic: "Pass it on", text: VOICE.spread });
            window.setTimeout(() => {
              if (useKeeperStore.getState().murmur?.id === askId) useKeeperStore.getState().setMurmur(null);
            }, 11000);
          }, 7600);
          return;
        }
        // A beat later, one offer to keep the thread, once, unless he is hushed.
        const queue = usePlayerStore.getState().queue;
        void findSimilar(here, queue).then((found) => {
          if (!found) return;
          window.setTimeout(() => {
            const now = useKeeperStore.getState();
            if (now.hushed || now.sheetOpen || now.murmur) return;
            if (usePlayerStore.getState().nowPlaying?.uuid !== here.uuid) return;
            const offerId = Date.now();
            now.setThreadFor(here.uuid);
            now.setMurmur({ id: offerId, topic: "More like this", text: VOICE.threadOffer(found.label) });
            window.setTimeout(() => {
              if (useKeeperStore.getState().murmur?.id === offerId) useKeeperStore.getState().setMurmur(null);
            }, 9000);
          }, 7600);
        });
      }
    }
  }, [journeyReady, stamps]);
}
