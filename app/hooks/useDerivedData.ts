import { useMemo } from "react";
import { getContinent } from "~/utils/geography";
import type { Country } from "~/types/radio";

/**
 * Computes all derived data for the index route
 */
export function useDerivedData(
  countries: Country[],
  topCountries: Country[],
  searchQuery: string,
  activeContinent: string | null
) {
  const totalStations = useMemo(
    () => countries.reduce((sum, c) => sum + c.stationcount, 0),
    [countries]
  );

  const continentData = useMemo(
    () =>
      countries.reduce((acc, country) => {
        const continent = getContinent(country.iso_3166_1);
        if (!acc[continent]) acc[continent] = [];
        acc[continent].push(country);
        return acc;
      }, {} as Record<string, Country[]>),
    [countries]
  );

  const continents = useMemo(
    () => Object.keys(continentData).sort(),
    [continentData]
  );

  const filteredCountries = useMemo(
    () =>
      searchQuery
        ? countries
            .filter((country) =>
              country?.name?.toLowerCase()?.includes(searchQuery.toLowerCase())
            )
            .sort((a, b) => b.stationcount - a.stationcount)
            .slice(0, 100)
        : topCountries,
    [searchQuery, countries, topCountries]
  );

  const countriesByContinent = useMemo(
    () =>
      filteredCountries.reduce((acc, country) => {
        const continent = getContinent(country.iso_3166_1);
        if (!acc[continent]) acc[continent] = [];
        acc[continent].push(country);
        return acc;
      }, {} as Record<string, Country[]>),
    [filteredCountries]
  );

  const continentSections = useMemo(
    () =>
      Object.entries(countriesByContinent).sort(([, a], [, b]) => {
        const totalA = a.reduce(
          (sum, country) => sum + country.stationcount,
          0
        );
        const totalB = b.reduce(
          (sum, country) => sum + country.stationcount,
          0
        );
        return totalB - totalA;
      }),
    [countriesByContinent]
  );

  const displaySections = useMemo(
    () =>
      activeContinent
        ? continentSections.filter(
            ([continent]) => continent === activeContinent
          )
        : continentSections,
    [activeContinent, continentSections]
  );

  return {
    totalStations,
    continentData,
    continents,
    filteredCountries,
    displaySections,
  };
}
