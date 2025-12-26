import { IconArrowRight, IconPlaneDeparture, IconSparkles } from "@tabler/icons-react";
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

  if (!nowPlaying) {
    return (
      <section className="rounded-3xl border border-white/10 bg-[var(--rp-card)] px-6 py-5 shadow-[0_18px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--rp-muted-2)]">
              Journey
            </div>
            <div className="mt-2 text-lg font-semibold text-[var(--rp-text)]">
              Start your journey to stamp your first destination.
            </div>
            <div className="mt-1 text-sm text-[var(--rp-muted)]">
              Tune in and we will track your departure and arrival.
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
    <section className="relative rounded-3xl border border-white/10 bg-[var(--rp-card)] px-5 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--rp-muted-2)]">
          Journey
        </div>
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--rp-gold)]">
          <IconSparkles size={14} />
          Live
        </div>
      </div>

      <div className="mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:hidden">
        <button
          type="button"
          onClick={onOpenPassport}
          disabled={!onOpenPassport}
          className="flex min-w-[75%] snap-start items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-left transition enabled:hover:bg-black/60 disabled:cursor-default disabled:opacity-70"
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
              Departure
            </div>
            <div className="truncate text-sm font-semibold text-[var(--rp-text)]">
              {departure?.country ?? "Home Base"}
            </div>
            <div className="truncate text-xs text-[var(--rp-muted)]">
              {departure?.name ?? "First tune awaits"}
            </div>
          </div>
        </button>

        <div className="flex min-w-[75%] snap-start items-center gap-3 rounded-2xl border border-[rgba(245,177,45,0.5)] bg-black/60 px-3 py-3 shadow-[0_16px_34px_rgba(245,177,45,0.2)]">
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
          className="flex min-w-[75%] snap-start items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-left transition hover:bg-black/60"
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

      <div className="relative mt-4 hidden gap-4 sm:grid sm:grid-cols-3">
        <div className="absolute left-8 right-8 top-1/2 hidden h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-slate-200 to-transparent sm:block" />

        <button
          type="button"
          onClick={onOpenPassport}
          disabled={!onOpenPassport}
          className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-left transition enabled:hover:bg-black/60 disabled:cursor-default disabled:opacity-70"
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
              Departure
            </div>
            <div className="truncate text-sm font-semibold text-[var(--rp-text)]">
              {departure?.country ?? "Home Base"}
            </div>
            <div className="truncate text-xs text-[var(--rp-muted)]">
              {departure?.name ?? "First tune awaits"}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-3 rounded-2xl border border-[rgba(245,177,45,0.5)] bg-black/60 px-3 py-3 shadow-[0_16px_34px_rgba(245,177,45,0.2)]">
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
          className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/40 px-3 py-3 text-left transition hover:bg-black/60"
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
