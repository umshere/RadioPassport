/**
 * The roaming keeper: on wider screens he walks between places on the page
 * (anchors), stands on top of a card, changes pose by what he is doing and
 * says a line in a bubble beside him. Everything here is pure, so the tests
 * hold the rules: where he stands for an anchor, which way he faces, and the
 * state machine for walk, arrive, say, poke and wander.
 *
 * Any element can be an anchor: `data-keeper-anchor="onair"` (or the
 * `keeperAnchor("onair")` props helper). Pages steer him through the keeper
 * store: `goTo("onair", { pose: "listening", line })`.
 */

/** Sprites the roaming body may wear. Scene sprites with dark ragged
 *  backgrounds (chill, control, explore) never walk around the page. */
export const ROAM_POSES = ["idle", "listening", "speaking", "searching", "found", "travel"] as const;
export type RoamPose = (typeof ROAM_POSES)[number];

export function roamSpriteUrl(pose: RoamPose): string {
  return `/keeper/${pose}.webp`;
}

export const KEEPER_ANCHOR_ATTR = "data-keeper-anchor";
/** Spread onto any element: `<section {...keeperAnchor("onair")}>`. */
export function keeperAnchor(name: string): { "data-keeper-anchor": string } {
  return { [KEEPER_ANCHOR_ATTR]: name } as { "data-keeper-anchor": string };
}

/** Below this width the keeper stays the edge-hugging float. */
export const ROAM_MIN_WIDTH = 960;
export const ROAM_SIZE = 104;
export const ROAM_BUBBLE_WIDTH = 288;
/** Before the first measure: taller than the longest welcome, so placement errs safe. */
export const ROAM_BUBBLE_FALLBACK = 200;
/** The bubble's bottom sits this far above his feet (the CSS says 24px inside a 104px figure). */
export const ROAM_BUBBLE_BOTTOM = 80;
/** The CSS transform transition is 1.1s; arrive a beat after it lands. */
export const ROAM_WALK_MS = 1150;
export const ROAM_HOP_MS = 1100;
/** Quiet this long at one spot and he may wander to the next. */
export const ROAM_WANDER_IDLE_MS = 9000;
/** How much of his feet sink into the card he stands on. */
const FOOT_SINK = 6;
const GUTTER = 8;
const BUBBLE_GAP = 4;

export type Rect = { left: number; top: number; width: number; height: number };
export type Viewport = {
  width: number;
  height: number;
  /** px from the viewport top that belong to the header. */
  ceiling: number;
  /** px from the viewport bottom that belong to the dock / band. */
  floor: number;
};

export type RoamSpot = {
  /** Top-left of the figure, in stage coordinates. */
  x: number;
  y: number;
  /** The bubble sits on his left (he is near the right edge). */
  flip: boolean;
  /** He hangs under the anchor (no room above it), not on top. */
  below: boolean;
  /** The bubble has flipped to sit below him, clear of the header. */
  bubbleBelow: boolean;
};

export type RoamPlacementInput = {
  anchor: Rect;
  /** The box he walks in (the document), in viewport coordinates. */
  stage: Rect;
  viewport: Viewport;
  size?: number;
  bubbleWidth?: number;
  bubbleHeight?: number;
  /** Force the below variant (e.g. a badge in the header). */
  below?: boolean;
};

/**
 * Where he stands for an anchor. On top of the card, near its right end, so
 * the card's own heading stays readable. With no room above (an anchor up
 * against the header): under it if it is short, inside its top corner if it
 * is tall. Clamped inside the stage; the bubble flips to his left when it
 * would run off the right edge.
 */
export function roamSpot(input: RoamPlacementInput): RoamSpot {
  const size = input.size ?? ROAM_SIZE;
  const bubble = input.bubbleWidth ?? ROAM_BUBBLE_WIDTH;
  const bubbleHeight = input.bubbleHeight ?? ROAM_BUBBLE_FALLBACK;
  const { anchor, stage, viewport } = input;
  const roomAbove = anchor.top - viewport.ceiling;
  const cramped = roomAbove < size - FOOT_SINK;
  // Short things (a badge, a row of chips) take him under them; a tall card
  // against the header has him standing inside its top corner instead, so
  // he never ends up below the fold or behind the dock.
  const short = anchor.height < size * 1.5;
  const below = input.below ?? (cramped && short);
  const inside = !below && cramped;

  let x = Math.max(anchor.left, anchor.left + anchor.width - size - 24) - stage.left;
  let y: number;
  if (below) {
    x = anchor.left + anchor.width / 2 - size / 2 - stage.left;
    y = anchor.top + anchor.height + BUBBLE_GAP - stage.top;
  } else if (inside) {
    y = anchor.top + GUTTER - stage.top;
  } else {
    y = anchor.top - size + FOOT_SINK - stage.top;
  }
  const right = Math.min(stage.width, viewport.width - stage.left) - size - GUTTER;
  x = Math.round(Math.max(GUTTER - stage.left, Math.min(x, right)));
  // Never let his feet slide under the sticky header, even when the anchor has.
  y = Math.round(Math.max(viewport.ceiling + GUTTER - stage.top, y));
  const visibleRight = Math.min(viewport.width, stage.left + stage.width);
  const flip = stage.left + x + size + BUBBLE_GAP + bubble + GUTTER > visibleRight;
  // The bubble hangs above him. If its top would cross the header, flip it
  // below (the .ew-roam[data-bubble-below] layout) rather than cropping it.
  const overhang = Math.max(0, bubbleHeight - ROAM_BUBBLE_BOTTOM);
  const bubbleBelow = !below && y + stage.top - overhang < viewport.ceiling + GUTTER;
  return { x, y, flip, below, bubbleBelow };
}

/** He faces the way he walks; standing still keeps his last facing. */
export function roamFacing(fromX: number, toX: number, current: 1 | -1): 1 | -1 {
  if (Math.abs(toX - fromX) < 2) return current;
  return toX < fromX ? -1 : 1;
}

/** An anchor counts as in view when its top edge is between header and dock. */
export function anchorInView(anchor: Rect, viewport: Viewport): boolean {
  if (anchor.width <= 0 || anchor.height <= 0) return false;
  const top = viewport.ceiling;
  const bottom = viewport.height - viewport.floor;
  return anchor.top + Math.min(anchor.height, 48) > top && anchor.top < bottom - 24;
}

/* ---- The state machine ------------------------------------------------- */

export type RoamAction = {
  label: string;
  /** In-app link. */
  href?: string;
  onSelect?: () => void;
};

export type RoamSource = "notebook" | "station";

export type RoamLine = {
  pose?: RoamPose;
  /** No line: he just stands there in the pose, bubble closed. */
  line?: string;
  sub?: string | null;
  /** Where the sub line (or the line) came from: kept visibly distinct. */
  source?: RoamSource | null;
  actions?: RoamAction[];
};

export type RoamBubble = {
  line: string;
  sub: string | null;
  source: RoamSource | null;
  actions: RoamAction[];
  /** Read out to a screen reader. Lines he says unasked (wandering) are not. */
  announce: boolean;
};

export type RoamStop = RoamLine & { anchor: string };

export type RoamState = {
  anchor: string | null;
  phase: "resting" | "walking";
  pose: RoamPose;
  bubble: RoamBubble | null;
  /** What he says (and how he stands) once he arrives. */
  pending: { pose: RoamPose; bubble: RoamBubble | null } | null;
  hopping: boolean;
  pokes: number;
  wanderIndex: number;
  /** Last time something happened (ms); wander waits on it. */
  activeAt: number;
};

export const INITIAL_ROAM: RoamState = {
  anchor: null,
  phase: "resting",
  pose: "idle",
  bubble: null,
  pending: null,
  hopping: false,
  pokes: 0,
  wanderIndex: 0,
  activeAt: 0,
};

export type RoamEvent =
  | { type: "goTo"; anchor: string; say?: RoamLine; instant?: boolean; at: number }
  | { type: "arrive"; at: number }
  | { type: "say"; say: RoamLine; at: number }
  | { type: "quiet"; at: number }
  | { type: "poke"; say: RoamLine; at: number }
  | { type: "hopDone" }
  | { type: "wander"; stops: RoamStop[]; inView: (anchor: string) => boolean; at: number }
  | { type: "leave" };

export function toBubble(say: RoamLine | undefined, announce = true): RoamBubble | null {
  if (!say?.line?.trim()) return null;
  return {
    line: say.line,
    sub: say.sub?.trim() ? say.sub : null,
    source: say.source ?? null,
    actions: (say.actions ?? []).slice(0, 2),
    announce,
  };
}

function speak(state: RoamState, say: RoamLine, at: number): RoamState {
  const bubble = toBubble(say);
  const pose = say.pose ?? (bubble ? "speaking" : "idle");
  if (state.phase === "walking") return { ...state, pending: { pose, bubble }, activeAt: at };
  return { ...state, pose, bubble, activeAt: at };
}

export function roamReducer(state: RoamState, event: RoamEvent): RoamState {
  switch (event.type) {
    case "goTo": {
      const here = state.anchor === event.anchor && state.phase === "resting";
      if (here || event.instant) {
        const moved = { ...state, anchor: event.anchor, phase: "resting" as const, pending: null };
        return event.say ? speak(moved, event.say, event.at) : { ...moved, activeAt: event.at };
      }
      const bubble = toBubble(event.say);
      return {
        ...state,
        anchor: event.anchor,
        phase: "walking",
        pose: "travel",
        bubble: null,
        pending: event.say ? { pose: event.say.pose ?? (bubble ? "speaking" : "idle"), bubble } : null,
        activeAt: event.at,
      };
    }
    case "arrive": {
      if (state.phase !== "walking") return state;
      return {
        ...state,
        phase: "resting",
        pose: state.pending?.pose ?? "idle",
        bubble: state.pending?.bubble ?? null,
        pending: null,
        activeAt: event.at,
      };
    }
    case "say":
      return speak(state, event.say, event.at);
    case "quiet":
      if (state.phase === "walking") return { ...state, pending: null, activeAt: event.at };
      return { ...state, bubble: null, pose: "idle", activeAt: event.at };
    case "poke": {
      // A poke mid-walk is a hop; the walk and its line carry on.
      if (state.phase === "walking") return { ...state, hopping: true };
      return {
        ...speak({ ...state, pokes: state.pokes + 1 }, { pose: "found", ...event.say }, event.at),
        hopping: true,
      };
    }
    case "hopDone":
      return state.hopping ? { ...state, hopping: false } : state;
    case "wander": {
      const stop = nextWanderStop(state, event.stops, event.inView);
      if (!stop) return state;
      const next = roamReducer(state, { type: "goTo", anchor: stop.stop.anchor, say: stop.stop, at: event.at });
      // An idle wander line is scenery: shown, not read out.
      const quietly = (bubble: RoamBubble | null) => (bubble ? { ...bubble, announce: false } : null);
      return {
        ...next,
        bubble: quietly(next.bubble),
        pending: next.pending ? { ...next.pending, bubble: quietly(next.pending.bubble) } : null,
        wanderIndex: stop.index + 1,
      };
    }
    case "leave":
      return { ...INITIAL_ROAM, pokes: state.pokes, wanderIndex: state.wanderIndex };
    default:
      return state;
  }
}

/** The next stop in turn that is in view and not where he already stands. */
export function nextWanderStop(
  state: RoamState,
  stops: RoamStop[],
  inView: (anchor: string) => boolean,
): { stop: RoamStop; index: number } | null {
  for (let step = 0; step < stops.length; step += 1) {
    const index = (state.wanderIndex + step) % stops.length;
    const stop = stops[index]!;
    if (stop.anchor === state.anchor) continue;
    if (!inView(stop.anchor)) continue;
    return { stop, index };
  }
  return null;
}

/** Wander only from rest, after a quiet spell, and never while hopping. */
export function wanderDue(state: RoamState, now: number, idleMs = ROAM_WANDER_IDLE_MS): boolean {
  if (state.phase !== "resting" || state.hopping) return false;
  // A bubble offering a choice waits for the listener.
  if (state.bubble && state.bubble.actions.length > 0) return false;
  return now - state.activeAt >= idleMs;
}
