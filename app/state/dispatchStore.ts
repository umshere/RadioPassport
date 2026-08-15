import { create } from "~/utils/zustand-lite";
import type { DispatchRequest, DispatchResponse, PlaceDispatch } from "~/types/ai";

type DispatchState = {
  status: "idle" | "loading" | "ready" | "error";
  dispatch: PlaceDispatch | null;
  stationId: string | null;
  error: string | null;
  byKey: Record<string, PlaceDispatch>;
  requestDispatch: (request: DispatchRequest) => void;
  dropIfNotStation: (stationId: string | null) => void;
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

/** A caption only belongs to the station that requested it. */
export function liveDispatch(
  dispatch: PlaceDispatch | null | undefined,
  stationId: string | null | undefined,
  ownedStationId?: string | null,
): PlaceDispatch | null {
  if (!dispatch || !stationId) return null;
  if (ownedStationId != null && ownedStationId !== stationId) return null;
  if (ownedStationId === stationId) return dispatch;
  return dispatch.id === stationId || dispatch.id.startsWith(`${stationId}|`)
    ? dispatch
    : null;
}

export function dispatchAfterStationChange(
  ownedStationId: string | null,
  nextStationId: string | null,
  dispatch: PlaceDispatch | null,
): {
  stationId: string | null;
  dispatch: PlaceDispatch | null;
  status: "idle" | "ready";
} {
  if (!nextStationId) {
    return { stationId: null, dispatch: null, status: "idle" };
  }
  if (ownedStationId === nextStationId) {
    return {
      stationId: nextStationId,
      dispatch,
      status: dispatch ? "ready" : "idle",
    };
  }
  return { stationId: nextStationId, dispatch: null, status: "idle" };
}

export const useDispatchStore = create<DispatchState>((set, get) => ({
  status: "idle",
  dispatch: null,
  stationId: null,
  error: null,
  byKey: {},
  reset: () => {
    pending?.abort();
    pending = null;
    lastKey = "";
    set({ status: "idle", dispatch: null, stationId: null, error: null });
  },
  dropIfNotStation: (stationId) => {
    const next = dispatchAfterStationChange(
      get().stationId,
      stationId,
      get().dispatch,
    );
    if (next.stationId === get().stationId && next.dispatch === get().dispatch) {
      return;
    }
    if (next.dispatch === null) {
      pending?.abort();
      pending = null;
      lastKey = "";
    }
    set({
      status: next.status,
      dispatch: next.dispatch,
      stationId: next.stationId,
      error: null,
    });
  },
  requestDispatch: (request) => {
    const key = cacheKey(request);
    const cached = get().byKey[key];
    if (cached) {
      lastKey = key;
      set({
        status: "ready",
        dispatch: cached,
        stationId: request.stationId,
        error: null,
      });
      return;
    }
    if (lastKey === key && get().status === "loading") return;
    pending?.abort();
    const controller = new AbortController();
    pending = controller;
    const keep = lastKey === key ? get().dispatch : null;
    lastKey = key;
    set({
      status: "loading",
      error: null,
      stationId: request.stationId,
      dispatch: keep,
    });
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
          set({
            status: "error",
            error: "empty",
            dispatch: null,
            stationId: request.stationId,
          });
          return;
        }
        set((state) => ({
          status: "ready",
          dispatch,
          stationId: request.stationId,
          error: null,
          byKey: { ...state.byKey, [key]: dispatch },
        }));
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if ((error as Error).name === "AbortError") return;
        set({
          status: "error",
          error: "failed",
          dispatch: null,
          stationId: request.stationId,
        });
      });
  },
}));
