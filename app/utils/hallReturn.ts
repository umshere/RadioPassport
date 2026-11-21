export type HallReturnContext = {
  search: string;
  country: string | null;
  language: string | null;
  scrollTop: number;
  overlayScrollTop: number;
};


export function captureHallReturnContext(): HallReturnContext {
  if (typeof window === "undefined") {
    return { search: "", country: null, language: null, scrollTop: 0, overlayScrollTop: 0 };
  }
  const page = document.querySelector<HTMLElement>(".ew-home");
  const overlay = document.querySelector<HTMLElement>(".rp-overlay");
  const context: HallReturnContext = {
    search: window.location.search,
    country: overlay?.dataset.hallCountry ?? null,
    language: overlay?.dataset.hallLanguage ?? null,
    scrollTop: page?.scrollTop ?? window.scrollY,
    overlayScrollTop: overlay?.scrollTop ?? 0,
  };
  const historyState = window.history.state as { usr?: Record<string, unknown> } | null;
  window.history.replaceState(
    { ...(historyState ?? {}), usr: { ...(historyState?.usr ?? {}), hallReturn: context } },
    "",
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
  );
  return context;
}

export function hallReturnToDesk() {
  return { to: "/listen", state: { hallReturn: captureHallReturnContext() } };
}

export function hallReturnFromState(state: unknown): HallReturnContext | null {
  if (!state || typeof state !== "object") return null;
  const value = state as { hallReturn?: HallReturnContext; usr?: { hallReturn?: HallReturnContext } };
  const context = value.hallReturn ?? value.usr?.hallReturn;
  return context && typeof context.search === "string" ? context : null;
}

export function hallReturnLink(state: unknown) {
  const context = hallReturnFromState(state);
  return context ? { pathname: "/", search: context.search } : "/";
}

export function hallReturnLabel(state: unknown) {
  const context = hallReturnFromState(state);
  const place = context?.language || context?.country;
  return place ? `Back to ${place} stations` : "Back to the Hall";
}
