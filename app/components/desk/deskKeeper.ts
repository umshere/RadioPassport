import type { RoamLine, RoamPose, RoamStop } from "~/components/keeper/keeperRoamModel";
import { VOICE } from "~/components/keeper/keeperVoice";

/**
 * The desk's rules for the roaming keeper, pure so the tests hold them: what
 * he says when you land, where he wanders between, and where an exchange at
 * the Ask card takes him. Every line is from the record (the station's name,
 * the clock at its longitude) or plainly his own; none names a track.
 */

/** The anchors the desk registers (data-keeper-anchor). */
export const DESK_ANCHORS = {
  place: "place",
  onair: "onair",
  plays: "plays",
  ask: "ask",
  note: "note",
  next: "next",
  /** The passport badge in the site bar. */
  passport: "passport",
} as const;

export type DeskKeeperInput = {
  place: string;
  /** The station's local clock ("03:46"), or null without coordinates. */
  clock: string | null;
  stationName: string;
  stamped: boolean;
};

/** What he says as he lands on the place card. */
export function deskGreeting(input: DeskKeeperInput): RoamLine {
  const R = VOICE.deskRoam;
  return {
    pose: "speaking",
    line: input.clock ? R.landed(input.clock, input.place) : R.landedNoHour(input.place),
    sub: input.stamped ? R.landedSubStamped(input.stationName) : R.landedSub(input.stationName),
  };
}

/**
 * Where he wanders when nothing is happening, in turn. On air comes first:
 * the first wander after landing takes him to sit with the music. Cards the
 * desk is not showing are left out.
 */
export function deskRoamStops(
  input: DeskKeeperInput & { playing: boolean; hasNote: boolean; hasShelf: boolean },
): RoamStop[] {
  const R = VOICE.deskRoam;
  const stops: RoamStop[] = [
    { anchor: DESK_ANCHORS.onair, pose: input.playing ? "listening" : "idle", line: R.onair },
    { anchor: DESK_ANCHORS.plays, pose: "searching", line: R.plays },
  ];
  if (input.hasNote) {
    stops.push({ anchor: DESK_ANCHORS.note, pose: "searching", line: R.note, sub: R.noteSub, source: "notebook" });
  }
  if (input.hasShelf) stops.push({ anchor: DESK_ANCHORS.next, pose: "travel", line: R.next });
  stops.push({
    anchor: DESK_ANCHORS.place,
    pose: "idle",
    line: input.clock ? R.placeClock(input.clock, input.place) : R.place,
  });
  stops.push({ anchor: DESK_ANCHORS.ask, pose: "speaking", line: R.ask });
  return stops;
}

export type DeskExchange = "none" | "thinking" | "speaking";

/**
 * An exchange at the Ask card moves him: thinking walks him there to look it
 * up, speaking turns him to talk. The answer itself is in the card, so his
 * bubble stays shut (no second copy). Nothing for the end of an exchange: he
 * stays a while, then wanders.
 */
export function deskExchangeMove(
  previous: DeskExchange,
  next: DeskExchange,
): { kind: "goTo"; anchor: string; pose: RoamPose } | { kind: "pose"; pose: RoamPose } | null {
  if (next === previous) return null;
  if (next === "thinking") return { kind: "goTo", anchor: DESK_ANCHORS.ask, pose: "searching" };
  if (next === "speaking") return { kind: "pose", pose: "speaking" };
  return null;
}

/** The stamp lands while you watch: true only on the change from unstamped. */
export function stampJustLanded(was: boolean | null, now: boolean): boolean {
  return was === false && now;
}
