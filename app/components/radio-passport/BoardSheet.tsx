import { useRef, useState, type ReactNode } from "react";

export type BoardSheetState = "peek" | "open";

/** How much of the sheet stands above the dock when it rests at the peek. */
export const BOARD_SHEET_PEEK_PX = 84;

/**
 * The board as a sheet, phone only. Desktop keeps the board inline in the
 * intro column — the wrapper collapses to `display: contents` there and the
 * grip never renders, so the wide layout is untouched. On the phone the
 * sheet is fixed above the dock/band: peek shows the grip and the board
 * label, a drag or tap opens the full station browser over the globe.
 *
 * Snap rule, pure so the tests hold it: a flick decides by direction,
 * a slow drag decides by travel — always toward the nearest rest.
 */
export function snapBoardSheet(
  travelY: number,
  velocityY: number,
  current: BoardSheetState
): BoardSheetState {
  if (velocityY < -0.4) return "open";
  if (velocityY > 0.4) return "peek";
  if (current === "peek") return travelY < -48 ? "open" : "peek";
  return travelY > 48 ? "peek" : "open";
}

export function BoardSheet({
  state,
  onStateChange,
  docked,
  children,
}: {
  state: BoardSheetState;
  onStateChange: (next: BoardSheetState) => void;
  /** The dock stands taller than the band: the sheet rides above whichever
   *  is present so the grip never hides under the player. */
  docked: boolean;
  children: ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startY: number;
    startT: number;
    base: number;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const [dragOffset, setDragOffset] = useState<number | null>(null);

  const offsets = () => {
    const sheet = sheetRef.current;
    if (!sheet) return { open: 0, peek: 0 };
    return {
      open: 0,
      peek: Math.max(0, sheet.offsetHeight - BOARD_SHEET_PEEK_PX),
    };
  };

  const isPhone = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 960px)").matches;

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!isPhone()) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const base = state === "open" ? 0 : offsets().peek;
    dragRef.current = {
      startY: event.clientY,
      startT: performance.now(),
      base,
      moved: false,
    };
    setDragOffset(base);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const travel = event.clientY - drag.startY;
    if (Math.abs(travel) > 4) drag.moved = true;
    const { peek } = offsets();
    setDragOffset(Math.min(peek, Math.max(0, drag.base + travel)));
  };

  const endDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    setDragOffset(null);
    if (!drag.moved) return; // a tap: let click toggle
    suppressClickRef.current = true;
    const travel = event.clientY - drag.startY;
    const velocity = travel / Math.max(1, performance.now() - drag.startT);
    onStateChange(snapBoardSheet(travel, velocity, state));
  };

  const cancelDrag = () => {
    dragRef.current = null;
    setDragOffset(null);
  };

  return (
    <div
      ref={sheetRef}
      className={`rp-board-sheet${docked ? " is-docked" : ""}`}
      data-state={state}
      style={
        dragOffset !== null
          ? { transform: `translateY(${dragOffset}px)`, transition: "none" }
          : undefined
      }
    >
      <button
        type="button"
        className="rp-board-grip"
        aria-expanded={state === "open"}
        aria-label={
          state === "open" ? "Close the station board" : "Open the station board"
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={cancelDrag}
        onClick={() => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
          onStateChange(state === "open" ? "peek" : "open");
        }}
      >
        <i className="rp-board-grip-bar" aria-hidden="true" />
      </button>
      {children}
    </div>
  );
}
