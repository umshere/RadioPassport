import { Link, useNavigation } from "@remix-run/react";
import { motion } from "framer-motion";
import { Text, Title, Badge, ThemeIcon, Loader } from "@mantine/core";
import {
  IconBroadcast,
  IconMapPin,
  IconGlobe,
  IconCompass,
  IconHeadphones,
  IconWorld,
  IconPlayerPlayFilled,
} from "@tabler/icons-react";
import { CountryFlag } from "~/components/CountryFlag";
import type { Country } from "~/types/radio";

type AtlasGridProps = {
  displaySections: Array<[string, Country[]]>;
  onPreviewCountry?: (countryName: string) => void;
  stampedCountries?: Set<string>;
};

const continentIcons: Record<string, JSX.Element> = {
  "North America": <IconGlobe size={20} />,
  "South America": <IconGlobe size={20} />,
  Europe: <IconCompass size={20} />,
  Asia: <IconMapPin size={20} />,
  Africa: <IconGlobe size={20} />,
  Australia: <IconHeadphones size={20} />,
  Other: <IconWorld size={20} />,
};

export function AtlasGrid({ displaySections, onPreviewCountry, stampedCountries }: AtlasGridProps) {
  const navigation = useNavigation();
  const pendingSearch = navigation.location?.search ?? "";
  const pendingCountry = (() => {
    try {
      const url = new URL(pendingSearch, "https://example.com");
      return url.searchParams.get("country");
    } catch {
      return null;
    }
  })();

  if (displaySections.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-[var(--rp-card)] p-12 text-center shadow-[0_18px_40px_rgba(0,0,0,0.6)]">
        <Text size="md" c="var(--rp-muted)">
          No countries match your search. Try a different name or clear the filters to see all regions.
        </Text>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {displaySections.map(([continent, continentCountries]) => {
        const total = continentCountries.reduce(
          (sum, country) => sum + country.stationcount,
          0
        );

        return (
          <motion.section
            key={continent}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="overflow-hidden rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,13,20,0.88)_0%,rgba(12,16,25,0.82)_100%)] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.42)] backdrop-blur-xl md:rounded-none md:border-0 md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-0"
          >
            <div className="mb-5 flex flex-col gap-3 md:mb-6 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-3">
                <ThemeIcon
                  size={44}
                  radius="lg"
                  style={{
                    background: "var(--rp-card-2)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "var(--rp-gold)",
                    boxShadow: "0 12px 24px rgba(0,0,0,0.45)",
                  }}
                >
                  {continentIcons[continent] ?? <IconWorld size={22} />}
                </ThemeIcon>
                <div>
                  <Text size="xs" c="var(--rp-muted-2)" className="font-semibold uppercase tracking-[0.26em]">
                    Route cluster
                  </Text>
                  <Title order={3} style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--rp-text)" }}>
                    {continent}
                  </Title>
                  <Text size="sm" c="var(--rp-muted)">
                    {continentCountries.length} countries • {total.toLocaleString()} stations ready to explore
                  </Text>
                </div>
              </div>
              <Badge
                radius="xl"
                size="md"
                variant="light"
                color="gray"
                leftSection={<IconBroadcast size={14} />}
                className="bg-black/40 text-[var(--rp-text)] border border-white/10 shadow-[0_10px_24px_rgba(0,0,0,0.45)]"
              >
                {total.toLocaleString()} tuned-in listeners
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-4">
              {continentCountries.map((country, index) => {
                const isStamped = stampedCountries?.has(country.iso_3166_1) ?? false;
                return (
                <motion.div
                  key={country.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                >
                  <Link
                    to={`/?country=${encodeURIComponent(country.name)}`}
                    className="group relative flex h-full min-h-[12rem] flex-col overflow-hidden rounded-[1.4rem] border border-white/10 bg-[rgba(5,8,14,0.4)] p-4 backdrop-blur-xl transition-all shadow-[0_14px_32px_rgba(0,0,0,0.32)] hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_18px_40px_rgba(0,0,0,0.46)]"
                    prefetch="intent"
                  >
                    {/* Glass sheen effect */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/8 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                    <div className="relative z-10 flex flex-1 flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <CountryFlag
                          iso={country.iso_3166_1}
                          title={`${country.name} flag`}
                          size={42}
                          className="rounded-lg border border-white/20 shadow-[0_10px_22px_rgba(0,0,0,0.45)]"
                        />
                        <div className="flex flex-col items-end gap-2">
                          {isStamped && (
                            <span className="rounded-full border border-[rgba(245,177,45,0.5)] bg-[rgba(245,177,45,0.12)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--rp-gold)]">
                              Stamped
                            </span>
                          )}
                          <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2.5 py-1 backdrop-blur-sm">
                            <IconBroadcast size={10} className="text-[var(--rp-gold)]" />
                            <span className="text-[10px] font-bold text-[var(--rp-muted)] font-mono">
                              {country.stationcount}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Text fw={800} size="md" c="var(--rp-text)" className="leading-tight line-clamp-2 group-hover:text-[var(--rp-gold)] transition-colors">
                          {country.name}
                        </Text>
                        <Text size="xs" c="var(--rp-muted)" className="font-medium flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--rp-gold)] inline-block animate-pulse" />
                          {country.stationcount > 0 ? 'Live now' : 'No signal'}
                        </Text>
                      </div>
                    </div>

                    {/* Pending overlay when navigating to this country */}
                    {navigation.state !== "idle" && pendingCountry === country.name && (
                      <div
                        className="absolute inset-0 z-20 grid place-items-center bg-black/60 backdrop-blur-sm rounded-2xl"
                        aria-hidden="true"
                      >
                        <Loader size="sm" color="yellow" />
                      </div>
                    )}
                  </Link>
                </motion.div>
              );
              })}
            </div>
          </motion.section>
        );
      })}
    </div>
  );
}
