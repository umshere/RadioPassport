type AudioInterruptionSnapshot = {
  playbackIntent: boolean;
  stationAtPause: string | null;
  stationNow: string | null;
  sourceAtPause: string;
  sourceNow: string;
};

type UnexpectedResumeSnapshot = {
  interruptionConfirmed: boolean;
  playbackIntent: boolean;
};

/** Keep an interrupted stream paused unless the listener or station changed. */
export function shouldStopAfterAudioInterruption({
  playbackIntent,
  stationAtPause,
  stationNow,
  sourceAtPause,
  sourceNow,
}: AudioInterruptionSnapshot): boolean {
  return (
    playbackIntent &&
    stationAtPause === stationNow &&
    sourceAtPause === sourceNow
  );
}

/** Pause an automatic resume, but allow a user-started play request to settle. */
export function shouldPauseAfterUnexpectedResume({
  interruptionConfirmed,
  playbackIntent,
}: UnexpectedResumeSnapshot): boolean {
  return interruptionConfirmed && !playbackIntent;
}
