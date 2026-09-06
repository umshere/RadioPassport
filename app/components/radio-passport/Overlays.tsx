import { useEffect, useRef, useState } from "react";
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
import { SignalWordmark } from "./SignalMark";
import { CountryFlag } from "~/components/CountryFlag";
import { StationRow, stationLocation } from "./StationRow";
import { describeAtlasEmpty } from "./productFlow";
import { useShelfProbe } from "~/hooks/useShelfProbe";
import { applyLiveCatalog } from "~/utils/stationMeta";

function Overlay({
  children,
  close,
  label,
  hideClose,
}: {
  children: React.ReactNode;
  close: () => void;
  label: string;
  /** Atlas is a tab destination now — the tabs dismiss it, so it needs no ×. */
  hideClose?: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(close);
  closeRef.current = close;
  if (!triggerRef.current && typeof document !== "undefined") {
    triggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  }
  useEffect(() => {
    if (!triggerRef.current && document.activeElement instanceof HTMLElement) {
      triggerRef.current = document.activeElement;
    }
    const focusTimer = window.setTimeout(() => {
      const dialog = dialogRef.current;
      const first = dialog?.querySelector<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      (first ?? dialog)?.focus();
    }, 0);
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", key);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", key);
      triggerRef.current?.focus();
    };
  }, []);
  const trapFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const focusable = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => !element.hasAttribute("hidden"));
    if (!focusable.length) {
      event.preventDefault();
      event.currentTarget.focus();
      return;
    }
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  return (
    <div
      className="rp-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div
        ref={dialogRef}
        className="rp-overlay-inner"
        tabIndex={-1}
        onKeyDown={trapFocus}
      >
        {children}
        {!hideClose ? (
          <button
            type="button"
            className="rp-close"
            onClick={close}
            aria-label={`Close ${label}`}
          >
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function AtlasOverlay({
  countries,
  stations,
  query,
  setQuery,
  close,
  openCountry,
}: {
  countries: Country[];
  stations: Station[];
  query: string;
  setQuery: (value: string) => void;
  close: () => void;
  openCountry: (country: string) => void;
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
    <Overlay close={close} label="Atlas" hideClose>
      <header className="rp-overlay-head">
        <div>
          <h2>Atlas</h2>
          <p className="rp-eyebrow">
            {countries.length} COUNTRIES · LIVE CATALOG
          </p>
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
              <button
                type="button"
                key={action.id}
                className="rp-text-button mt-3"
                onClick={() => setQuery("")}
              >
                {action.label} →
              </button>
            ))}
          </div>
        ) : null}
        {regions.map((region) => (
          <section key={region}>
            <p className="rp-eyebrow text-foil">{region}</p>
            <div className="rp-country-grid">
              {visible
                .filter(
                  (country) =>
                    (getContinent(country.iso_3166_1) || "Other") === region
                )
                .map((country) => (
                  <button
                    type="button"
                    key={country.name}
                    onClick={() => openCountry(country.name)}
                    className={`rp-country ${country.stationcount ? "" : "is-unavailable"
                      }`}
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
                    <span className="min-w-0 flex-1 text-left">
                      <strong className="block truncate">{country.name}</strong>
                      <small className="block truncate text-muted">
                        {languagesByCountry.get(country.name) ||
                          "Language unavailable"}
                      </small>
                    </span>
                    <span className="rp-telemetry">
                      {country.stationcount.toLocaleString()}
                    </span>
                  </button>
                ))}
            </div>
          </section>
        ))}
      </div>
    </Overlay>
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
    <Overlay close={close} label={`${country} stations`} hideClose>
      <button type="button" className="rp-text-button" onClick={onBack}>
        ← Atlas
      </button>
      <header className="mt-6">
        <h2>
          {countryFlagIso ? (
            <CountryFlag
              iso={countryFlagIso}
              size={30}
              title={country}
              className="mr-2"
            />
          ) : null}
          {country}
        </h2>
        <p className="rp-eyebrow">
          {drilldown?.status === "loading" || languageStatus === "loading"
            ? "LOADING LIVE STATIONS"
            : `${liveStations.length.toLocaleString()} LIVE`}
          {languageFilter ? ` · ${languageFilter.toUpperCase()}` : ""}{" "}
          · {languages.join(" · ") || "LANGUAGE UNAVAILABLE"}
        </p>
      </header>
      {drilldown?.status === "loading" ? (
        <p className="mt-8 text-sm text-muted" role="status">
          Loading the live catalog for {country}…
        </p>
      ) : drilldown?.status === "error" ? (
        <div className="mt-8" role="alert">
          <p className="text-sm text-muted">{drilldown.message}</p>
          <button
            type="button"
            className="rp-text-button mt-2"
            onClick={onRetry}
          >
            Retry live catalog →
          </button>
        </div>
      ) : stations.length === 0 ? (
        <p className="mt-8 text-sm text-muted" role="status">
          No currently playable stations are available for this country.
        </p>
      ) : (
        <>
          {languages.length > 1 && (
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rp-eyebrow self-center">LANGUAGE</span>
              {languages.map((language) => (
                <button
                  type="button"
                  className={`rp-chip ${languageFilter === language ? "active" : ""
                    }`}
                  onClick={() =>
                    setLanguageFilter((current) =>
                      current === language ? null : language
                    )
                  }
                  key={language}
                >
                  {language}
                </button>
              ))}
            </div>
          )}
          <div className="mt-8 space-y-7">
            {Array.from(grouped.entries())
              .slice(0, maxGroups)
              .map(([city, list], index) => (
                <section key={city}>
                  <p className="rp-eyebrow text-foil">
                    {index === 0 &&
                      !languageFilter &&
                      liveStations.length > 24
                      ? "TOP PICKS · "
                      : ""}
                    {city.toUpperCase()}
                  </p>
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
    </Overlay>
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
}) {
  const countries = new Set(stamps.map((stamp) => stamp.country));
  const languages = new Set(
    stamps.map((stamp) => stamp.language).filter(Boolean)
  );
  return (
    <Overlay close={close} label="Your Passport">
      <header className="flex items-center gap-4">
        <SignalWordmark compact />
        <div>
          <h2>Your Passport</h2>
          <p className="rp-eyebrow">
            TRAVELER Nº {travelerNumber || "000 001"} · MEMBER SINCE{" "}
            {new Date(memberSince)
              .toLocaleDateString(undefined, {
                month: "short",
                year: "numeric",
              })
              .toUpperCase()}
          </p>
        </div>
      </header>
      <div className="ew-book">
        <div>
          <div className="rp-stats">
            <Stat value={stamps.length} label="PLACES STAMPED" />
            <Stat value={countries.size} label="COUNTRIES" />
            <Stat value={playedCount} label="SIGNALS PLAYED" />
            <Stat value={languages.size} label="LANGUAGES HEARD" />
          </div>
          {favorites.length > 0 ? (
            <div className="mt-6">
              <p className="rp-eyebrow text-foil">KEPT SIGNALS</p>
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
          <p className="rp-eyebrow text-foil">STAMPS</p>
          <div className="rp-stamp-grid">
            {stamps.map((stamp, index) => (
              <button
                type="button"
                className="rp-stamp rp-stamp-ticket text-left"
                style={{ transform: `rotate(${index % 2 ? 1.5 : -1.5}deg)` }}
                key={stamp.id}
                onClick={() => onReplay?.(stamp)}
              >
                <span className="rp-stamp-main">
                  <p className="rp-eyebrow text-foil">
                    {stamp.countryCode || "--"} · {stamp.country}
                  </p>
                  <h3>{stamp.city}</h3>
                  <p>{stamp.stationName}</p>
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
            ))}
            {Array.from({ length: Math.max(0, 6 - stamps.length) }).map(
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
        </div>
      </div>
      <p className="mt-6 rp-telemetry text-dust">
        Stay with a station for 60 seconds to ink the first page.
      </p>
      {stamps.length === 0 && onFindCity ? (
        <button
          type="button"
          className="rp-text-button mt-3"
          onClick={onFindCity}
        >
          Find a city →
        </button>
      ) : null}
    </Overlay>
  );
}
function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rp-stat">
      <strong>{value}</strong>
      <span className="rp-eyebrow">{label}</span>
    </div>
  );
}
