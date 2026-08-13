import { create } from "~/utils/zustand-lite";
import type { DispatchRequest, DispatchResponse, PlaceDispatch } from "~/types/ai";

type DispatchState = {
  status: "idle" | "loading" | "ready" | "error";
  dispatch: PlaceDispatch | null;
  error: string | null;
  byKey: Record<string, PlaceDispatch>;
  requestDispatch: (request: DispatchRequest) => void;
  reset: () => void;
};

let pending: AbortController | null = null;
let lastKey = "";

function cacheKey(request: DispatchRequest) {
  const hour = request.localTimeISO.slice(0, 13);
  const track =
    request.track?.raw ??
    `${request.track?.artist ?? ""}|${request.track?.title ?? ""}`;
  return `${request.stationId}|${track}|${hour}`;
}

export const useDispatchStore = create<DispatchState>((set, get) => ({
  status: "idle",
  dispatch: null,
  error: null,
  byKey: {},
  reset: () => {
    pending?.abort();
    pending = null;
    lastKey = "";
    set({ status: "idle", dispatch: null, error: null });
  },
  requestDispatch: (request) => {
    const key = cacheKey(request);
    const cached = get().byKey[key];
    if (cached) {
      lastKey = key;
      set({ status: "ready", dispatch: cached, error: null });
      return;
    }
    if (lastKey === key && get().status === "loading") return;
    pending?.abort();
    const controller = new AbortController();
    pending = controller;
    lastKey = key;
    set({ status: "loading", error: null });
    void fetch("/api/ai/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Dispatch failed");
        return (await response.json()) as DispatchResponse;
      })
      .then((payload) => {
        if (controller.signal.aborted) return;
        const dispatch = payload.dispatch;
        if (!dispatch) {
          set({ status: "error", error: "empty", dispatch: null });
          return;
        }
        set((state) => ({
          status: "ready",
          dispatch,
          error: null,
          byKey: { ...state.byKey, [key]: dispatch },
        }));
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if ((error as Error).name === "AbortError") return;
        set({ status: "error", error: "failed", dispatch: null });
      });
  },
}));
