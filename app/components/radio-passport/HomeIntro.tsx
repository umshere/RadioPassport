import type { ReactNode } from "react";
import type { Station } from "~/types/radio";
import { Button } from "~/components/ui/Button";
import {
  formatLocalLabel,
  solarHourAtLongitude,
  type SolarHour,
} from "~/utils/localTime";
import { AtmospherePin } from "./AtmospherePin";
import { HourRail } from "./HourRail";
import { stationLocation } from "./StationRow";
import {
  homeWelcomeCopy,
  resolveCoverArrival,
  sameHourPillLabel,
  theaterIntelligenceFromRoom,
} from "./productFlow";

type Props = {
  nowPlaying: Station | null;
  isPlaying: boolean;
  arrivalStation: Station | null | undefined;
  arrivalCity: string;
  arrival: ReturnType<typeof resolveCoverArrival>;
  localNow: Date | null;
  seekingCover: boolean;
  isSeeking: boolean;
  trackLine: string | null;
  coverIntel: ReturnType<typeof theaterIntelligenceFromRoom>;
  /** No stamp yet: the brand line and the hour decoder still speak. */
  firstVisit: boolean;
  hour: SolarHour | null;
  query: string;
  sameHour: Station[];
  onLand: () => void;
  onSameHour: (station: Station) => void;
  onHourTap: (item: SolarHour) => void;
  onAtlas: () => void;
  /** The board sheet rests at the foot of the intro. */
  children?: ReactNode;
};

/**
 * The left pane of the home: what is on the air, the Land button, the hour
 * rail and Atlas door, then the station board as children.
 */
export function HomeIntro({
  nowPlaying,
  isPlaying,
  arrivalStation,
  arrivalCity,
  arrival,
  localNow,
  seekingCover,
  isSeeking,
  trackLine,
  coverIntel,
  firstVisit,
  hour,
  sameHour,
  onLand,
  onSameHour,
  onHourTap,
  onAtlas,
  children,
}: Props) {
  return (
    <section className="rp-intro">
          {/* The horizon row: the room-hour pin stands on the same line as the
              local-time readout it answers, directly above the four-hour
              filter it mirrors. The pin stays mounted even when the readout
              is hidden, so the room is always reachable. */}
          <div className="rp-horizon-row">
            {localNow && !seekingCover ? (
              <p className="rp-eyebrow text-ether">
                <i className="rp-live-dot" />
                {formatLocalLabel(arrivalCity, localNow)} ·{" "}
                {solarHourAtLongitude(
                  arrivalStation && typeof arrivalStation.longitude === "number"
                    ? arrivalStation.longitude
                    : 0
                ).toUpperCase()}
              </p>
            ) : null}
            <AtmospherePin />
          </div>
          <div className="rp-intro-copy">
            {nowPlaying && trackLine && !seekingCover ? (
              <p className="ew-track ew-arrive" key={trackLine}>
                {trackLine}
              </p>
            ) : nowPlaying && !seekingCover ? (
              <p className="rp-lede">
                Live from {arrivalCity}. This station sends no track titles.
              </p>
            ) : (
              <p className="rp-lede">{homeWelcomeCopy().lede}</p>
            )}
            <div className="rp-intel-slot">
              {!seekingCover && coverIntel.dispatchBody ? (
                <p className="ew-caption">{coverIntel.dispatchBody}</p>
              ) : null}
              {!seekingCover && coverIntel.facts[0] ? (
                <p className="mt-3 max-w-[36ch] text-sm text-dust">
                  <span className="rp-eyebrow mr-2 text-foil">
                    {coverIntel.facts[0].label}
                  </span>
                  {coverIntel.facts[0].value}
                </p>
              ) : !seekingCover && coverIntel.summary ? (
                <p className="ew-caption">{coverIntel.summary}</p>
              ) : null}
            </div>
          </div>
          <div className="rp-land-slot">
            {/* First visit only: the brand line and the promise, once. After the
                first stamp the button is enough. */}
            {!isPlaying && arrivalStation && arrival.ctaKind === "land" && firstVisit ? (
              <p className="ew-hook">
                <em>You are not here.</em> Hear {arrivalCity} right now.
              </p>
            ) : null}
            {!isPlaying && arrivalStation && arrival.ctaKind !== "none" ? (
              <Button
                variant="land"
                kicker={arrival.ctaKind === "continue" ? "EW · Re-entry" : "EW · Arrival"}
                onClick={onLand}
              >
                {arrival.cta}
              </Button>
            ) : null}
          </div>
          <div className="ew-horizon">
            <HourRail
              hour={hour}
              onTap={onHourTap}
            />
            <Button variant="atlas" onClick={onAtlas}>
              <i className="ew-atlas-globe" aria-hidden="true" />
              Atlas
              <span aria-hidden="true">→</span>
            </Button>
          </div>
          {hour ? (
            <p className="mt-3 rp-eyebrow text-dust">
              Live where it is {hour.toLowerCase()}
            </p>
          ) : sameHour.length > 0 && !isSeeking ? (
            <p className="mt-3 rp-eyebrow text-dust">Also at this hour</p>
          ) : null}
          {!hour && !isSeeking && firstVisit ? (
            <p className="mt-3 rp-eyebrow text-dust">
              {homeWelcomeCopy().hourDecoder}
            </p>
          ) : null}
          {sameHour.length > 0 && !isSeeking ? (
            <div className="ew-same-hour">
              {sameHour.map((station) => {
                const pill = sameHourPillLabel(stationLocation(station));
                return (
                  <button
                    type="button"
                    key={station.uuid}
                    title={pill.spoken}
                    aria-label={pill.spoken}
                    onClick={() => onSameHour(station)}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          ) : null}
      {children}
    </section>
  );
}
