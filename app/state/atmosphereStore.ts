import { create } from "~/utils/zustand-lite";
import {
  applyAtmosphere,
  parseAtmosphere,
  persistAtmosphere,
  readStoredAtmosphere,
  type Atmosphere,
} from "~/utils/atmosphere";

type AtmosphereState = {
  atmosphere: Atmosphere;
  hydrated: boolean;
  hydrate: () => void;
  setAtmosphere: (next: Atmosphere) => void;
};

export const useAtmosphereStore = create<AtmosphereState>((set, get) => ({
  atmosphere: "night",
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    const next = readStoredAtmosphere();
    set({ atmosphere: next, hydrated: true });
    applyAtmosphere(next);
  },
  setAtmosphere: (next) => {
    const parsed = parseAtmosphere(next);
    set({ atmosphere: parsed, hydrated: true });
    persistAtmosphere(parsed);
    applyAtmosphere(parsed);
  },
}));
