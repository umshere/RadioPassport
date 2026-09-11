import { create } from "~/utils/zustand-lite";

export type PlayerNoticeKind = "info" | "warning" | "error";

/**
 * The one toast channel. Single slot, latest wins: stream errors from the
 * audio engine and INKED stamps from JourneyBridge file through here, and
 * one surface (ToastChannel) renders them. Producers pass copy + an optional
 * passport tap; timing lives here, not in callers.
 */
export type PlayerNotice = {
  id: string;
  kind: PlayerNoticeKind;
  message: string;
  createdAt: number;
  /** Eyebrow over the message (e.g. INKED). Absent for plain notices. */
  title?: string;
  /** Second line under the message (e.g. station · country). */
  detail?: string;
  /** Third line, italic (e.g. the stamp dispatch headline). */
  footnote?: string;
  /** Tap behavior. Only "passport" opens the book. */
  action?: "passport";
};

type PlayerNoticeState = {
  notice: PlayerNotice | null;
  setNotice: (input: {
    kind?: PlayerNoticeKind;
    message: string;
    title?: string;
    detail?: string;
    footnote?: string;
    action?: "passport";
    durationMs?: number;
  }) => string;
  clearNotice: (id?: string) => void;
};

const DEFAULT_DURATION_MS = 4500;

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const usePlayerNoticeStore = create<PlayerNoticeState>((set, get) => ({
  notice: null,
  setNotice: ({
    kind = "info",
    message,
    title,
    detail,
    footnote,
    action,
    durationMs = DEFAULT_DURATION_MS,
  }) => {
    const id = makeId();
    const createdAt = Date.now();
    set({ notice: { id, kind, message, createdAt, title, detail, footnote, action } });

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

