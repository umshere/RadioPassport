import type { SolarHour } from "~/utils/localTime";
import { create } from "~/utils/zustand-lite";

/**
 * The keeper is one character seen in several places (dock, home cover,
 * Theater). They share one sheet and one mood, so the few bits that change
 * live here. Nothing on the audio path reads this store.
 */
type KeeperStoreState = {
  sheetOpen: boolean;
  typing: boolean;
  exchange: "none" | "thinking" | "speaking";
  /** A one-shot delight is showing. */
  delighting: boolean;
  /** An hour hop asked for from the sheet, for the home board to apply. */
  pendingHour: SolarHour | null;
  openSheet: () => void;
  closeSheet: () => void;
  setTyping: (typing: boolean) => void;
  setExchange: (exchange: KeeperStoreState["exchange"]) => void;
  /** Fire the one-shot; it clears itself after `ms`. */
  delight: (ms: number) => void;
  requestHour: (hour: SolarHour | null) => void;
};

let delightTimer: ReturnType<typeof setTimeout> | undefined;

export const useKeeperStore = create<KeeperStoreState>((set) => ({
  sheetOpen: false,
  typing: false,
  exchange: "none",
  delighting: false,
  pendingHour: null,
  openSheet: () => set({ sheetOpen: true }),
  closeSheet: () => set({ sheetOpen: false, typing: false, exchange: "none" }),
  setTyping: (typing) => set({ typing }),
  setExchange: (exchange) => set({ exchange }),
  delight: (ms) => {
    set({ delighting: true });
    if (delightTimer) clearTimeout(delightTimer);
    delightTimer = setTimeout(() => {
      delightTimer = undefined;
      set({ delighting: false });
    }, ms);
  },
  requestHour: (pendingHour) => set({ pendingHour }),
}));
