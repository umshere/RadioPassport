import { describe, expect, it, vi } from "vitest";
import {
  createNowPlayingPoller,
  metadataForCurrentSource,
  nextNowPlayingLoadingState,
  type NowPlayingState,
} from "~/hooks/useNowPlayingMetadata";
import { shouldAnimateDock } from "~/components/PlayerDock";
import { trackKey } from "~/components/radio-passport/stationInsights";
import {
  requestTrackTrivia,
  resetTriviaRequestState,
  triviaContextKey,
  triviaForCurrentRequest,
  triviaRequestKey,
  type TriviaState,
} from "~/hooks/useTrackTrivia";

type Deferred = { resolve: () => void; promise: Promise<void> };
function deferred(): Deferred {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("now-playing polling lifecycle", () => {
  it("clears only initial/source loads and retains a ready track for same-generation refresh", () => {
    const ready: NowPlayingState = {
      status: "ready",
      track: { raw: "Artist - Track", artist: "Artist", title: "Track", source: "icy", fetchedAt: "2026-08-11T12:00:00.000Z" },
      message: null,
      lastUpdated: 1,
      refreshing: false,
      sourceKey: "station-a:https://stream.example/a",
    };
    expect(nextNowPlayingLoadingState(ready, true)).toEqual({ ...ready, refreshing: true });
    expect(nextNowPlayingLoadingState(ready, false)).toEqual({
      status: "loading", track: null, message: null, lastUpdated: null, refreshing: false,
      sourceKey: "station-a:https://stream.example/a",
    });
    expect(nextNowPlayingLoadingState({ ...ready, track: null, status: "empty" }, true)).toMatchObject({
      status: "loading", track: null, refreshing: false,
    });
  });

  it("masks ready metadata before the effect can react to a new source or inactive playback", () => {
    const ready: NowPlayingState = {
      status: "ready",
      track: { raw: "Artist - Track", artist: "Artist", title: "Track", source: "icy", fetchedAt: "2026-08-11T12:00:00.000Z" },
      message: null,
      lastUpdated: 1,
      refreshing: false,
      sourceKey: "station-a:https://stream.example/a",
    };
    expect(metadataForCurrentSource(ready, "station-a:https://stream.example/a", true)).toBe(ready);
    expect(metadataForCurrentSource(ready, "station-b:https://stream.example/b", true)).toMatchObject({
      status: "loading", track: null, sourceKey: "station-b:https://stream.example/b",
    });
    expect(metadataForCurrentSource(ready, "station-a:https://stream.example/a", false)).toMatchObject({
      status: "idle", track: null,
    });
  });

  it("animates the player dock only while playing without reduced motion", () => {
    expect(shouldAnimateDock(true, false)).toBe(true);
    expect(shouldAnimateDock(true, true)).toBe(false);
    expect(shouldAnimateDock(false, false)).toBe(false);
    expect(shouldAnimateDock(false, true)).toBe(false);
  });

  it("masks trivia until it belongs to the current source, track, and AI context", () => {
    const keyA = triviaRequestKey("free", trackKey({ artist: "Artist", title: "A" }), "");
    const keyB = triviaRequestKey("free", trackKey({ artist: "Artist", title: "B" }), "");
    const readyA: TriviaState = {
      status: "ready",
      trivia: { summary: "A", facts: [], source: "free", fetchedAt: "2026-08-11T12:00:00.000Z" },
      message: null,
      requestKey: keyA,
    };
    expect(triviaForCurrentRequest(readyA, keyA, true, true)).toBe(readyA);
    expect(triviaForCurrentRequest(readyA, keyB, true, true)).toMatchObject({ status: "loading", trivia: null, requestKey: keyB });
    expect(triviaForCurrentRequest(readyA, keyA, false, true)).toMatchObject({ status: "idle", trivia: null });
    const aiKeyA = triviaRequestKey("ai", trackKey({ artist: "Artist", title: "A" }), '{"summary":"free A","facts":[]}');
    const aiKeyB = triviaRequestKey("ai", trackKey({ artist: "Artist", title: "A" }), '{"summary":"free B","facts":[]}');
    expect(triviaForCurrentRequest({ ...readyA, requestKey: aiKeyA }, aiKeyB, true, true)).toMatchObject({ status: "loading", trivia: null });
    expect(triviaForCurrentRequest(readyA, keyB, true, true, { ...readyA, requestKey: keyB })).toMatchObject({ status: "ready", requestKey: keyB });
    expect(triviaForCurrentRequest(readyA, keyB, true, true, { ...readyA, status: "error", requestKey: keyB })).toMatchObject({ status: "loading", trivia: null });
    const collisionLeft = triviaRequestKey("ai", trackKey({ artist: "A|B", title: "C" }), "");
    const collisionRight = triviaRequestKey("ai", trackKey({ artist: "A", title: "B|C" }), "");
    expect(collisionLeft).not.toBe(collisionRight);
    // The pipeline is exactly two requests per track/context; every source
    // caches under its own track+context pair.
    const aiA = triviaRequestKey("ai", trackKey({ artist: "Artist", title: "A" }), "ctx-1");
    const aiB = triviaRequestKey("ai", trackKey({ artist: "Artist", title: "A" }), "ctx-2");
    expect(aiA).not.toBe(aiB);
    expect(aiA).not.toBe(triviaRequestKey("free", trackKey({ artist: "Artist", title: "A" }), ""));
  });

  it("carries free links through the AI request context", () => {
    const withoutLinks = triviaContextKey("ai", { summary: "S" });
    const withLinks = triviaContextKey("ai", {
      summary: "S",
      links: [{ label: "Track", url: "https://musicbrainz.org/recording/r", kind: "track" }],
    });
    expect(withoutLinks).not.toBe("");
    expect(withoutLinks).not.toContain("musicbrainz.org");
    expect(withLinks).toContain("musicbrainz.org");
    expect(triviaContextKey("free", { summary: "S" })).toBe("");
  });

  it("joins one request per track/context pair", () => {
    resetTriviaRequestState();
    const fetchMock = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    const track = {
      raw: "Raj — Tum Ho Toh",
      title: "Tum Ho Toh",
      artist: "Raj",
      source: "icy" as const,
      fetchedAt: "2026-08-15T18:00:00.000Z",
    };
    const freeFirst = requestTrackTrivia({ track, source: "free" });
    const freeSecond = requestTrackTrivia({
      track,
      source: "free",
      context: { summary: "ignored for free" },
    });
    expect(freeFirst).toBe(freeSecond);
    const filedContext = { summary: "already filed" };
    const aiFirst = requestTrackTrivia({ track, source: "ai", context: filedContext });
    const aiSecond = requestTrackTrivia({ track, source: "ai", context: { ...filedContext } });
    expect(aiFirst).toBe(aiSecond);
    // A changed dossier is a different context pair and must not join.
    const aiThird = requestTrackTrivia({
      track,
      source: "ai",
      context: { summary: "changed" },
    });
    expect(aiThird).not.toBe(aiFirst);
    // One fetch per distinct pair: free + joined AI + changed-context AI.
    expect(fetchMock).toHaveBeenCalledTimes(3);
    vi.unstubAllGlobals();
    resetTriviaRequestState();
  });

  it("does not reschedule a deferred periodic request after station cleanup", async () => {
    const scheduled: Array<() => void> = [];
    const schedule = vi.fn((callback: () => void) => {
      scheduled.push(callback);
      return scheduled.length as unknown as ReturnType<typeof window.setTimeout>;
    });
    const clear = vi.fn();
    const periodic = deferred();
    const run = vi.fn((refreshing: boolean) => refreshing ? periodic.promise : Promise.resolve());
    const oldStation = createNowPlayingPoller(run, { schedule, clear, firstDelayMs: 1, intervalMs: 2 });
    oldStation.start();
    scheduled[0]!();
    await Promise.resolve();
    oldStation.stop();
    periodic.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(schedule).toHaveBeenCalledTimes(1);
  });

  it("cannot clear or schedule into the replacement station generation", async () => {
    const scheduled: Array<() => void> = [];
    const schedule = vi.fn((callback: () => void) => {
      scheduled.push(callback);
      return scheduled.length as unknown as ReturnType<typeof window.setTimeout>;
    });
    const clear = vi.fn();
    const pending = deferred();
    const old = createNowPlayingPoller((refreshing) => refreshing ? pending.promise : Promise.resolve(), { schedule, clear });
    old.start();
    scheduled[0]!();
    old.stop();
    const replacement = createNowPlayingPoller(() => Promise.resolve(), { schedule, clear });
    replacement.start();
    pending.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(schedule).toHaveBeenCalledTimes(2);
  });
});
