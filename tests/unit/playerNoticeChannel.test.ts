import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePlayerNoticeStore } from "~/state/playerNoticeStore";

beforeEach(() => {
  vi.useFakeTimers();
  // The channel schedules on window (browser-only timing); point it at the
  // faked globals so expiry runs under test.
  (globalThis as Record<string, unknown>).window ??= globalThis;
  usePlayerNoticeStore.getState().clearNotice();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("toast channel", () => {
  it("files a notice and returns its id", () => {
    const id = usePlayerNoticeStore
      .getState()
      .setNotice({ message: "Signal lost" });
    const notice = usePlayerNoticeStore.getState().notice;
    expect(notice?.id).toBe(id);
    expect(notice?.message).toBe("Signal lost");
    expect(notice?.kind).toBe("info");
  });

  it("latest wins: a stamp refile replaces the stream notice", () => {
    const first = usePlayerNoticeStore
      .getState()
      .setNotice({ kind: "warning", message: "Skipping dead air" });
    const second = usePlayerNoticeStore.getState().setNotice({
      kind: "info",
      title: "INKED",
      message: "Bagmati",
      detail: "Kantipur FM · Nepal",
      action: "passport",
    });
    expect(first).not.toBe(second);
    const notice = usePlayerNoticeStore.getState().notice;
    expect(notice?.id).toBe(second);
    expect(notice?.title).toBe("INKED");
    expect(notice?.detail).toBe("Kantipur FM · Nepal");
    expect(notice?.action).toBe("passport");
  });

  it("carries the stamp footnote for the dispatch headline", () => {
    usePlayerNoticeStore.getState().setNotice({
      title: "INKED",
      message: "Bagmati",
      footnote: "Afternoon dose of local news and music",
      action: "passport",
      durationMs: 6500,
    });
    expect(usePlayerNoticeStore.getState().notice?.footnote).toBe(
      "Afternoon dose of local news and music"
    );
  });

  it("expiry clears only its own notice", () => {
    const first = usePlayerNoticeStore
      .getState()
      .setNotice({ message: "first", durationMs: 1000 });
    const second = usePlayerNoticeStore
      .getState()
      .setNotice({ message: "second", durationMs: 5000 });
    vi.advanceTimersByTime(1500);
    // First timer fires but the slot holds the second notice — no-op.
    expect(usePlayerNoticeStore.getState().notice?.id).toBe(second);
    expect(usePlayerNoticeStore.getState().notice?.message).toBe("second");
    vi.advanceTimersByTime(4000);
    expect(usePlayerNoticeStore.getState().notice).toBeNull();
    expect(first).not.toBe(second);
  });

  it("clamps short durations to half a second", () => {
    usePlayerNoticeStore
      .getState()
      .setNotice({ message: "brief", durationMs: 10 });
    vi.advanceTimersByTime(499);
    expect(usePlayerNoticeStore.getState().notice?.message).toBe("brief");
    vi.advanceTimersByTime(1);
    expect(usePlayerNoticeStore.getState().notice).toBeNull();
  });

  it("clearNotice with no id empties the slot", () => {
    usePlayerNoticeStore.getState().setNotice({ message: "gone" });
    usePlayerNoticeStore.getState().clearNotice();
    expect(usePlayerNoticeStore.getState().notice).toBeNull();
  });
});
