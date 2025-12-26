import { useState, useMemo, useEffect } from "react";
import type { Country } from "~/types/radio";
import { getContinent } from "~/utils/geography";

export function useAtlasState(
  countries: Country[],
  nowPlaying: { country: string } | null,
  selectedCountry: string | null
) {
  const [activeContinent, setActiveContinent] = useState<string | null>("Asia");
  const [selectedContinent, setSelectedContinent] = useState<string | null>(
    "Asia"
  );

  const countryMap = useMemo(
    () => new Map(countries.map((country) => [country.name, country] as const)),
    [countries]
  );

  const currentContinent = selectedCountry
    ? getContinent(countryMap.get(selectedCountry)?.iso_3166_1)
    : nowPlaying
    ? getContinent(countryMap.get(nowPlaying.country)?.iso_3166_1)
    : null;

  // Sync selected continent with current context
  useEffect(() => {
    if (currentContinent && selectedContinent !== currentContinent) {
      setSelectedContinent(currentContinent);
    }
    if (selectedCountry && currentContinent && activeContinent !== currentContinent) {
      setActiveContinent(currentContinent);
    }
  }, [activeContinent, currentContinent, selectedContinent, selectedCountry]);

  return {
    activeContinent,
    selectedContinent,
    countryMap,
    setActiveContinent,
    setSelectedContinent,
  };
}
