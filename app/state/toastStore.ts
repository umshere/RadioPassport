import { create } from "~/utils/zustand-lite";

export type ToastKind = "info" | "success" | "warning" | "error";

export type Toast = {
  id: string;
  kind: ToastKind;
  message: string;
  createdAt: number;
  durationMs: number;
};

type ToastState = {
  toasts: Toast[];
  pushToast: (input: { kind?: ToastKind; message: string; durationMs?: number }) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
};

const DEFAULT_DURATION_MS = 3500;
const MAX_TOASTS = 3;

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  pushToast: ({ kind = "info", message, durationMs = DEFAULT_DURATION_MS }) => {
    const id = makeId();
    const createdAt = Date.now();
    const toast: Toast = {
      id,
      kind,
      message,
      createdAt,
      durationMs: Math.max(500, Math.round(durationMs)),
    };

    set((state) => ({
      toasts: [toast, ...state.toasts].slice(0, MAX_TOASTS),
    }));

    if (typeof window !== "undefined") {
      window.setTimeout(() => {
        get().removeToast(id);
      }, toast.durationMs);
    }

    return id;
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),
}));
