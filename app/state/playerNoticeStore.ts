import { create } from "~/utils/zustand-lite";

export type PlayerNoticeKind = "info" | "warning" | "error";

export type PlayerNotice = {
  id: string;
  kind: PlayerNoticeKind;
  message: string;
  createdAt: number;
};

type PlayerNoticeState = {
  notice: PlayerNotice | null;
  setNotice: (input: { kind?: PlayerNoticeKind; message: string; durationMs?: number }) => string;
  clearNotice: (id?: string) => void;
};

const DEFAULT_DURATION_MS = 4500;

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const usePlayerNoticeStore = create<PlayerNoticeState>((set, get) => ({
  notice: null,
  setNotice: ({ kind = "info", message, durationMs = DEFAULT_DURATION_MS }) => {
    const id = makeId();
    const createdAt = Date.now();
    set({ notice: { id, kind, message, createdAt } });

    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        get().clearNotice(id);
      }, Math.max(500, Math.round(durationMs)));
    }

    return id;
  },
  clearNotice: (id) =>
    set((state) => {
      if (!state.notice) return state;
      if (id && state.notice.id !== id) return state;
      return { notice: null };
    }),
}));

