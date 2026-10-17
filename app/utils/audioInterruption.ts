type AudioInterruptionSnapshot = {
  playbackIntent: boolean;
  stationAtPause: string | null;
  stationNow: string | null;
  sourceAtPause: string;
  sourceNow: string;
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
