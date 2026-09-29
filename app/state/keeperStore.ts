import type { SolarHour } from "~/utils/localTime";
import { logUsage } from "~/utils/usage";
import { create } from "~/utils/zustand-lite";

/**
 * The keeper is one character seen in several places (dock, home cover,
 * Theater). They share one sheet and one mood, so the few bits that change
 * live here. Nothing on the audio path reads this store.
 */
export type KeeperScene = "passport" | "nextstop";

type KeeperStoreState = {
  sheetOpen: boolean;
  typing: boolean;
  exchange: "none" | "thinking" | "speaking";
  /** A one-shot delight is showing. */
  delighting: boolean;
  /** A one-shot scene pose (passport on a stamp, next stop on an hour hop). */
  scene: KeeperScene | null;
  showScene: (scene: KeeperScene, ms: number) => void;
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
let sceneTimer: ReturnType<typeof setTimeout> | undefined;

export const useKeeperStore = create<KeeperStoreState>((set) => ({
  sheetOpen: false,
  typing: false,
  exchange: "none",
  delighting: false,
  pendingHour: null,
  scene: null,
  showScene: (scene, ms) => {
    set({ scene });
    if (sceneTimer) clearTimeout(sceneTimer);
    sceneTimer = setTimeout(() => {
      sceneTimer = undefined;
      set({ scene: null });
    }, ms);
  },
  openSheet: () => {
    logUsage("keeper_open");
    set({ sheetOpen: true });
  },
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
