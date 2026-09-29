import { FlipBoard } from "~/components/radio-passport/FlipBoard";
import { Button } from "~/components/ui/Button";
import { useKeeperStore, type KeeperScene } from "~/state/keeperStore";
import {
  keeperPlate,
  keeperStateLabel,
  type KeeperMood,
  type KeeperState,
} from "./keeperState";

/** float: the free-floating 64px figure; sheet: the 88px figure heading the sheet;
 *  desk: the figure standing on the horizon of the desk page. */
export type KeeperSize = "float" | "sheet" | "desk";

type Props = {
  state: KeeperState;
  mood: KeeperMood;
  size?: KeeperSize;
  /** With a handler the figure is a button that opens the keeper's sheet. */
  onOpen?: () => void;
  expanded?: boolean;
  /** Spoken name of the button, e.g. "Ask the keeper about Radio X". */
  label?: string;
  /** id of a hint (e.g. how to move the floating keeper). */
  describedBy?: string;
  className?: string;
};

/**
 * The night clerk of the station's booth: a wax-seal head in headphones,
 * leather coat, a desk rule, a microphone and a three-cell split-flap plate
 * on the desk. Drawn in the square foil-line style; every colour is a token.
 *
 * Motion is mechanical, the departure board's language: eyes and mouth are
 * flaps that snap (stepped timing, --ew-settle), the plate churns through
 * the FlipBoard drum on every state change, sleeping settles the eye flaps
 * half-closed, delight is one quick full-flap roll. Nothing bounces.
 *
 * The figure is driven only by `data-state` / `data-mood` on the wrapper and
 * CSS in tailwind.css (`.ew-keeper…`). To swap in a Rive or Lottie file
 * later, replace <KeeperFigure/> and map the same KeeperState names to the
 * state machine inputs — callers never change.
 */
export function Keeper({
  state,
  mood,
  size = "float",
  onOpen,
  expanded,
  label,
  describedBy,
  className,
}: Props) {
  const body = (
    <span
      className="ew-keeper"
      data-state={state}
      data-mood={mood}
      data-size={size}
      role={onOpen ? undefined : "img"}
      aria-label={onOpen ? undefined : keeperStateLabel(state)}
    >
      <KeeperFigure state={state} />
      <span className="ew-keeper-plate" aria-hidden="true">
        <FlipBoard text={keeperPlate(state)} className="is-meta" />
      </span>
    </span>
  );
  if (!onOpen) {
    return className ? <span className={className}>{body}</span> : body;
  }
  return (
    <Button
      variant="keeper"
      className={className}
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-expanded={expanded ?? false}
      aria-label={label ?? "Open the keeper"}
      aria-describedby={describedBy}
      title={keeperStateLabel(state)}
    >
      {body}
    </Button>
  );
}

/**
 * The keeper's sprites: pixel-art poses cut from the character sheet, one per
 * state. The seal-headed clerk's radar face is the state — scanning while it
 * thinks, eyes shut while it listens, a waveform while it speaks.
 * `chill` (cat on the desk) is the sleeping pose; the rest of the sheet
 * (passport, atlas, flight control, explore, travel, next stop) is kept in
 * /keeper for scenes.
 */
const SPRITE: Record<KeeperState, string> = {
  idle: "idle",
  listening: "listening",
  thinking: "searching",
  speaking: "speaking",
  sleeping: "chill",
  delight: "found",
};

export function keeperSpriteUrl(state: KeeperState, scene?: KeeperScene | null) {
  return `/keeper/${scene ?? SPRITE[state]}.webp`;
}

/** A scene pose only replaces the resting poses; a question in flight wins. */
const SCENE_OVER: KeeperState[] = ["idle", "delight", "sleeping"];

/** Warm the cache so a state change never shows a blank frame. */
export function preloadKeeperSprites() {
  if (typeof Image === "undefined") return;
  for (const name of new Set([...Object.values(SPRITE), "passport", "nextstop"])) {
    const img = new Image();
    img.src = `/keeper/${name}.webp`;
  }
}

/** The sprite. `key` restarts the flap-in each time the state changes. */
export function KeeperFigure({ state }: { state: KeeperState }) {
  const sceneNow = useKeeperStore((store) => store.scene);
  const scene = sceneNow && SCENE_OVER.includes(state) ? sceneNow : null;
  return (
    <img
      key={scene ?? state}
      className="ew-keeper-sprite"
      src={keeperSpriteUrl(state, scene)}
      alt=""
      width={214}
      height={214}
      decoding="async"
      draggable={false}
    />
  );
}
