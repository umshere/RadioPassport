import { describe, expect, it } from "vitest";

import { shouldStopAfterAudioInterruption } from "~/utils/audioInterruption";

describe("audio interruption recovery", () => {
  const samePlayback = {
    playbackIntent: true,
    stationAtPause: "station-a",
    stationNow: "station-a",
    sourceAtPause: "https://radio.example/live",
    sourceNow: "https://radio.example/live",
  };

  it("stops a resumed stream when the listener has not changed stations", () => {
    expect(shouldStopAfterAudioInterruption(samePlayback)).toBe(true);
  });

  it("does not override an explicit pause", () => {
    expect(
      shouldStopAfterAudioInterruption({ ...samePlayback, playbackIntent: false }),
    ).toBe(false);
  });

  it("does not stop a deliberate station or stream change", () => {
    expect(
      shouldStopAfterAudioInterruption({
        ...samePlayback,
        stationNow: "station-b",
      }),
    ).toBe(false);
    expect(
      shouldStopAfterAudioInterruption({
        ...samePlayback,
        sourceNow: "https://radio.example/alternate",
      }),
    ).toBe(false);
  });
});
