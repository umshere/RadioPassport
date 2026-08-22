import { create } from "~/utils/zustand-lite";
import type { PlaceDispatch } from "~/types/ai";
import type { Station } from "~/types/radio";

export type UpNextEntry = {
  dispatch: PlaceDispatch | null;
  shared: string[];
  fetchedAt: number;
};

const PREFETCH_TTL_MS = 10 * 60_000;

export function upNextFresh(entry: UpNextEntry | undefined, now: number) {
  return Boolean(entry && now - entry.fetchedAt < PREFETCH_TTL_MS);
}

export function sharedSignals(current: Station, next: Station): string[] {
  const out: string[] = [];
  if (
    current.language &&
    next.language &&
    current.language.toLowerCase() === next.language.toLowerCase()
  ) {
    out.push(next.language);
  }
  const currentTags = new Set((current.tagList ?? []).map((t) => t.toLowerCase()));
  for (const tag of next.tagList ?? []) {
    if (out.length >= 2) break;
    const lower = tag.toLowerCase();
    if (currentTags.has(lower) && !out.some((v) => v.toLowerCase() === lower)) {
      out.push(tag);
    }
  }
  return out;
}

type UpNextState = {
  entries: Record<string, UpNextEntry>;
  put: (id: string, entry: UpNextEntry) => void;
};

export const useUpNextStore = create<UpNextState>((set, get) => ({
  entries: {},
  put: (id, entry) => set({ entries: { ...get().entries, [id]: entry } }),
}));
