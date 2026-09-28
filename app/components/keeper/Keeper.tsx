import { FlipBoard } from "~/components/radio-passport/FlipBoard";
import { Button } from "~/components/ui/Button";
import {
  keeperPlate,
  keeperStateLabel,
  type KeeperMood,
  type KeeperState,
} from "./keeperState";

/** float: the free-floating 64px figure; sheet: the 88px figure heading the sheet. */
export type KeeperSize = "float" | "sheet";

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
      <KeeperFigure />
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

/** The SVG itself. 64-unit box so it holds its lines from 40px to 120px. */
export function KeeperFigure() {
  return (
    <svg
      className="ew-keeper-svg"
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      {/* Thought lamps: three square bulbs that light in turn. */}
      <g className="ew-keeper-think">
        <rect x="44" y="11" width="2.5" height="2.5" />
        <rect x="48.5" y="7.5" width="2.5" height="2.5" />
        <rect x="53" y="4" width="2.5" height="2.5" />
      </g>
      <g className="ew-keeper-figure">
        <path className="ew-keeper-coat" d="M14.5 58 L19 41.5 H45 L49.5 58 Z" />
        <path className="ew-keeper-collar" d="M26.5 41.5 L32 47.5 L37.5 41.5" />
        <g className="ew-keeper-head">
          <circle className="ew-keeper-seal" cx="32" cy="27" r="12" />
          <circle className="ew-keeper-seal-ring" cx="32" cy="27" r="9.25" />
          <path className="ew-keeper-band" d="M19 25.5 A13 13 0 0 1 45 25.5" />
          <rect className="ew-keeper-cup" x="16.5" y="23" width="4" height="7.5" />
          <rect className="ew-keeper-cup" x="43.5" y="23" width="4" height="7.5" />
          <g className="ew-keeper-eyes">
            <rect className="ew-keeper-eye" x="27" y="24.5" width="2.4" height="3.4" />
            <rect className="ew-keeper-eye" x="34.6" y="24.5" width="2.4" height="3.4" />
          </g>
          <path className="ew-keeper-smile" d="M26.4 27 q1.8 -1.8 3.6 0 M34 27 q1.8 -1.8 3.6 0" />
          <rect className="ew-keeper-mouth" x="30.25" y="31.5" width="3.5" height="1.2" />
        </g>
      </g>
      <path className="ew-keeper-mic" d="M41 58 V52.5" />
      <rect className="ew-keeper-mic-head" x="39.5" y="49" width="3" height="3.5" />
      <path className="ew-keeper-desk" d="M6 58.5 H58" />
    </svg>
  );
}
