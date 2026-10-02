import type { SolarHour } from "~/utils/localTime";
import { logUsage } from "~/utils/usage";
import { create } from "~/utils/zustand-lite";

/**
 * The keeper is one character seen in several places (dock, home cover,
 * Theater). They share one sheet and one mood, so the few bits that change
 * live here. Nothing on the audio path reads this store.
 */
export type KeeperFactEntry = { topic: string; kind: string; text: string };
export type KeeperMurmur = { id: number; topic: string; text: string };

const HUSH_KEY = "elsewhere.keeper.hush";
function readHush(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(HUSH_KEY) === "1";
  } catch {
    return false;
  }
}

export type KeeperScene = "passport" | "nextstop";

/** What the sheet opens on: a line he just said (a murmur), or a question already asked. */
export type SheetEntry = { line?: { topic: string; text: string }; ask?: string };

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
  /** The station the keeper offered "more like this" for; the sheet opens on it. */
  threadFor: string | null;
  setThreadFor: (stationId: string | null) => void;
  /** Something the keeper is saying unasked (a bubble beside it). */
  murmur: KeeperMurmur | null;
  setMurmur: (murmur: KeeperMurmur | null) => void;
  /** The keeper is reading up on something (a fact is being fetched). */
  reading: boolean;
  setReading: (reading: boolean) => void;
  /** Facts the keeper has told about this station, newest last. */
  factLog: { stationId: string | null; entries: KeeperFactEntry[] };
  addFact: (stationId: string, entry: KeeperFactEntry) => void;
  /** When this station was first heard in this visit (for "aboard N min"). */
  landed: { stationId: string | null; at: number };
  land: (stationId: string | null) => void;
  /** The listener asked the keeper to keep quiet. */
  hushed: boolean;
  setHushed: (hushed: boolean) => void;
  /** Set by openSheet(entry); the counter reads it once and clears it. */
  sheetEntry: SheetEntry | null;
  takeSheetEntry: () => SheetEntry | null;
  openSheet: (entry?: SheetEntry) => void;
  closeSheet: () => void;
  setTyping: (typing: boolean) => void;
  setExchange: (exchange: KeeperStoreState["exchange"]) => void;
  /** Fire the one-shot; it clears itself after `ms`. */
  delight: (ms: number) => void;
  requestHour: (hour: SolarHour | null) => void;
};

let delightTimer: ReturnType<typeof setTimeout> | undefined;
let sceneTimer: ReturnType<typeof setTimeout> | undefined;

export const useKeeperStore = create<KeeperStoreState>((set, get) => ({
  sheetOpen: false,
  typing: false,
  exchange: "none",
  delighting: false,
  pendingHour: null,
  threadFor: null,
  setThreadFor: (threadFor) => set({ threadFor }),
  murmur: null,
  setMurmur: (murmur) => set({ murmur }),
  reading: false,
  setReading: (reading) => set({ reading }),
  factLog: { stationId: null, entries: [] },
  addFact: (stationId, entry) =>
    set((state) => {
      const held = state.factLog.stationId === stationId ? state.factLog.entries : [];
      if (held.some((e) => e.topic === entry.topic && e.kind === entry.kind)) return state;
      return { factLog: { stationId, entries: [...held, entry].slice(-12) } };
    }),
  landed: { stationId: null, at: 0 },
  land: (stationId) =>
    set((state) =>
      state.landed.stationId === stationId ? state : { landed: { stationId, at: Date.now() } },
    ),
  hushed: readHush(),
  setHushed: (hushed) => {
    try {
      window.localStorage.setItem(HUSH_KEY, hushed ? "1" : "0");
    } catch {
      // The choice lasts the visit.
    }
    set(hushed ? { hushed, murmur: null } : { hushed });
  },
  scene: null,
  showScene: (scene, ms) => {
    set({ scene });
    if (sceneTimer) clearTimeout(sceneTimer);
    sceneTimer = setTimeout(() => {
      sceneTimer = undefined;
      set({ scene: null });
    }, ms);
  },
  sheetEntry: null,
  takeSheetEntry: () => {
    const entry = get().sheetEntry;
    if (entry) set({ sheetEntry: null });
    return entry;
  },
  openSheet: (entry) => {
    logUsage("keeper_open");
    set({ sheetOpen: true, murmur: null, sheetEntry: entry ?? null });
  },
  closeSheet: () => set({ sheetOpen: false, typing: false, exchange: "none", sheetEntry: null }),
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
