import { IconArrowRight, IconPlaneDeparture, IconPlane } from "@tabler/icons-react";
import { motion } from "framer-motion";
import type { Country, Station } from "~/types/radio";
import { CountryFlag } from "~/components/CountryFlag";

type JourneyModuleProps = {
  nowPlaying: Station | null;
  recentStations: Station[];
  topCountries: Country[];
  onStartListening: () => void;
  onQuickRetune: () => void;
  onOpenPassport?: () => void;
};

function resolveDeparture(
  nowPlaying: Station | null,
  recentStations: Station[]
): Station | null {
  if (!nowPlaying) return recentStations[0] ?? null;
  const candidate = recentStations.find((station) => station.uuid !== nowPlaying.uuid);
  return candidate ?? null;
}

function resolveNextCountry(
  nowPlaying: Station | null,
  departure: Station | null,
  topCountries: Country[]
): Country | null {
  const excluded = new Set<string>();
  if (nowPlaying?.country) excluded.add(nowPlaying.country);
  if (departure?.country) excluded.add(departure.country);
  return topCountries.find((country) => !excluded.has(country.name)) ?? topCountries[0] ?? null;
}

export function JourneyModule({
  nowPlaying,
  recentStations,
  topCountries,
  onStartListening,
  onQuickRetune,
  onOpenPassport,
}: JourneyModuleProps) {
  const departure = resolveDeparture(nowPlaying, recentStations);
  const nextCountry = resolveNextCountry(nowPlaying, departure, topCountries);
  const departureTitle = departure?.country ?? "Home Base";
  const departureSubtitle = departure?.name ?? (recentStations.length ? "Recent stamp" : "Passport log");

  if (!nowPlaying) {
    return (
      <section className="py-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--rp-muted-2)]">
              Listening flow
            </div>
            <div className="mt-2 text-xl font-semibold text-[var(--rp-text)]">
              Start listening and home begins curating the next move.
            </div>
            <div className="mt-1 text-sm text-[var(--rp-muted)]">
              Your first station turns the home feed into a useful mix of recent plays, passport history, and quick next picks.
            </div>
          </div>
          <button
            type="button"
            onClick={onStartListening}
            className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--rp-gold)] px-5 text-xs font-semibold uppercase tracking-[0.22em] text-black shadow-[0_18px_36px_rgba(245,177,45,0.35)] hover:bg-[var(--rp-gold-strong)]"
          >
            Start Listening
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="py-2">
      <div className="relative text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--rp-muted-2)]">
        Listening flow
      </div>

      <div className="relative mt-4 max-w-xl text-sm leading-6 text-[var(--rp-muted)]">
        The home feed keeps the essentials in view: what you played last, what is on now, and one strong next country to try.
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-3 sm:hidden">
        <div className="col-span-2 flex items-center gap-3 rounded-[1.3rem] border border-[rgba(245,177,45,0.2)] bg-[rgba(245,177,45,0.06)] px-3 py-3">
          <CountryFlag
            iso={nowPlaying.countryCode ?? undefined}
            title={nowPlaying.country}
            width={36}
            height={28}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--rp-gold)]">
              <IconPlaneDeparture size={12} />
              Now Playing
            </div>
            <div className="truncate text-sm font-semibold text-[var(--rp-text)]">
              {nowPlaying.country}
            </div>
            <div className="truncate text-xs text-[var(--rp-muted)]">
              {nowPlaying.name}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenPassport}
          disabled={!onOpenPassport}
          className="flex min-h-[5.5rem] items-center gap-3 rounded-[1.3rem] border border-white/8 bg-white/[0.03] px-3 py-3 text-left transition enabled:hover:bg-white/[0.05] disabled:cursor-default disabled:opacity-70"
          aria-label="Open passport history"
        >
          <CountryFlag
            iso={departure?.countryCode ?? undefined}
            title={departure?.country ?? "Home Base"}
            width={32}
            height={24}
          />
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--rp-muted-2)]">
              Passport
            </div>
            <div className="truncate text-sm font-semibold text-[var(--rp-text)]">
              {departureTitle}
            </div>
            <div className="truncate text-xs text-[var(--rp-muted)]">
              {departureSubtitle}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={onQuickRetune}
          className="flex min-h-[5.5rem] items-center gap-3 rounded-[1.3rem] border border-white/8 bg-white/[0.03] px-3 py-3 text-left transition hover:bg-white/[0.05]"
        >
          <CountryFlag
            iso={nextCountry?.iso_3166_1 ?? undefined}
            title={nextCountry?.name ?? "Next Stop"}
            width={32}
            height={24}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--rp-muted-2)]">
              Next
              <IconArrowRight size={12} />
            </div>
            <div className="truncate text-sm font-semibold text-[var(--rp-text)]">
              {nextCountry?.name ?? "Surprise me"}
            </div>
            <div className="truncate text-xs text-[var(--rp-muted)]">Quick retune</div>
          </div>
        </button>
      </div>

      <div className="relative mt-5 hidden gap-3 sm:grid sm:grid-cols-3">
        <button
          type="button"
          onClick={onOpenPassport}
          disabled={!onOpenPassport}
          className="flex w-full items-center gap-3 rounded-[1.45rem] border border-white/8 bg-white/[0.03] px-5 py-5 text-left transition enabled:hover:bg-white/[0.05] disabled:cursor-default disabled:opacity-70"
          aria-label="Open passport history"
        >
          <CountryFlag
            iso={departure?.countryCode ?? undefined}
            title={departure?.country ?? "Home Base"}
            width={36}
            height={28}
          />
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--rp-muted-2)]">
              Passport
            </div>
            <div className="truncate text-sm font-semibold text-[var(--rp-text)]">
              {departureTitle}
            </div>
            <div className="truncate text-xs text-[var(--rp-muted)]">
              {departureSubtitle}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-3 rounded-[1.45rem] border border-[rgba(245,177,45,0.18)] bg-[rgba(245,177,45,0.06)] px-5 py-5">
          <CountryFlag
            iso={nowPlaying.countryCode ?? undefined}
            title={nowPlaying.country}
            width={36}
            height={28}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--rp-gold)]">
              <IconPlaneDeparture size={12} />
              Now Playing
            </div>
            <div className="truncate text-sm font-semibold text-[var(--rp-text)]">
              {nowPlaying.country}
            </div>
            <div className="truncate text-xs text-[var(--rp-muted)]">
              {nowPlaying.name}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onQuickRetune}
          className="flex items-center gap-3 rounded-[1.45rem] border border-white/8 bg-white/[0.03] px-5 py-5 text-left transition hover:bg-white/[0.05]"
        >
          <CountryFlag
            iso={nextCountry?.iso_3166_1 ?? undefined}
            title={nextCountry?.name ?? "Next Stop"}
            width={36}
            height={28}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--rp-muted-2)]">
              Next
              <IconArrowRight size={12} />
            </div>
            <div className="truncate text-sm font-semibold text-[var(--rp-text)]">
              {nextCountry?.name ?? "Surprise me"}
            </div>
            <div className="truncate text-xs text-[var(--rp-muted)]">Quick retune</div>
          </div>
        </button>
      </div>
    </section>
  );
}
