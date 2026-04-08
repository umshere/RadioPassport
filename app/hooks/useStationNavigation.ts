import { useCallback } from "react";
import type { Station } from "~/types/radio";
import { getContinent } from "~/utils/geography";

export function useStationNavigation(
  currentStationIndex: number,
  setCurrentStationIndex: (index: number) => void,
  shuffleMode: boolean,
  activeStations: Station[],
  startStation: (station: Station, options?: { autoPlay?: boolean }) => void,
  recordSkippedStation: (stationId: string) => void,
  countryMap: Map<string, { iso_3166_1: string }>,
  setSelectedContinent: (continent: string | null) => void,
  setActiveContinent: (continent: string | null) => void,
  selectedCountry: string | null,
) {
  const playNext = useCallback(() => {
    if (activeStations.length === 0) return;

    const nextIndex = shuffleMode
      ? Math.floor(Math.random() * activeStations.length)
      : (currentStationIndex + 1) % activeStations.length;

    const nextStation = activeStations[nextIndex];
    const currentStation = activeStations[currentStationIndex];
    if (nextStation) {
      if (currentStation?.uuid && currentStation.uuid !== nextStation.uuid) {
        recordSkippedStation(currentStation.uuid);
      }
      setCurrentStationIndex(nextIndex);

      const stationCountry = countryMap.get(nextStation.country);
      if (stationCountry) {
        const continent = getContinent(stationCountry.iso_3166_1);
        setSelectedContinent(continent);
        setActiveContinent(continent);
      }

      startStation(nextStation, { autoPlay: true });
    }
  }, [
    currentStationIndex,
    activeStations,
    shuffleMode,
    startStation,
    recordSkippedStation,
    countryMap,
    selectedCountry,
    setCurrentStationIndex,
    setSelectedContinent,
    setActiveContinent,
  ]);

  const playPrevious = useCallback(() => {
    if (activeStations.length === 0) return;

    const previousIndex = shuffleMode
      ? Math.floor(Math.random() * activeStations.length)
      : (currentStationIndex - 1 + activeStations.length) %
        activeStations.length;

    const previousStation = activeStations[previousIndex];
    const currentStation = activeStations[currentStationIndex];
    if (previousStation) {
      if (
        currentStation?.uuid &&
        currentStation.uuid !== previousStation.uuid
      ) {
        recordSkippedStation(currentStation.uuid);
      }
      setCurrentStationIndex(previousIndex);

      const stationCountry = countryMap.get(previousStation.country);
      if (stationCountry) {
        const continent = getContinent(stationCountry.iso_3166_1);
        setSelectedContinent(continent);
        setActiveContinent(continent);
      }

      startStation(previousStation, { autoPlay: true });
    }
  }, [
    currentStationIndex,
    activeStations,
    shuffleMode,
    startStation,
    recordSkippedStation,
    countryMap,
    selectedCountry,
    setCurrentStationIndex,
    setSelectedContinent,
    setActiveContinent,
  ]);

  return {
    playNext,
    playPrevious,
  };
}
