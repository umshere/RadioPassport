import { useEffect, useMemo, useRef, useState } from "react";
import { trackKey } from "~/components/radio-passport/stationInsights";
import { useHydrated } from "~/hooks/useHydrated";
import { useKeeperStore } from "~/state/keeperStore";
import { usePlayerStore } from "~/state/playerStore";
import { roomForStation, useRoomStore } from "~/state/roomStore";
import { buildKeeperFacts, type KeeperFacts } from "./keeperFacts";
import {
  deriveKeeperState,
  KEEPER_DELIGHT_MS,
  keeperMood,
  shouldDelight,
  type KeeperMood,
  type KeeperState,
} from "./keeperState";

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
  const now = useMinute();
  const station = hydrated ? nowPlaying : null;
  const room = roomForStation(storedRoom, station?.uuid);
  const facts = useMemo(
    () => (station ? buildKeeperFacts(station, room, now) : null),
    [station, room, now],
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
  });
  return {
    present: playing,
    hasStation: Boolean(station),
    state,
    mood: keeperMood(facts?.hour?.solar ?? null),
    facts,
    sheetOpen,
  };
}

/**
 * Side effects, mounted once (beside the sheet): a fresh ICY title makes the
 * keeper look up. Only titles the stream really sent can trigger it.
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
}
