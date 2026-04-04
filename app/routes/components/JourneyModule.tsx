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
      <section className="relative overflow-hidden py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--rp-muted-2)]">
              Itinerary
            </div>
            <div className="mt-2 text-xl font-semibold text-[var(--rp-text)]">
              Start your route and the passport begins keeping score.
            </div>
            <div className="mt-1 text-sm text-[var(--rp-muted)]">
              Tune in and the homepage will turn your first station into a departure, arrival, and next-stop story.
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
    <section className="relative overflow-hidden py-5">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-8 h-40 bg-[radial-gradient(circle_at_18%_30%,rgba(245,177,45,0.07),transparent_38%),radial-gradient(circle_at_62%_52%,rgba(116,162,212,0.05),transparent_32%)]"
      />

      <div className="relative text-[11px] font-semibold uppercase tracking-[0.32em] text-[var(--rp-muted-2)]">
        Itinerary
      </div>

      <div className="relative mt-4 max-w-xl text-sm leading-6 text-[var(--rp-muted)]">
        The current listening path is staged like a route card: where you came from, where you are, and the next country worth stamping.
      </div>

      <div className="relative mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 sm:hidden">
        <button
          type="button"
          onClick={onOpenPassport}
          disabled={!onOpenPassport}
          className="flex min-w-[75%] snap-start items-center gap-3 rounded-[1.5rem] border border-white/6 bg-[linear-gradient(180deg,rgba(16,11,7,0.2)_0%,rgba(8,12,18,0.18)_100%)] px-3 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-[2px] transition enabled:hover:bg-[rgba(14,12,10,0.42)] disabled:cursor-default disabled:opacity-70"
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

        <div className="flex min-w-[75%] snap-start items-center gap-3 rounded-[1.5rem] border border-[rgba(245,177,45,0.2)] bg-[linear-gradient(180deg,rgba(26,18,10,0.26)_0%,rgba(12,16,24,0.22)_100%)] px-3 py-3 shadow-[0_16px_34px_rgba(245,177,45,0.08),inset_0_1px_0_rgba(245,177,45,0.06)] backdrop-blur-[2px]">
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
          className="flex min-w-[75%] snap-start items-center gap-3 rounded-[1.5rem] border border-white/6 bg-[linear-gradient(180deg,rgba(16,11,7,0.2)_0%,rgba(8,12,18,0.18)_100%)] px-3 py-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-[2px] transition hover:bg-[rgba(14,12,10,0.42)]"
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

      <div className="relative mt-5 hidden gap-3 sm:grid sm:grid-cols-3">
        <motion.div
          key={nowPlaying.uuid}
          className="absolute left-[28%] top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(245,177,45,0.5)] bg-[rgba(18,14,7,0.8)] text-[var(--rp-gold)] shadow-[0_0_18px_rgba(245,177,45,0.28)] sm:flex"
          initial={{ x: 0, opacity: 0.4, y: -6 }}
          animate={{ x: 188, opacity: [0.6, 1, 0], y: -6 }}
          transition={{ duration: 2, ease: "easeOut", times: [0, 0.7, 1] }}
        >
          <IconPlane size={12} />
        </motion.div>

        <button
          type="button"
          onClick={onOpenPassport}
          disabled={!onOpenPassport}
          className="flex w-full items-center gap-3 rounded-[1.7rem] border border-white/6 bg-[linear-gradient(180deg,rgba(20,14,8,0.12)_0%,rgba(8,12,18,0.16)_100%)] px-5 py-5 text-left shadow-[0_14px_30px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-[2px] transition enabled:hover:bg-[rgba(20,14,8,0.18)] disabled:cursor-default disabled:opacity-70"
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

        <div className="flex items-center gap-3 rounded-[1.7rem] border border-[rgba(245,177,45,0.16)] bg-[linear-gradient(180deg,rgba(26,18,10,0.2)_0%,rgba(12,16,24,0.22)_100%)] px-5 py-5 shadow-[0_16px_30px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(245,177,45,0.05)] backdrop-blur-[2px]">
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
          className="flex items-center gap-3 rounded-[1.7rem] border border-white/6 bg-[linear-gradient(180deg,rgba(20,14,8,0.12)_0%,rgba(8,12,18,0.16)_100%)] px-5 py-5 text-left shadow-[0_14px_30px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-[2px] transition hover:bg-[rgba(20,14,8,0.18)]"
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
