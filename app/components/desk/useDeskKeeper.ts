import { useEffect, useMemo, useRef } from "react";
import { useKeeperStore } from "~/state/keeperStore";
import { useKeeperRoamStops } from "~/components/keeper/KeeperRoam";
import { ROAM_WALK_MS } from "~/components/keeper/keeperRoamModel";
import { VOICE } from "~/components/keeper/keeperVoice";
import {
  DESK_ANCHORS,
  deskExchangeMove,
  deskGreeting,
  deskRoamStops,
  stampJustLanded,
  type DeskExchange,
  type DeskKeeperInput,
} from "./deskKeeper";

/**
 * The desk hosts the roaming keeper (wider screens; phones keep the edge
 * float): he greets you on the place card, sits with the music on On air,
 * walks to Ask when you ask, runs to the passport badge and hops when the
 * stamp lands, and wanders between the cards when nothing is happening. All
 * through the keeper store's roam API; nothing here touches playback.
 */
export function useDeskKeeper(
  input: (DeskKeeperInput & { stationId: string; playing: boolean; hasNote: boolean; hasShelf: boolean }) | null,
) {
  const goTo = useKeeperStore((state) => state.goTo);
  const roamSay = useKeeperStore((state) => state.roamSay);
  const poke = useKeeperStore((state) => state.poke);

  const stops = useMemo(
    () => (input ? deskRoamStops(input) : null),
    // The parts the lines are made of.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input?.place, input?.clock, input?.stationName, input?.playing, input?.hasNote, input?.hasShelf, Boolean(input)],
  );
  useKeeperRoamStops(stops);

  // Landing (a new station, or the desk opening on one): he is on the place
  // card at once, saying where you are.
  const latest = useRef(input);
  latest.current = input;
  const stationId = input?.stationId ?? null;
  useEffect(() => {
    const held = latest.current;
    if (!stationId || !held) return;
    goTo(DESK_ANCHORS.place, { ...deskGreeting(held), instant: true });
  }, [goTo, stationId]);

  // Pressing play again takes him back to sit with the music.
  const playing = input?.playing ?? false;
  const wasPlaying = useRef(playing);
  useEffect(() => {
    if (playing && !wasPlaying.current) goTo(DESK_ANCHORS.onair, { pose: "listening" });
    wasPlaying.current = playing;
  }, [goTo, playing]);

  // The Ask card's exchange moves him (the sheet has its own figure).
  useEffect(() => {
    let previous: DeskExchange = useKeeperStore.getState().exchange;
    return useKeeperStore.subscribe(() => {
      const state = useKeeperStore.getState();
      const next = state.exchange;
      if (next === previous) return;
      const move = state.sheetOpen ? null : deskExchangeMove(previous, next);
      previous = next;
      if (!move) return;
      if (move.kind === "goTo") goTo(move.anchor, { pose: move.pose });
      else roamSay({ pose: move.pose });
    });
  }, [goTo, roamSay]);

  // The stamp lands while you watch: he runs to the passport badge and hops.
  const stamped = input?.stamped ?? null;
  const wasStamped = useRef<{ station: string | null; stamped: boolean | null }>({ station: null, stamped: null });
  useEffect(() => {
    const before = wasStamped.current;
    wasStamped.current = { station: stationId, stamped };
    if (!stationId || before.station !== stationId || !stampJustLanded(before.stamped, Boolean(stamped))) return;
    const place = latest.current?.place ?? "";
    const line = VOICE.stamped(place);
    goTo(DESK_ANCHORS.passport, { pose: "found", line });
    const timer = window.setTimeout(() => poke({ pose: "found", line }), ROAM_WALK_MS + 60);
    return () => window.clearTimeout(timer);
  }, [goTo, poke, stamped, stationId]);
}
