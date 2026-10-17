import { describe, expect, it } from "vitest";

import {
  shouldPauseAfterUnexpectedResume,
  shouldStopAfterAudioInterruption,
} from "~/utils/audioInterruption";

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

  it("allows a user-started play while the play promise is still settling", () => {
    expect(
      shouldPauseAfterUnexpectedResume({
        interruptionConfirmed: false,
        playbackIntent: false,
      }),
    ).toBe(false);
  });

  it("pauses an automatic resume after a confirmed interruption", () => {
    expect(
      shouldPauseAfterUnexpectedResume({
        interruptionConfirmed: true,
        playbackIntent: false,
      }),
    ).toBe(true);
    expect(
      shouldPauseAfterUnexpectedResume({
        interruptionConfirmed: true,
        playbackIntent: true,
      }),
    ).toBe(false);
  });
});
