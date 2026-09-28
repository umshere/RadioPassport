import type { Station } from "~/types/radio";
import type { PassportStamp } from "~/state/journeyStore";
import type { useHomeOverlays } from "~/hooks/home/useHomeOverlays";
import {
  findCityFromPassport,
  resolveStampReplay,
} from "./productFlow";
import { playFromCountryNextState } from "./searchState";
import { AtlasOverlay, CountryOverlay, PassportOverlay } from "./Overlays";
import { TrailWhisper } from "./TrailWhisper";


type Props = {
  overlays: ReturnType<typeof useHomeOverlays>;
  countries: React.ComponentProps<typeof AtlasOverlay>["countries"];
  stations: Station[];
  catalog: Station[];
  favorites: string[];
  favoriteStations: Station[];
  stamps: PassportStamp[];
  playedCount: number;
  memberSince: React.ComponentProps<typeof PassportOverlay>["memberSince"];
  travelerNumber: React.ComponentProps<typeof PassportOverlay>["travelerNumber"];
  selectedPool: Station[];
  play: (
    station: Station,
    pool?: Station[],
    label?: string,
    home?: ReturnType<typeof playFromCountryNextState>
  ) => void;
  toggleFavorite: (id: string, station?: Station) => void;
};

/** Atlas, country drilldown and Passport: the layers above the home. */
export function HomeOverlays({
  overlays,
  countries,
  stations,
  catalog,
  favorites,
  favoriteStations,
  stamps,
  playedCount,
  memberSince,
  travelerNumber,
  selectedPool,
  play,
  toggleFavorite,
}: Props) {
  const {
    atlas,
    setAtlas,
    atlasQuery,
    setAtlasQuery,
    country,
    setCountry,
    countryDrilldown,
    countryStations,
    loadCountry,
    chooseCountry,
    passport,
    setPassport,
  } = overlays;
  const openBook = () => {
    setAtlas(false);
    setCountry(null);
    setPassport(true);
  };
  return (
    <>
      {atlas && (
        <AtlasOverlay
          countries={countries}
          stations={stations}
          query={atlasQuery}
          setQuery={setAtlasQuery}
          close={() => setAtlas(false)}
          openCountry={chooseCountry}
          trailFootnote={<TrailWhisper onOpenBook={openBook} />}
        />
      )}
      {country && (
        <CountryOverlay
          country={country}
          stations={countryStations}
          drilldown={countryDrilldown}
          onRetry={() => void loadCountry(country, true)}
          favorites={favorites}
          onBack={() => {
            setCountry(null);
            setAtlas(true);
          }}
          close={() => setCountry(null)}
          onPlay={(station) => {
            play(
              station,
              countryStations,
              `Country: ${country}`,
              playFromCountryNextState(country)
            );
            setCountry(null);
          }}
          onFavorite={toggleFavorite}
        />
      )}
      {passport && (
        <PassportOverlay
          stamps={stamps}
          playedCount={playedCount}
          memberSince={memberSince}
          travelerNumber={travelerNumber}
          favorites={favoriteStations}
          close={() => setPassport(false)}
          onFindCity={() => {
            const next = findCityFromPassport();
            setPassport(next.passport);
            setAtlas(next.atlas);
          }}
          onReplay={(stamp) => {
            const resolved = resolveStampReplay(stamp, [
              ...stations,
              ...catalog,
              ...countryStations,
            ]);
            if (resolved.station) {
              play(resolved.station, selectedPool, stamp.city);
              setPassport(false);
              return;
            }
            setPassport(false);
            if (resolved.fallback === "country" && stamp.country) {
              chooseCountry(stamp.country);
              return;
            }
            setAtlas(true);
          }}
          onPlayFavorite={(station) => {
            play(station, selectedPool, "Favorites");
            setPassport(false);
          }}
          onFavorite={(station) => toggleFavorite(station.uuid, station)}
          trailFootnote={<TrailWhisper onOpenBook={openBook} />}
        />
      )}
      {!atlas && !country && !passport ? <TrailWhisper onOpenBook={openBook} /> : null}
    </>
  );
}
