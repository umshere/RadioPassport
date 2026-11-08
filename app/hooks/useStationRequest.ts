import { useCallback, useEffect, useState } from "react";
import { usePlayerStore } from "~/state/playerStore";

export function createStationRequestOwner() {
  let active: AbortController | null = null;

  function cancel() {
    const request = active;
    active = null;
    request?.abort();
    return request !== null;
  }

  return {
    cancel,
    begin() {
      cancel();
      const request = new AbortController();
      active = request;
      return {
        signal: request.signal,
        finish() {
          if (active !== request) return false;
          active = null;
          return true;
        },
      };
    },
  };
}

/** Only the current discovery request may update the UI or tune the player. */
export function useStationRequest<Kind extends string>() {
  const [owner] = useState(createStationRequestOwner);
  const [pending, setPending] = useState<Kind | null>(null);

  const cancel = useCallback(() => {
    if (owner.cancel()) setPending(null);
  }, [owner]);

  const begin = useCallback((kind: Kind) => {
    const request = owner.begin();
    setPending(kind);
    return {
      signal: request.signal,
      finish() {
        if (!request.finish()) return false;
        setPending(null);
        return true;
      },
    };
  }, [owner]);

  useEffect(() => {
    let previous = usePlayerStore.getState();
    const unsubscribe = usePlayerStore.subscribe(() => {
      const current = usePlayerStore.getState();
      const transportChanged =
        current.nowPlaying !== previous.nowPlaying ||
        current.isPlaying !== previous.isPlaying;
      previous = current;
      if (transportChanged) cancel();
    });
    return () => {
      unsubscribe();
      owner.cancel();
    };
  }, [cancel, owner]);

  return { pending, begin, cancel };
}
