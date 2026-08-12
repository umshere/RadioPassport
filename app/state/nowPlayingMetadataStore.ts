import { create } from "~/utils/zustand-lite";
import type { NowPlayingState } from "~/hooks/useNowPlayingMetadata";

export const IDLE_NOW_PLAYING_METADATA: NowPlayingState = {
  status: "idle",
  track: null,
  message: null,
  lastUpdated: null,
  refreshing: false,
  sourceKey: null,
};

type NowPlayingMetadataStoreState = {
  state: NowPlayingState;
  setMetadata: (state: NowPlayingState) => void;
};

/**
 * Shared now-playing metadata published by the single dock poller.
 * Consumers (e.g. StationInsightsSheet) read only — they must not start a second poller.
 */
export const useNowPlayingMetadataStore = create<NowPlayingMetadataStoreState>(
  (set) => ({
    state: IDLE_NOW_PLAYING_METADATA,
    setMetadata: (state) => set({ state }),
  })
);
