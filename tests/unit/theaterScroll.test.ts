import { describe, expect, it } from "vitest";
import {
  createSkyTouchDrag,
  forwardSkyWheel,
  skyMaxScroll,
} from "~/components/radio-passport/theaterScroll";

function target(top: number, height: number, view: number) {
  return { scrollTop: top, scrollHeight: height, clientHeight: view };
}

describe("sky gesture forwarding", () => {
  it("leaves pinch-zoom and horizontal wheels alone", () => {
    const letter = target(0, 1000, 400);
    expect(forwardSkyWheel(letter, 0, 120, true)).toBe(false);
    expect(forwardSkyWheel(letter, 200, 40, false)).toBe(false);
    expect(letter.scrollTop).toBe(0);
  });

  it("scrolls the letter and clamps at both ends", () => {
    const letter = target(0, 1000, 400);
    expect(forwardSkyWheel(letter, 0, 200, false)).toBe(true);
    expect(letter.scrollTop).toBe(200);
    expect(forwardSkyWheel(letter, 0, 9000, false)).toBe(true);
    expect(letter.scrollTop).toBe(600);
    // Already at the end: nothing to take, no preventDefault.
    expect(forwardSkyWheel(letter, 0, 50, false)).toBe(false);
    expect(forwardSkyWheel(letter, 0, -9000, false)).toBe(true);
    expect(letter.scrollTop).toBe(0);
    expect(forwardSkyWheel(letter, 0, -50, false)).toBe(false);
  });

  it("ignores the sky when the letter fits", () => {
    const letter = target(0, 300, 400);
    expect(skyMaxScroll(letter)).toBe(0);
    expect(forwardSkyWheel(letter, 0, 200, false)).toBe(false);
  });

  it("lets taps through and only drags past the threshold", () => {
    const letter = target(100, 1000, 400);
    const drag = createSkyTouchDrag(letter);
    drag.start(500);
    expect(drag.move(494)).toBe(false);
    expect(letter.scrollTop).toBe(100);
    expect(drag.move(480)).toBe(true);
    expect(letter.scrollTop).toBe(100 + (500 - 480));
    drag.reset();
    expect(drag.move(300)).toBe(false);
  });

  it("clamps touch drags to the letter ends", () => {
    const letter = target(590, 1000, 400);
    const drag = createSkyTouchDrag(letter);
    drag.start(500);
    expect(drag.move(0)).toBe(true);
    expect(letter.scrollTop).toBe(600);
  });
});
