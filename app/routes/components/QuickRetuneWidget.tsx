import { motion, AnimatePresence } from "framer-motion";
import { Text, Button, ActionIcon, Input, Tooltip, Loader } from "@mantine/core";
import { IconMapPin, IconX, IconArrowsShuffle } from "@tabler/icons-react";
import { useNavigation } from "@remix-run/react";
import { useState, useEffect } from "react";
import { CountryFlag } from "~/components/CountryFlag";
import type { Country } from "~/types/radio";

type QuickRetuneWidgetProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  continents: string[];
  activeContinent: string | null;
  onContinentSelect: (continent: string | null) => void;
  countriesByContinent: Record<string, Country[]>;
  topCountries: Country[];
  onCountrySelect: (countryName: string) => void;
  onSurprise: () => void;
};

export function QuickRetuneWidget({
  isOpen,
  onOpenChange,
  continents,
  activeContinent,
  onContinentSelect,
  countriesByContinent,
  topCountries,
  onCountrySelect,
  onSurprise,
}: QuickRetuneWidgetProps) {
  const navigation = useNavigation();
  const [loadingCountry, setLoadingCountry] = useState<string | null>(null);
  const pendingSearch = navigation.location?.search ?? "";
  const pendingCountry = (() => {
    try {
      const url = new URL(pendingSearch, "https://example.com");
      return url.searchParams.get("country");
    } catch {
      return null;
    }
  })();

  // Reset loading state when widget closes or navigation completes
  useEffect(() => {
    if (!isOpen) {
      setLoadingCountry(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (navigation.state === "idle" && loadingCountry) {
      // Close widget after a brief delay to show the loaded state
      const timer = setTimeout(() => {
        onOpenChange(false);
        setLoadingCountry(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [navigation.state, loadingCountry, onOpenChange]);

  const isLoading = (countryName: string) => {
    return loadingCountry === countryName || pendingCountry === countryName;
  };

  const previewCountries = activeContinent
    ? (countriesByContinent[activeContinent] ?? []).slice(0, 6)
    : topCountries.slice(0, 6);

  return (
    <div className="quick-retune-container">
      {/* Floating trigger removed - controlled via PlayerDock */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              className="quick-retune-backdrop fixed inset-0 bg-slate-900/55 backdrop-blur-[6px] z-[59]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => onOpenChange(false)}
            />
            {/* Panel */}
            <motion.div
              key="quick-retune-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="quick-retune-title"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="fixed bottom-24 right-4 z-[60] w-80 rounded-3xl border border-white/10 bg-[rgba(8,24,44,0.92)] p-4 text-slate-100 shadow-[0_24px_50px_-24px_rgba(2,12,28,0.8)] backdrop-blur-2xl sm:bottom-28 sm:right-6 sm:w-[26rem] sm:rounded-[28px] lg:w-[30rem] lg:p-6"
              id="quick-retune-panel"
              onKeyDown={(e) => {
                if (e.key === "Escape") onOpenChange(false);
              }}
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <Text id="quick-retune-title" size="sm" fw={700} c="slate.9" className="text-slate-100">
                    Quick retune
                  </Text>
                  <Text size="xs" c="dimmed" className="hidden sm:block text-slate-300/80">
                    Jump to a country spotlight in one tap.
                  </Text>
                </div>
                <Tooltip label="Close" position="left" withArrow>
                  <ActionIcon
                    size="sm"
                    radius="xl"
                    variant="subtle"
                    onClick={() => onOpenChange(false)}
                    className="text-slate-200 hover:bg-white/10 hover:text-white"
                    aria-label="Close country picker"
                  >
                    <IconX size={14} />
                  </ActionIcon>
                </Tooltip>
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                {continents.map((continent) => {
                  const isActive = activeContinent === continent;
                  return (
                    <button
                      key={continent}
                      type="button"
                      className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                        isActive
                          ? "bg-[var(--rp-gold)] text-[#1b1a12] shadow-[0_8px_18px_rgba(245,177,45,0.35)]"
                          : "bg-white/5 text-slate-200 border border-white/10 hover:bg-white/10 hover:text-white"
                      }`}
                      onClick={() => onContinentSelect(isActive ? null : continent)}
                      aria-pressed={isActive}
                      aria-label={`${isActive ? "Disable" : "Enable"} ${continent} filter`}
                    >
                      {continent}
                    </button>
                  );
                })}
              </div>
              <div className="mb-4 flex flex-col gap-1 sm:grid sm:grid-cols-2 sm:gap-3">
                {previewCountries.length === 0 ? (
                  <Text size="xs" c="dimmed">
                    No spotlight countries available.
                  </Text>
                ) : (
                  previewCountries.map((country) => (
                    <button
                      key={country.name}
                      type="button"
                      className="group flex w-full items-center justify-between rounded-xl p-2 text-left transition-colors border border-white/10 bg-white/5 hover:bg-white/10 hover:border-[var(--rp-gold)]/40 sm:rounded-2xl sm:p-3"
                      onClick={async () => {
                        setLoadingCountry(country.name);
                        await onCountrySelect(country.name);
                        // Don't close here - let the effect handle it
                      }}
                      aria-label={`Retune to ${country.name}`}
                      style={{ position: "relative" }}
                      disabled={isLoading(country.name)}
                    >
                      <div className="flex items-center gap-3">
                        <CountryFlag
                          iso={country.iso_3166_1}
                          title={`${country.name} flag`}
                          size={22}
                          className="rounded-md shadow-sm border border-white/20"
                        />
                        <span className="text-sm font-medium text-slate-100 group-hover:text-white">{country.name}</span>
                      </div>
                      <span className="text-xs font-medium text-slate-300 group-hover:text-slate-200">
                        {country.stationcount.toLocaleString()}
                      </span>
                      {/* Loading overlay */}
                      {isLoading(country.name) && (
                        <div
                          className="absolute inset-0 grid place-items-center rounded-xl bg-slate-900/50 backdrop-blur-[1px]"
                          aria-hidden="true"
                        >
                          <Loader size="sm" color="dark" />
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
              <Tooltip label="Pick a random station" position="top" withArrow>
                <Button
                  radius="xl"
                  size="xs"
                  variant="light"
                  color="gray"
                  leftSection={<IconArrowsShuffle size={14} />}
                  onClick={async () => {
                    setLoadingCountry("surprise");
                    await onSurprise();
                  }}
                  disabled={loadingCountry === "surprise"}
                  className="w-full bg-[var(--rp-gold)] text-[#1b1a12] hover:bg-[var(--rp-gold)]/90 border-transparent"
                  aria-label="Surprise me with a random station"
                >
                  Surprise me
                </Button>
              </Tooltip>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
