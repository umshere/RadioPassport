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
};

const continentIcons: Record<string, JSX.Element> = {
  "North America": <IconGlobe size={20} />,
  "South America": <IconGlobe size={20} />,
  Europe: <IconCompass size={20} />,
  Asia: <IconMapPin size={20} />,
  Africa: <IconGlobe size={20} />,
  Oceania: <IconHeadphones size={20} />,
  Other: <IconWorld size={20} />,
};

export function AtlasGrid({ displaySections, onPreviewCountry }: AtlasGridProps) {
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
      <div className="rounded-3xl border border-slate-200/30 bg-[#e0e5ec] p-12 text-center shadow-[inset_3px_3px_6px_#b8b9be,inset_-3px_-3px_6px_#ffffff]">
        <Text size="md" c="dimmed">
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
            className="rounded-2xl border border-white/70 bg-white/70 p-6 shadow-[0_12px_32px_rgba(15,23,42,0.12)] backdrop-blur-xl md:p-7"
          >
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-3">
                <ThemeIcon
                  size={44}
                  radius="lg"
                  style={{
                    background: "#f8fafc",
                    border: "none",
                    color: "#64748b",
                    boxShadow: "0 8px 20px rgba(15,23,42,0.08)",
                  }}
                >
                  {continentIcons[continent] ?? <IconWorld size={22} />}
                </ThemeIcon>
                <div>
                  <Title order={3} style={{ fontSize: "1.35rem", fontWeight: 700, color: "#334155" }}>
                    {continent}
                  </Title>
                  <Text size="sm" c="dimmed">
                    {continentCountries.length} countries • {total.toLocaleString()} stations
                  </Text>
                </div>
              </div>
              <Badge
                radius="xl"
                size="md"
                variant="light"
                color="gray"
                leftSection={<IconBroadcast size={14} />}
                className="bg-white/80 text-slate-700 border border-white/80 shadow-[0_6px_18px_rgba(15,23,42,0.08)]"
              >
                {total.toLocaleString()} tuned-in listeners
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-4">
              {continentCountries.map((country, index) => (
                <motion.div
                  key={country.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                >
                  <Link
                    to={`/?country=${encodeURIComponent(country.name)}`}
                    className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/80 p-4 backdrop-blur-xl transition-all shadow-[0_10px_26px_rgba(15,23,42,0.12)] hover:-translate-y-1 hover:shadow-[0_14px_32px_rgba(15,23,42,0.16)]"
                    prefetch="intent"
                  >
                    {/* Glass sheen effect */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/50 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                    <div className="relative z-10 flex flex-1 flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <CountryFlag
                          iso={country.iso_3166_1}
                          title={`${country.name} flag`}
                          size={42}
                          className="rounded-lg border border-white/80 shadow-[0_8px_18px_rgba(15,23,42,0.12)]"
                        />
                        <div className="flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-900/5 px-2.5 py-1 backdrop-blur-sm">
                          <IconBroadcast size={10} className="text-slate-500" />
                          <span className="text-[10px] font-bold text-slate-600 font-mono">
                            {country.stationcount}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Text fw={800} size="md" c="slate.9" className="leading-tight line-clamp-2 group-hover:text-indigo-900 transition-colors">
                          {country.name}
                        </Text>
                        <Text size="xs" c="dimmed" className="font-medium flex items-center gap-1 text-slate-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                          {country.stationcount > 0 ? 'Live now' : 'No signal'}
                        </Text>
                      </div>
                    </div>

                    {/* Pending overlay when navigating to this country */}
                    {navigation.state !== "idle" && pendingCountry === country.name && (
                      <div
                        className="absolute inset-0 z-20 grid place-items-center bg-white/60 backdrop-blur-sm rounded-2xl"
                        aria-hidden="true"
                      >
                        <Loader size="sm" color="dark" />
                      </div>
                    )}
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.section>
        );
      })}
    </div>
  );
}
