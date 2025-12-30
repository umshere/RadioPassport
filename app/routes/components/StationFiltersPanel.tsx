import { Select, Switch, Text } from "@mantine/core";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";

import type {
  StationFilterOptions,
  StationFilterState,
  StationFilterSort,
} from "~/utils/stationFilters";

type StationFiltersPanelProps = {
  filters: StationFilterState;
  options: StationFilterOptions;
  counts: { total: number; filtered: number };
  isDirty: boolean;
  onChange: (next: StationFilterState) => void;
  onReset: () => void;
};

export const stationSortOptions: Array<{ label: string; value: StationFilterSort; helper: string }> = [
  { label: "Featured", value: "featured", helper: "Signal strength + popularity" },
  { label: "Last checked", value: "recent", helper: "Prioritize freshest health checks" },
  { label: "Highest kbps", value: "bitrateHigh", helper: "Best audio fidelity first" },
  { label: "Lowest kbps", value: "bitrateLow", helper: "Lightweight streams for slow links" },
];

export function StationFiltersPanel({
  filters,
  options,
  counts,
  isDirty,
  onChange,
  onReset,
}: StationFiltersPanelProps) {
  const isHttps = typeof window !== "undefined" ? window.location.protocol === "https:" : false;
  const selectClassNames = {
    label: "text-[11px] font-semibold uppercase tracking-[0.25em] text-[var(--rp-muted-2)]",
    input:
      "bg-black/40 border-white/10 text-[var(--rp-text)] placeholder:text-[var(--rp-muted-2)]",
    dropdown: "bg-[#10131a] border-white/10",
    item: "text-[var(--rp-text)] data-[selected=true]:bg-[rgba(245,177,45,0.2)] data-[selected=true]:text-[var(--rp-gold)]",
  };

  const handleQualityChange = (value: string | null) => {
    const next: StationFilterState = {
      ...filters,
      minBitrate: value ? Number(value) : null,
    };
    onChange(next);
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-[var(--rp-card)] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-[var(--rp-card-2)] text-[var(--rp-gold)] shadow-[0_12px_24px_rgba(0,0,0,0.45)]">
            <IconAdjustmentsHorizontal size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-[var(--rp-text)]">Station filters</p>
            <Text size="xs" className="font-mono text-[var(--rp-muted-2)]">
              Showing {counts.filtered.toLocaleString()} of {counts.total.toLocaleString()} stations
            </Text>
          </div>
        </div>
        <button
          type="button"
          className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition-all ${isDirty
            ? "text-[var(--rp-gold)] border-[rgba(245,177,45,0.5)] bg-[rgba(245,177,45,0.12)] hover:bg-[rgba(245,177,45,0.2)]"
            : "text-[var(--rp-muted-2)] border-white/10 bg-black/30 cursor-not-allowed"
            }`}
          onClick={onReset}
          disabled={!isDirty}
        >
          Reset
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Select
          label="Mood / Genre"
          placeholder={options.moods.length ? "Any mood" : "No tags available"}
          classNames={selectClassNames}
          data={options.moods.map((item) => ({
            value: item.value,
            label: `${item.label} (${item.count})`,
          }))}
          value={filters.mood}
          onChange={(value) => onChange({ ...filters, mood: value })}
          clearable
          searchable
          size="sm"
          disabled={options.moods.length === 0}
        />
        <Select
          label="Audio quality"
          placeholder={options.qualitySteps.length ? "Any quality" : "No bitrate data"}
          classNames={selectClassNames}
          data={options.qualitySteps.map((step) => ({
            value: String(step),
            label: `${step} kbps +`,
          }))}
          value={filters.minBitrate ? String(filters.minBitrate) : null}
          onChange={handleQualityChange}
          clearable
          size="sm"
          disabled={options.qualitySteps.length === 0}
        />
        <Select
          label="Sort"
          placeholder="Featured"
          classNames={selectClassNames}
          data={stationSortOptions.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          value={filters.sort}
          onChange={(value) => onChange({ ...filters, sort: (value as StationFilterSort) ?? "featured" })}
          size="sm"
        />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <Switch
          size="sm"
          label="Hide stations that failed recently"
          checked={filters.hideRecentlyFailed}
          onChange={(event) => onChange({ ...filters, hideRecentlyFailed: event.currentTarget.checked })}
          classNames={{
            label: "text-[11px] uppercase tracking-[0.2em] text-[var(--rp-muted-2)]",
            track: "bg-black/40 border border-white/10",
            thumb: "bg-[var(--rp-gold)]",
          }}
        />
        <Switch
          size="sm"
          label="Hide HTTP streams (blocked on HTTPS)"
          checked={filters.hideHttpOnHttps}
          disabled={!isHttps}
          onChange={(event) => onChange({ ...filters, hideHttpOnHttps: event.currentTarget.checked })}
          classNames={{
            label: "text-[11px] uppercase tracking-[0.2em] text-[var(--rp-muted-2)]",
            track: "bg-black/40 border border-white/10",
            thumb: "bg-[var(--rp-gold)]",
          }}
        />
        <Switch
          size="sm"
          label="Hide HLS streams (often unsupported)"
          checked={filters.hideHlsOnUnsupported}
          onChange={(event) => onChange({ ...filters, hideHlsOnUnsupported: event.currentTarget.checked })}
          classNames={{
            label: "text-[11px] uppercase tracking-[0.2em] text-[var(--rp-muted-2)]",
            track: "bg-black/40 border border-white/10",
            thumb: "bg-[var(--rp-gold)]",
          }}
        />
      </div>

      <div className="mt-5">
        <Text size="xs" className="uppercase tracking-[0.35em] text-[var(--rp-muted-2)]">
          Sort stations
        </Text>
        <div className="mt-2 flex flex-wrap gap-2">
          {stationSortOptions.map((option) => {
            const isActive = filters.sort === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={`flex flex-col items-start rounded-2xl border px-4 py-3 text-left transition-all ${isActive
                  ? "border-[rgba(245,177,45,0.45)] bg-[rgba(245,177,45,0.12)] text-[var(--rp-gold)] shadow-[0_14px_30px_rgba(245,177,45,0.15)]"
                  : "border-white/10 bg-black/40 text-[var(--rp-muted)] hover:text-[var(--rp-text)]"
                  }`}
                onClick={() => {
                  if (isActive) return;
                  onChange({ ...filters, sort: option.value });
                }}
              >
                <span className="text-sm font-semibold">{option.label}</span>
                <span className={`text-[11px] ${isActive ? "text-[rgba(245,177,45,0.9)]" : "text-[var(--rp-muted-2)]"}`}>
                  {option.helper}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
