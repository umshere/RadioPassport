import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  anchorInView,
  INITIAL_ROAM,
  keeperAnchor,
  nextWanderStop,
  ROAM_POSES,
  ROAM_SIZE,
  ROAM_WALK_MS,
  roamFacing,
  roamReducer,
  roamSpot,
  roamSpriteUrl,
  wanderDue,
  type RoamState,
  type RoamStop,
  type Viewport,
} from "~/components/keeper/keeperRoamModel";
import { VOICE } from "~/components/keeper/keeperVoice";
import { useKeeperStore } from "~/state/keeperStore";
import { readAppCss } from "./appCss";

const read = (path: string) => readFileSync(resolve(__dirname, "../..", path), "utf8");

const viewport: Viewport = { width: 1440, height: 900, ceiling: 64, floor: 80 };
const stage = { left: 0, top: 0, width: 1440, height: 2400 };

describe("roaming keeper: where he stands", () => {
  it("stands on top of a card near its right end", () => {
    const spot = roamSpot({ anchor: { left: 100, top: 400, width: 500, height: 200 }, stage, viewport });
    expect(spot.below).toBe(false);
    expect(spot.x).toBe(100 + 500 - ROAM_SIZE - 24);
    expect(spot.y).toBe(400 - ROAM_SIZE + 6);
    expect(spot.flip).toBe(false);
  });

  it("works in document coordinates when the page has scrolled", () => {
    const scrolled = { ...stage, top: -600 };
    const spot = roamSpot({ anchor: { left: 100, top: 400, width: 500, height: 200 }, stage: scrolled, viewport });
    expect(spot.y).toBe(1000 - ROAM_SIZE + 6);
  });

  it("flips the bubble to his left near the right edge", () => {
    const spot = roamSpot({ anchor: { left: 1000, top: 400, width: 420, height: 200 }, stage, viewport });
    expect(spot.flip).toBe(true);
  });

  it("hangs below an anchor up against the header, centred on it", () => {
    const spot = roamSpot({ anchor: { left: 1200, top: 20, width: 120, height: 36 }, stage, viewport });
    expect(spot.below).toBe(true);
    expect(spot.x).toBe(Math.round(1200 + 60 - ROAM_SIZE / 2));
    expect(spot.y).toBe(20 + 36 + 4);
  });

  it("stands inside the top corner of a tall card against the header, never under it", () => {
    const spot = roamSpot({ anchor: { left: 24, top: 76, width: 520, height: 720 }, stage, viewport });
    expect(spot.below).toBe(false);
    expect(spot.y).toBe(76 + 8);
    expect(spot.x).toBe(24 + 520 - ROAM_SIZE - 24);
  });

  it("takes the below variant on request", () => {
    expect(roamSpot({ anchor: { left: 100, top: 400, width: 300, height: 40 }, stage, viewport, below: true }).below).toBe(true);
  });

  it("is clamped inside the stage on both sides and the top", () => {
    const left = roamSpot({ anchor: { left: -400, top: 400, width: 200, height: 100 }, stage, viewport });
    expect(left.x).toBe(8);
    const right = roamSpot({ anchor: { left: 1500, top: 400, width: 200, height: 100 }, stage, viewport });
    expect(right.x).toBe(1440 - ROAM_SIZE - 8);
    const narrow = roamSpot({ anchor: { left: 40, top: 400, width: 60, height: 100 }, stage, viewport });
    expect(narrow.x).toBe(40);
  });

  it("faces the way he walks and keeps facing when standing still", () => {
    expect(roamFacing(500, 200, 1)).toBe(-1);
    expect(roamFacing(200, 500, -1)).toBe(1);
    expect(roamFacing(200, 201, -1)).toBe(-1);
  });

  it("counts an anchor in view only between the header and the dock", () => {
    expect(anchorInView({ left: 0, top: 300, width: 200, height: 200 }, viewport)).toBe(true);
    expect(anchorInView({ left: 0, top: 860, width: 200, height: 200 }, viewport)).toBe(false);
    expect(anchorInView({ left: 0, top: -400, width: 200, height: 200 }, viewport)).toBe(false);
    expect(anchorInView({ left: 0, top: 300, width: 0, height: 0 }, viewport)).toBe(false);
  });

  it("only wears the clean, cut-out sprites", () => {
    expect([...ROAM_POSES].sort()).toEqual(["found", "idle", "listening", "searching", "speaking", "travel"]);
    for (const pose of ROAM_POSES) expect(roamSpriteUrl(pose)).toBe(`/keeper/${pose}.webp`);
    expect(ROAM_POSES as readonly string[]).not.toContain("chill");
    expect(keeperAnchor("onair")).toEqual({ "data-keeper-anchor": "onair" });
  });
});

describe("roaming keeper: state transitions", () => {
  const at = 1000;

  it("walks in the travel pose with no bubble, then says the line on arrival", () => {
    const walking = roamReducer(INITIAL_ROAM, {
      type: "goTo",
      anchor: "onair",
      say: { pose: "listening", line: "I’ll sit with the music a while." },
      at,
    });
    expect(walking).toMatchObject({ anchor: "onair", phase: "walking", pose: "travel", bubble: null });
    const arrived = roamReducer(walking, { type: "arrive", at: at + ROAM_WALK_MS });
    expect(arrived.phase).toBe("resting");
    expect(arrived.pose).toBe("listening");
    expect(arrived.bubble?.line).toBe("I’ll sit with the music a while.");
    expect(arrived.pending).toBeNull();
  });

  it("does not walk to where he already stands, and goes at once when told", () => {
    const resting: RoamState = { ...INITIAL_ROAM, anchor: "onair" };
    const said = roamReducer(resting, { type: "goTo", anchor: "onair", say: { line: "Hello." }, at });
    expect(said.phase).toBe("resting");
    expect(said.pose).toBe("speaking");
    const jumped = roamReducer(resting, { type: "goTo", anchor: "next", instant: true, at });
    expect(jumped).toMatchObject({ anchor: "next", phase: "resting" });
  });

  it("holds a line said mid-walk until he arrives", () => {
    const walking = roamReducer(INITIAL_ROAM, { type: "goTo", anchor: "ask", at });
    const held = roamReducer(walking, { type: "say", say: { pose: "searching", line: "Let me look." }, at });
    expect(held.bubble).toBeNull();
    expect(roamReducer(held, { type: "arrive", at }).bubble?.line).toBe("Let me look.");
  });

  it("caps actions at two and keeps the source of the sub line", () => {
    const state = roamReducer(INITIAL_ROAM, {
      type: "say",
      say: {
        line: "Balera. A summer dance hall.",
        sub: "From my notebook.",
        source: "notebook",
        actions: [{ label: "a" }, { label: "b" }, { label: "c" }],
      },
      at,
    });
    expect(state.bubble?.actions.map((a) => a.label)).toEqual(["a", "b"]);
    expect(state.bubble?.source).toBe("notebook");
  });

  it("hops on a poke, says the line, and settles", () => {
    const resting: RoamState = { ...INITIAL_ROAM, anchor: "onair" };
    const poked = roamReducer(resting, { type: "poke", say: { line: VOICE.roamPokes[0] }, at });
    expect(poked).toMatchObject({ hopping: true, pose: "found", pokes: 1 });
    expect(poked.bubble?.line).toBe(VOICE.roamPokes[0]);
    expect(roamReducer(poked, { type: "hopDone" }).hopping).toBe(false);
    // Mid-walk: only the hop; the walk and its line carry on.
    const walking = roamReducer(resting, { type: "goTo", anchor: "next", say: { line: "Off." }, at });
    const hopped = roamReducer(walking, { type: "poke", say: { line: "x" }, at });
    expect(hopped).toMatchObject({ phase: "walking", hopping: true, pokes: 0 });
    expect(hopped.pending?.bubble?.line).toBe("Off.");
  });

  it("goes quiet without moving", () => {
    const talking = roamReducer({ ...INITIAL_ROAM, anchor: "onair" }, { type: "say", say: { line: "Hi." }, at });
    expect(roamReducer(talking, { type: "quiet", at })).toMatchObject({ bubble: null, pose: "idle", anchor: "onair" });
  });

  it("wanders to the next stop in turn that is in view, skipping where he stands", () => {
    const stops: RoamStop[] = [
      { anchor: "onair", pose: "listening", line: "a" },
      { anchor: "tags", pose: "searching", line: "b" },
      { anchor: "next", pose: "travel", line: "c" },
    ];
    const state: RoamState = { ...INITIAL_ROAM, anchor: "onair" };
    const offscreen = (anchor: string) => anchor !== "tags";
    expect(nextWanderStop(state, stops, offscreen)?.stop.anchor).toBe("next");
    const walked = roamReducer(state, { type: "wander", stops, inView: offscreen, at });
    expect(walked).toMatchObject({ anchor: "next", phase: "walking", wanderIndex: 3 });
    expect(roamReducer(state, { type: "wander", stops, inView: () => false, at })).toBe(state);
  });

  it("wanders only after a quiet spell at rest, and never away from a choice", () => {
    const state: RoamState = { ...INITIAL_ROAM, anchor: "onair", activeAt: 0 };
    expect(wanderDue(state, 5000)).toBe(false);
    expect(wanderDue(state, 9000)).toBe(true);
    expect(wanderDue({ ...state, phase: "walking" }, 20000)).toBe(false);
    expect(wanderDue({ ...state, hopping: true }, 20000)).toBe(false);
    const asking = roamReducer(state, { type: "say", say: { line: "Hop?", actions: [{ label: "Hop" }] }, at: 0 });
    expect(wanderDue(asking, 60000)).toBe(false);
  });

  it("leaves with the page, keeping only the count of pokes", () => {
    const state: RoamState = { ...INITIAL_ROAM, anchor: "onair", pokes: 3, bubble: { line: "x", sub: null, source: null, actions: [] } };
    expect(roamReducer(state, { type: "leave" })).toMatchObject({ anchor: null, bubble: null, pokes: 3 });
  });
});

describe("roaming keeper: the store API", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useKeeperStore.setState({ roam: INITIAL_ROAM, roamStops: [] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("goTo walks, then arrives on its own after the walk", () => {
    useKeeperStore.getState().goTo("onair", { pose: "listening", line: "Sitting with it." });
    expect(useKeeperStore.getState().roam.phase).toBe("walking");
    vi.advanceTimersByTime(ROAM_WALK_MS);
    const roam = useKeeperStore.getState().roam;
    expect(roam).toMatchObject({ phase: "resting", pose: "listening", anchor: "onair" });
    expect(roam.bubble?.line).toBe("Sitting with it.");
  });

  it("a second goTo mid-walk replaces the first", () => {
    const { goTo } = useKeeperStore.getState();
    goTo("onair", { line: "first" });
    vi.advanceTimersByTime(400);
    goTo("next", { line: "second" });
    vi.advanceTimersByTime(ROAM_WALK_MS - 400);
    expect(useKeeperStore.getState().roam.phase).toBe("walking");
    vi.advanceTimersByTime(400);
    expect(useKeeperStore.getState().roam).toMatchObject({ phase: "resting", anchor: "next" });
    expect(useKeeperStore.getState().roam.bubble?.line).toBe("second");
  });

  it("reduced motion: he jumps, with no walking state at all", () => {
    const seen: string[] = [];
    const stop = useKeeperStore.subscribe(() => seen.push(useKeeperStore.getState().roam.phase));
    vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });
    try {
      useKeeperStore.getState().goTo("onair", { pose: "listening", line: "Here." });
    } finally {
      vi.unstubAllGlobals();
      stop();
    }
    expect(seen).toEqual(["resting"]);
    expect(useKeeperStore.getState().roam).toMatchObject({ anchor: "onair", pose: "listening" });
  });

  it("poke clears its hop by itself", () => {
    useKeeperStore.setState({ roam: { ...INITIAL_ROAM, anchor: "onair" } });
    useKeeperStore.getState().poke({ line: "Careful." });
    expect(useKeeperStore.getState().roam.hopping).toBe(true);
    vi.advanceTimersByTime(2000);
    expect(useKeeperStore.getState().roam.hopping).toBe(false);
  });
});

describe("roaming keeper: wiring and rules", () => {
  const roam = read("app/components/keeper/KeeperRoam.tsx");
  const css = readAppCss();

  it("is desktop and tablet only; the phone keeps the edge float", () => {
    expect(roam).toContain("ROAM_MIN_WIDTH");
    expect(read("app/components/keeper/KeeperFloat.tsx")).toContain("roaming) return null");
    expect(read("app/components/keeper/KeeperHost.tsx")).toContain("<KeeperRoam");
  });

  it("pokes with a labelled button and speaks in a status region", () => {
    expect(roam).toContain('aria-label={VOICE.roamPoke}');
    expect(roam).toContain('role="status"');
  });

  it("sits under the header and the dock, and stops moving for reduced motion", () => {
    expect(css).toMatch(/\.ew-roam \{[^}]*z-index: 29/);
    expect(css).toMatch(/\.ew-roam\[data-walking\] \{ transition: transform 1\.1s/);
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{\s*\.ew-roam, \.ew-roam\[data-walking\], \.ew-roam-sprite \{ transition: none; \}/);
    expect(css).toMatch(/prefers-reduced-motion: no-preference\) \{\s*@keyframes ew-roam-bob/);
  });

  it("keeps his words in the voice file: no emoji, no exclamation", () => {
    for (const line of [...VOICE.roamPokes, ...Object.values(VOICE.roamDoing), ...Object.values(VOICE.roamDemo)]) {
      expect(line).not.toMatch(/!/);
      expect(line).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });
});
