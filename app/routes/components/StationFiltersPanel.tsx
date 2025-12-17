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

  const handleQualityChange = (value: string | null) => {
    const next: StationFilterState = {
      ...filters,
      minBitrate: value ? Number(value) : null,
    };
    onChange(next);
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_14px_30px_rgba(15,23,42,0.12)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#dde2ec] text-slate-700 shadow-[inset_2px_2px_4px_#b8b9be,inset_-2px_-2px_4px_#ffffff]">
            <IconAdjustmentsHorizontal size={18} />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800">Station filters</p>
            <Text size="xs" c="dimmed" className="font-mono">
              Showing {counts.filtered.toLocaleString()} of {counts.total.toLocaleString()} stations
            </Text>
          </div>
        </div>
        <button
          type="button"
          className={`rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] transition-all ${isDirty
            ? "text-slate-700 border-slate-300 bg-white hover:bg-slate-50"
            : "text-slate-400 border-slate-200 bg-slate-100 cursor-not-allowed"
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
        />
        <Switch
          size="sm"
          label="Hide HTTP streams (blocked on HTTPS)"
          checked={filters.hideHttpOnHttps}
          disabled={!isHttps}
          onChange={(event) => onChange({ ...filters, hideHttpOnHttps: event.currentTarget.checked })}
        />
        <Switch
          size="sm"
          label="Hide HLS streams (often unsupported)"
          checked={filters.hideHlsOnUnsupported}
          onChange={(event) => onChange({ ...filters, hideHlsOnUnsupported: event.currentTarget.checked })}
        />
      </div>

      <div className="mt-5">
        <Text size="xs" c="dimmed" className="uppercase tracking-[0.35em] text-slate-500">
          Sort stations
        </Text>
        <div className="mt-2 flex flex-wrap gap-2">
          {stationSortOptions.map((option) => {
            const isActive = filters.sort === option.value;
            return (
              <button
                key={option.value}
                type="button"
                className={`flex flex-col items-start rounded-2xl px-4 py-3 text-left transition-all ${isActive
                  ? "bg-[#e0e5ec] text-slate-900 shadow-[inset_2px_2px_4px_#b8b9be,inset_-2px_-2px_4px_#ffffff]"
                  : "bg-[#e0e5ec] text-slate-600 shadow-[2px_2px_4px_#b8b9be,-2px_-2px_4px_#ffffff] hover:text-slate-800"
                  }`}
                onClick={() => {
                  if (isActive) return;
                  onChange({ ...filters, sort: option.value });
                }}
              >
                <span className="text-sm font-semibold">{option.label}</span>
                <span className="text-[11px] text-slate-500">{option.helper}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
