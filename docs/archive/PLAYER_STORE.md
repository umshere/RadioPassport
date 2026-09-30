# Player Store Notes

The shared audio state lives in `app/state/playerStore.ts` and is backed by the lightweight Zustand wrapper in `~/utils/zustand-lite`.
It keeps playback alive while users jump between Local and World routes.

## Core state
- `audioElement`: bound once so the store can drive the `<audio>` tag from anywhere.
- `nowPlaying` / `queue` / `currentStationIndex`: ordered list of the active playlist plus the pointer into it.
- `crossfadeMs`: latest scene-supplied crossfade duration (rounded to whole milliseconds).
- `isPlaying` / `audioLevel` / `shuffleMode`: UI affordances that survive route changes.

## Key actions
- `applySceneDescriptor(descriptor)`: replaces the queue with `descriptor.stations`, stores the crossfade hint, and returns the first
  station when the play strategy is `autoplay_first`.
- `startStation(station, { autoPlay, preserveQueue })`: loads a station into the audio element, optionally reorders the queue, and
  starts playback.
- `playPause`, `stop`, `enqueueStations`, `clearQueue`, `setAudioElement`, etc. expose the imperative controls to hooks/components.

## Persistence
The store is wrapped in `persist` with `localStorage` as the backing storage when available. During SSR/tests the helpers no-op,
so the same code path is safe on both the server and the client. Only the minimal playback fields are persisted to keep
serialized payloads small.
