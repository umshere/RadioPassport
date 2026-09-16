import { create } from "~/utils/zustand-lite";
import type { SolarHour } from "~/utils/localTime";

export type TrailStage = "idle" | "hour" | "atlas" | "passport" | "room";
export type AppAnswer = "yes" | "not-now" | null;
export type TrailRecord = { stage: TrailStage; stationId: string | null; hour: SolarHour | null; appAnswer: AppAnswer };
const EMPTY: TrailRecord = { stage: "idle", stationId: null, hour: null, appAnswer: null };
const STORAGE_KEY = "elsewhere-secret-trail-v1";
const STAGES: TrailStage[] = ["idle", "hour", "atlas", "passport", "room"];
const HOURS: SolarHour[] = ["Dawn", "Midday", "Dusk", "Night"];

export function parseTrail(value: string | null): TrailRecord {
  if (!value) return EMPTY;
  try {
    const saved = JSON.parse(value) as Partial<TrailRecord>;
    if (!saved || !STAGES.includes(saved.stage as TrailStage)) return EMPTY;
    const stage = saved.stage as TrailStage;
    const stationId = typeof saved.stationId === "string" ? saved.stationId : null;
    const hour = HOURS.includes(saved.hour as SolarHour) ? saved.hour as SolarHour : null;
    if (stage !== "idle" && (!stationId || !hour)) return EMPTY;
    return { stage, stationId, hour, appAnswer: saved.appAnswer === "yes" || saved.appAnswer === "not-now" ? saved.appAnswer : null };
  } catch { return EMPTY; }
}
export function trailAfterHour(record: TrailRecord, answer: SolarHour): TrailRecord { return record.stage === "hour" && answer === record.hour ? { ...record, stage: "atlas" } : record; }
export function trailAfterAtlas(record: TrailRecord): TrailRecord { return record.stage === "atlas" ? { ...record, stage: "passport" } : record; }
export function trailAfterPassport(record: TrailRecord): TrailRecord { return record.stage === "passport" ? { ...record, stage: "room" } : record; }

type TrailStore = TrailRecord & { hydrated: boolean; hydrate: () => void; begin: (stationId: string, hour: SolarHour) => void; answerHour: (answer: SolarHour) => boolean; visitAtlas: () => void; visitPassport: () => void; answerApp: (answer: Exclude<AppAnswer, null>) => void; };
function save(record: TrailRecord) { try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record)); } catch { /* private browsing may refuse storage */ } }
function recordOf(store: TrailStore): TrailRecord { return { stage: store.stage, stationId: store.stationId, hour: store.hour, appAnswer: store.appAnswer }; }

export const useSecretTrail = create<TrailStore>((set, get) => ({
  ...EMPTY, hydrated: false,
  hydrate: () => { if (get().hydrated || typeof window === "undefined") return; let saved: string | null = null; try { saved = window.localStorage.getItem(STORAGE_KEY); } catch { /* session-only trail */ } set({ ...parseTrail(saved), hydrated: true }); },
  begin: (stationId, hour) => { if (!get().hydrated || !stationId || !HOURS.includes(hour)) return; const next = { stage: "hour" as const, stationId, hour, appAnswer: null }; set(next); save(next); },
  answerHour: (answer) => { const current = recordOf(get()); const next = trailAfterHour(current, answer); if (next === current) return false; set(next); save(next); return true; },
  visitAtlas: () => { const current = recordOf(get()); const next = trailAfterAtlas(current); if (next === current) return; set(next); save(next); },
  visitPassport: () => { const current = recordOf(get()); const next = trailAfterPassport(current); if (next === current) return; set(next); save(next); },
  answerApp: (answer) => { if (get().stage !== "room") return; const next = { ...recordOf(get()), appAnswer: answer }; set(next); save(next); },
}));
