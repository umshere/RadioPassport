import { create } from "~/utils/zustand-lite";
import type { Station } from "~/types/radio";

type StationInsightsState = {
  station: Station | null;
  trigger: HTMLElement | null;
  open: (station: Station, trigger?: HTMLElement | null) => void;
  close: () => void;
};

/** Selection-only state: opening station details never touches the player queue. */
export const useStationInsightsStore = create<StationInsightsState>((set) => ({
  station: null,
  trigger: null,
  open: (station, trigger = null) => set({ station, trigger }),
  close: () => set({ station: null, trigger: null }),
}));
