import type { SolarHour } from "~/utils/localTime";
import { create } from "~/utils/zustand-lite";

/** The hour the home is showing (gate, else the sky's station). Null off the home. */
type EnvState = {
  homeHour: SolarHour | null;
  setHomeHour: (hour: SolarHour | null) => void;
};

export const useEnvStore = create<EnvState>((set) => ({
  homeHour: null,
  setHomeHour: (homeHour) => set({ homeHour }),
}));
