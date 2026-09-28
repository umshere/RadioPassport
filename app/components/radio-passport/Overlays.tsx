import { useEffect, useState } from "react";
import { Eyebrow } from "~/components/ui/Eyebrow";
import type { Country, Station } from "~/types/radio";
import { getContinent } from "~/utils/geography";
import type { PassportStamp } from "~/state/journeyStore";
import type { CountryDrilldownState } from "./countryData";
import {
  fetchStationsByCountryLanguage,
  languageChipsFromStations,
  mergeStationLists,
  stationSpeaksLanguage,
} from "./countryData";
import { CountryFlag } from "~/components/CountryFlag";
import { FlipBoard } from "~/components/radio-passport/FlipBoard";
import { StationRow, stationLocation } from "./StationRow";
import { describeAtlasEmpty, passportGhostSlots, stampReplayLabel } from "./productFlow";
import { useShelfProbe } from "~/hooks/useShelfProbe";
import { applyLiveCatalog } from "~/utils/stationMeta";
import { Button, Chip } from "~/components/ui/Button";
import { Row, RowText } from "~/components/ui/Row";
import { Sheet } from "~/components/ui/Sheet";

export function AtlasOverlay({
  countries,
  stations,
  query,
  setQuery,
  close,
  openCountry,
  trailFootnote,
}: {
  countries: Country[];
  stations: Station[];
  query: string;
  setQuery: (value: string) => void;
  close: () => void;
  openCountry: (country: string) => void;
  trailFootnote?: React.ReactNode;
}) {
  const normalized = query.toLowerCase().trim();
  const languagesByCountry = new Map<string, string>();
  stations.forEach((station) => {
    if (
      station.country &&
      !languagesByCountry.has(station.country) &&
      station.language
    )
      languagesByCountry.set(station.country, station.language);
  });
  const visible = countries.filter(
    (country) =>
      !normalized ||
      `${country.name} ${country.iso_3166_1} ${languagesByCountry.get(country.name) ?? ""
        }`
        .toLowerCase()
        .includes(normalized)
  );
  const regions = Array.from(
    new Set(
      visible.map((country) => getContinent(country.iso_3166_1) || "Other")
    )
  );
  return (
    <Sheet close={close} label="Atlas" hideClose>
      <header className="rp-overlay-head">
        <div>
          <h2>
            <FlipBoard text="Atlas" />
            <span className="sr-only">Atlas</span>
          </h2>
          <Eyebrow>
            {countries.length} COUNTRIES · LIVE CATALOG
          </Eyebrow>
        </div>
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Country or language…"
          aria-label="Search countries or languages"
        />
      </header>
      <div className="space-y-9">
        {visible.length === 0 ? (
          <div className="mt-8" role="status">
            <p className="text-sm text-dust">{describeAtlasEmpty(query).message}</p>
            {describeAtlasEmpty(query).actions.map((action) => (
              <Button
                key={action.id}
                className="mt-3"
                onClick={() => setQuery("")}
              >
                {action.label} →
              </Button>
            ))}
          </div>
        ) : null}
        {regions.map((region) => (
          <section key={region}>
            <Eyebrow tone="foil">{region}</Eyebrow>
            <div className="rp-country-grid">
              {visible
                .filter(
                  (country) =>
                    (getContinent(country.iso_3166_1) || "Other") === region
                )
                .map((country) => (
                  <Row
                    as="button"
                    variant="tile"
                    key={country.name}
                    onClick={() => openCountry(country.name)}
                    unavailable={!country.stationcount}
                    disabled={!country.stationcount}
                  >
                    {/^[A-Za-z]{2}$/.test(country.iso_3166_1 || "") ? (
                      <CountryFlag
                        iso={country.iso_3166_1}
                        size={30}
                        title={country.name}
                        className="shrink-0"
                      />
                    ) : null}
                    <span className="rp-telemetry">
                      {country.iso_3166_1 || "--"}
                    </span>
                    <RowText
                      variant="tile"
                      title={country.name}
                      sub={
                        languagesByCountry.get(country.name) ||
                        "Language unavailable"
                      }
                    />
                    <span className="rp-telemetry">
                      {country.stationcount.toLocaleString()}
                    </span>
                  </Row>
                ))}
            </div>
          </section>
        ))}
      </div>
      {trailFootnote}
    </Sheet>
  );
}

export function CountryOverlay({
  country,
  stations,
  favorites,
  onBack,
  close,
  onPlay,
  onFavorite,
  drilldown,
  onRetry,
}: {
  country: string;
  stations: Station[];
  favorites: string[];
  onBack: () => void;
  close: () => void;
  onPlay: (station: Station) => void;
  onFavorite: (id: string, station?: Station) => void;
  drilldown: CountryDrilldownState | null;
  onRetry: () => void;
}) {
  const [languageFilter, setLanguageFilter] = useState<string | null>(null);
  const [languageStations, setLanguageStations] = useState<Station[] | null>(
    null
  );
  const [languageStatus, setLanguageStatus] = useState<
    "idle" | "loading" | "ready"
  >("idle");
  const languages = languageChipsFromStations(stations);
  useEffect(() => {
    setLanguageFilter(null);
    setLanguageStations(null);
    setLanguageStatus("idle");
  }, [country]);
  useEffect(() => {
    if (!languageFilter) {
      setLanguageStations(null);
      setLanguageStatus("idle");
      return;
    }
    const local = stations.filter((station) =>
      stationSpeaksLanguage(station, languageFilter)
    );
    let cancelled = false;
    setLanguageStatus("loading");
    void fetchStationsByCountryLanguage(country, languageFilter)
      .then((found) => {
        if (cancelled) return;
        setLanguageStations(mergeStationLists(found, local));
        setLanguageStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setLanguageStations(local);
        setLanguageStatus("ready");
      });
    return () => {
      cancelled = true;
    };
  }, [country, languageFilter, stations]);
  const visibleStations = languageFilter
    ? languageStations ??
    stations.filter((station) =>
      stationSpeaksLanguage(station, languageFilter)
    )
    : stations;
  const catalogLive = applyLiveCatalog(visibleStations);
  const liveStations = useShelfProbe(
    catalogLive,
    `${country}:${languageFilter ?? "all"}`
  );
  const grouped = new Map<string, Station[]>();
  const maxGroups = languageFilter ? Number.POSITIVE_INFINITY : 16;
  const maxPerGroup = languageFilter ? Number.POSITIVE_INFINITY : 8;
  // The flag rides the place it names — from a real ISO code, never invented.
  const countryFlagIso =
    stations
      .map((station) => station.countryCode)
      .find(
        (code): code is string =>
          Boolean(code && code.trim().length === 2)
      )
      ?.trim()
      .toUpperCase() ?? null;
  liveStations.forEach((station) => {
    const key = stationLocation(station);
    const current = grouped.get(key) || [];
    if (current.length >= maxPerGroup) return;
    grouped.set(key, [...current, station]);
  });
  return (
    <Sheet close={close} label={`${country} stations`} hideClose>
      <Button onClick={onBack}>← Atlas</Button>
      <header className="mt-6">
        <h2>
          {countryFlagIso ? (
            <CountryFlag
              iso={countryFlagIso}
              em={0.72}
              title={country}
              className="mr-2"
            />
          ) : null}
          <FlipBoard text={country} key={country} />
          <span className="sr-only">{country}</span>
        </h2>
        <Eyebrow>
          {drilldown?.status === "loading" || languageStatus === "loading"
            ? "LOADING LIVE STATIONS"
            : `${liveStations.length.toLocaleString()} LIVE`}
          {languageFilter ? ` · ${languageFilter.toUpperCase()}` : ""}{" "}
          · {languages.join(" · ") || "LANGUAGE UNAVAILABLE"}
        </Eyebrow>
      </header>
      {drilldown?.status === "loading" ? (
        <p className="mt-8 text-sm text-muted" role="status">
          Loading the live catalog for {country}…
        </p>
      ) : drilldown?.status === "error" ? (
        <div className="mt-8" role="alert">
          <p className="text-sm text-muted">{drilldown.message}</p>
          <Button className="mt-2" onClick={onRetry}>
            Retry live catalog →
          </Button>
        </div>
      ) : stations.length === 0 ? (
        <p className="mt-8 text-sm text-muted" role="status">
          No currently playable stations are available for this country.
        </p>
      ) : (
        <>
          {languages.length > 1 && (
            <div className="mt-6 flex flex-wrap gap-2">
              <Eyebrow as="span" className="self-center">LANGUAGE</Eyebrow>
              {languages.map((language) => (
                <Chip
                  selected={languageFilter === language}
                  onClick={() =>
                    setLanguageFilter((current) =>
                      current === language ? null : language
                    )
                  }
                  key={language}
                >
                  {language}
                </Chip>
              ))}
            </div>
          )}
          <div className="mt-8 space-y-7">
            {Array.from(grouped.entries())
              .slice(0, maxGroups)
              .map(([city, list], index) => (
                <section key={city}>
                  <Eyebrow tone="foil">
                    {index === 0 &&
                      !languageFilter &&
                      liveStations.length > 24
                      ? "TOP PICKS · "
                      : ""}
                    {city.toUpperCase()}
                  </Eyebrow>
                  <div className="mt-2 space-y-2">
                    {list.map((station) => (
                      <StationRow
                        key={station.uuid}
                        station={station}
                        active={false}
                        favorite={favorites.includes(station.uuid)}
                        onPlay={() => onPlay(station)}
                        onFavorite={() => onFavorite(station.uuid, station)}
                      />
                    ))}
                  </div>
                </section>
              ))}
          </div>
        </>
      )}
    </Sheet>
  );
}

export function PassportOverlay({
  stamps,
  playedCount,
  memberSince,
  travelerNumber,
  favorites = [],
  close,
  onReplay,
  onPlayFavorite,
  onFavorite,
  onFindCity,
  trailFootnote,
}: {
  stamps: PassportStamp[];
  playedCount: number;
  memberSince: number;
  travelerNumber?: string;
  favorites?: Station[];
  close: () => void;
  onReplay?: (stamp: PassportStamp) => void;
  onPlayFavorite?: (station: Station) => void;
  onFavorite?: (station: Station) => void;
  onFindCity?: () => void;
  trailFootnote?: React.ReactNode;
}) {
  const countries = new Set(stamps.map((stamp) => stamp.country));
  const languages = new Set(
    stamps.map((stamp) => stamp.language).filter(Boolean)
  );
  const ghosts = passportGhostSlots(stamps.length);
  return (
    <Sheet close={close} label="Your Passport" className="ew-passport-overlay">
      <div className="ew-passport-book">
      <header className="ew-passport-head">
        <p className="ew-passport-edition"><span />Elsewhere<span /></p>
        <div>
          <h2>Passport</h2>
          <Eyebrow>
            TRAVELER Nº {travelerNumber || "000 001"} · MEMBER SINCE{" "}
            {new Date(memberSince)
              .toLocaleDateString(undefined, {
                month: "short",
                year: "numeric",
              })
              .toUpperCase()}
          </Eyebrow>
        </div>
      </header>
      <p className="ew-passport-lede">
        {stamps.length ? "You stayed." : "Your next hour is unwritten."}
      </p>
      <div className="ew-book">
        <div>
          <div className="rp-stats" role="list" aria-label="Lands on record">
            <Stat value={stamps.length} label="PLACES STAMPED" />
            <Stat value={countries.size} label="COUNTRIES" />
            <Stat value={playedCount} label="SIGNALS PLAYED" />
            <Stat value={languages.size} label="LANGUAGES HEARD" />
          </div>
          {favorites.length > 0 ? (
            <div className="mt-6">
              <Eyebrow tone="foil">KEPT SIGNALS</Eyebrow>
              <div className="mt-3 space-y-1">
                {favorites.map((station) => (
                  <StationRow
                    key={station.uuid}
                    station={station}
                    active={false}
                    favorite
                    onPlay={() => onPlayFavorite?.(station)}
                    onFavorite={
                      onFavorite ? () => onFavorite(station) : undefined
                    }
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div>
          <Eyebrow tone="foil">
            STAMPS{stamps.length > 0 ? ` · ${stamps.length}` : ""}
          </Eyebrow>
          {stamps.length === 0 ? (
            <div className="ew-passport-empty" role="status">
              <p className="ew-passport-empty-rule">The first page is blank.</p>
              <p>
                Stay with a station for 60 seconds and the city stamps itself
                here.
              </p>
              {onFindCity ? (
                <Button className="mt-3" onClick={onFindCity}>
                  Find a city →
                </Button>
              ) : null}
            </div>
          ) : null}
            <>
              {stamps.length > 0 ? <p className="ew-passport-hint">
                Tap a stamp to land there again.
              </p> : null}
              <div className="rp-stamp-grid">
                {stamps.map((stamp, index) => {
                  const replay = stampReplayLabel(stamp);
                  return (
                    <button
                      type="button"
                      className="rp-stamp rp-stamp-ticket text-left"
                      data-ink={index % 3}
                      key={stamp.id}
                      onClick={() => onReplay?.(stamp)}
                      aria-label={replay}
                      title={replay}
                    >
                      <span className="ew-passport-postmark" aria-hidden="true">
                        <svg viewBox="0 0 140 140" fill="none">
                          <circle cx="66" cy="68" r="47" stroke="currentColor" strokeWidth="1.2" />
                          <circle cx="66" cy="68" r="40" stroke="currentColor" strokeDasharray="2 5" />
                          <circle cx="66" cy="68" r="13" fill="currentColor" opacity=".8" />
                          <path d="M8 68h116M66 10v116M20 22h92M20 114h92" stroke="currentColor" opacity=".6" />
                          <path d="M81 84c20-18 30 16 52-2M81 93c20-18 30 16 52-2M81 102c20-18 30 16 52-2" stroke="currentColor" />
                        </svg>
                        <span>{String(index + 1).padStart(2, "0")} / ELSEWHERE</span>
                      </span>
                      <span className="rp-stamp-main">
                        <Eyebrow tone="foil">
                          {stamp.countryCode || "--"} · {stamp.country}
                        </Eyebrow>
                        <h3>{stamp.city}</h3>
                        <p>{stamp.stationName}</p>
                        {stamp.language ? (
                          <p className="rp-stamp-lang">
                            {stamp.language.toUpperCase()}
                          </p>
                        ) : null}
                        <span className="rp-stamp-replay" aria-hidden="true">
                          Land again →
                        </span>
                      </span>
                      <span className="rp-stamp-stub">
                        <strong>
                          {new Date(stamp.stampedAt).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}
                        </strong>
                        <em>
                          {new Date(stamp.stampedAt)
                            .toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })
                            .toUpperCase()}
                        </em>
                        <small>{stamp.telemetry}</small>
                      </span>
                    </button>
                  );
                })}
                {Array.from({ length: ghosts }).map(
                  (_, index) =>
                    onFindCity ? (
                      <button
                        type="button"
                        className="rp-stamp rp-stamp-empty"
                        key={`empty-${index}`}
                        onClick={onFindCity}
                        aria-label="Find a city to stamp"
                      >
                        {String(stamps.length + index + 1).padStart(2, "0")}
                      </button>
                    ) : (
                      <div className="rp-stamp rp-stamp-empty" key={`empty-${index}`}>
                        {String(stamps.length + index + 1).padStart(2, "0")}
                      </div>
                    )
                )}
              </div>
              <p className="mt-6 rp-telemetry text-dust">
                Stay 60 seconds in a new city to ink the next page.
              </p>
            </>
        </div>
      </div>
      {trailFootnote}
      </div>
    </Sheet>
  );
}
function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rp-stat" role="listitem">
      <strong>{value}</strong>
      <Eyebrow as="span">{label}</Eyebrow>
    </div>
  );
}
