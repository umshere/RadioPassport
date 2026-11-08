import { describe, expect, it } from "vitest";
import { createStationRequestOwner } from "~/hooks/useStationRequest";

describe("station request ownership", () => {
  it("aborts a superseded request and ignores its completion", () => {
    const owner = createStationRequestOwner();
    const previous = owner.begin();
    const current = owner.begin();

    expect(previous.signal.aborted).toBe(true);
    expect(previous.finish()).toBe(false);
    expect(current.signal.aborted).toBe(false);
    expect(current.finish()).toBe(true);
    expect(current.finish()).toBe(false);
  });

  it("invalidates a request when the listener takes another action", () => {
    const owner = createStationRequestOwner();
    const request = owner.begin();

    expect(owner.cancel()).toBe(true);
    expect(request.signal.aborted).toBe(true);
    expect(request.finish()).toBe(false);
    expect(owner.cancel()).toBe(false);
    expect(owner.begin().finish()).toBe(true);
  });
});
