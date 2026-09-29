import { useEffect } from "react";
import { hourTapNextState } from "~/components/radio-passport/searchState";
import { hourWord, VOICE } from "~/components/keeper/keeperVoice";
import { useKeeperStore } from "~/state/keeperStore";
import type { SolarHour } from "~/utils/localTime";

/**
 * "Somewhere it's morning →" from the keeper's sheet, while already home:
 * the same hour-tap flow as the rail (a destination, not a filter), forced
 * on rather than toggled, then the board opens to show where it is.
 * Off the home page the sheet navigates to `/?hour=…` instead.
 */
export function useKeeperHourHop({
  query,
  setHour,
  setPlace,
  setQuery,
  onHop,
}: {
  query: string;
  setHour: (hour: SolarHour | null) => void;
  setPlace: (place: string | null) => void;
  setQuery: (query: string) => void;
  onHop?: () => void;
}) {
  const pendingHour = useKeeperStore((state) => state.pendingHour);
  const requestHour = useKeeperStore((state) => state.requestHour);
  useEffect(() => {
    if (!pendingHour) return;
    const next = hourTapNextState(null, pendingHour, query);
    setHour(next.hour as SolarHour | null);
    setPlace(next.place);
    if (next.query !== query) setQuery(next.query);
    requestHour(null);
    useKeeperStore.getState().showScene("nextstop", 2400);
    const hopId = Date.now();
    useKeeperStore.getState().setMurmur({ id: hopId, topic: "Next gate", text: VOICE.hop(hourWord(pendingHour)) });
    window.setTimeout(() => {
      if (useKeeperStore.getState().murmur?.id === hopId) useKeeperStore.getState().setMurmur(null);
    }, 6000);
    onHop?.();
  }, [onHop, pendingHour, query, requestHour, setHour, setPlace, setQuery]);
}
