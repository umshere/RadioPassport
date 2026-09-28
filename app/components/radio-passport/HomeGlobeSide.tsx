import type { ComponentProps } from "react";
import { CountryFlag } from "~/components/CountryFlag";
import type { Station } from "~/types/radio";
import { formatClock } from "~/utils/localTime";
import { FlipBoard } from "./FlipBoard";
import { GalaxyBackdrop } from "./GalaxyBackdrop";
import { ParticleGlobe } from "./ParticleGlobe";
import { TusiField } from "./TusiField";
import { globeFocusId } from "./globePlaces";

type Props = {
  places: ComponentProps<typeof ParticleGlobe>["places"];
  catalogReady: boolean;
  onSelectPlace: (id: string) => void;
  nowPlaying: Station | null;
  query: string;
  seekingCover: boolean;
  arrivalStation: Station | null | undefined;
  arrivalCity: string;
  live: boolean;
  localNow: Date | null;
  /** Meta line while a search stands in for the city. */
  seekLabel: string;
};

/** The globe and the cover line under it: the city (or the search) in split-flap. */
export function HomeGlobeSide({
  places,
  catalogReady,
  onSelectPlace,
  nowPlaying,
  query,
  seekingCover,
  arrivalStation,
  arrivalCity,
  live,
  localNow,
  seekLabel,
}: Props) {
  const coverKey = seekingCover ? "seeking" : arrivalStation?.uuid ?? arrivalCity;
  return (
    <section className="rp-globe-side">
      <GalaxyBackdrop />
      <TusiField />
      <div className="rp-globe-wrap">
        <ParticleGlobe
          places={places}
          focusId={globeFocusId(nowPlaying, query, catalogReady, places)}
          onSelect={onSelectPlace}
        />
      </div>
      <div className={`ew-cover${arrivalCity ? " ew-seam-city" : ""}`}>
        <i className="ew-cover-rule" />
        <h1 className="ew-coverline ew-arrive" key={coverKey}>
          {seekingCover ? (
            <>
              <FlipBoard text={query.trim()} />
              <span className="sr-only">{query.trim()}</span>
            </>
          ) : (
            <>
              {arrivalStation?.countryCode ? (
                <CountryFlag
                  iso={arrivalStation.countryCode}
                  em={0.72}
                  title={arrivalStation.country || arrivalCity}
                  className="ew-coverline-flag"
                />
              ) : null}
              <FlipBoard text={arrivalCity} />
              <span className="sr-only">{arrivalCity}</span>
            </>
          )}
        </h1>
        <p
          className="rp-eyebrow ew-arrive ew-arrive-2"
          key={
            seekingCover
              ? `seek-meta-${query}`
              : `cover-meta-${arrivalStation?.uuid ?? arrivalCity}`
          }
        >
          {seekingCover
            ? seekLabel
            : arrivalStation
              ? `${arrivalStation.bitrate ? `${arrivalStation.bitrate} · ` : ""}${arrivalCity.toUpperCase()} · ${live ? "LIVE" : "LAND"}`
              : "TAP A CITY TO TUNE"}
          {!seekingCover && localNow ? ` · ${formatClock(localNow)}` : ""}
        </p>
      </div>
    </section>
  );
}
