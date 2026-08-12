import { useEffect, useMemo } from "react";
import { useJourneyStore } from "~/state/journeyStore";

export function useFavorites() {
  const ids = useJourneyStore((state) => state.favoriteStationIds);
  const hydrate = useJourneyStore((state) => state.hydrate);
  const toggleFavorite = useJourneyStore((state) => state.toggleFavorite);
  useEffect(() => hydrate(), [hydrate]);
  const favoriteStationIds = useMemo(() => new Set(ids), [ids]);

  return {
    favoriteStationIds,
    toggleFavorite,
  };
}
