import { Select, Switch } from "@mantine/core";
import type { StationFilterOptions, StationFilterState } from "~/utils/stationFilters";

type StationFilterQuickBarProps = {
  filters: StationFilterState;
  options: StationFilterOptions;
  onChange: (next: StationFilterState) => void;
};

type SelectFilterField = "language" | "region";

export function StationFilterQuickBar({
  filters,
  options,
  onChange,
}: StationFilterQuickBarProps) {
  const makeSelectHandler = (field: SelectFilterField) => (value: string | null) => {
    onChange({ ...filters, [field]: value });
  };

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
      <div className="flex w-full flex-col gap-2 sm:flex-1">
        <Select
          placeholder="Language"
          classNames={{
            wrapper: "relative",
            input:
              "h-12 rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[linear-gradient(180deg,rgba(9,11,16,0.96)_0%,rgba(14,17,24,0.94)_100%)] text-[var(--rp-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_10px_22px_rgba(0,0,0,0.28)] placeholder:text-[rgba(224,229,240,0.42)] focus:border-[rgba(245,177,45,0.45)]",
            section: "text-[var(--rp-muted-2)]",
            dropdown:
              "overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[linear-gradient(180deg,rgba(12,15,21,0.98)_0%,rgba(9,11,16,0.98)_100%)] p-1 shadow-[0_22px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl",
            option:
              "rounded-xl text-[var(--rp-text)] transition-colors data-[hovered=true]:bg-[rgba(255,255,255,0.05)] data-[selected=true]:bg-[rgba(245,177,45,0.18)] data-[selected=true]:text-[var(--rp-gold)]",
          }}
          data={options.languages.map((item) => ({
            value: item.value,
            label: `${item.label} (${item.count})`,
          }))}
          value={filters.language}
          onChange={makeSelectHandler("language")}
          clearable
          searchable
          size="xs"
          disabled={!options.languages.length}
        />
      </div>
      <div className="flex w-full flex-col gap-2 sm:flex-1">
        <Select
          placeholder="State / Region"
          classNames={{
            wrapper: "relative",
            input:
              "h-12 rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[linear-gradient(180deg,rgba(9,11,16,0.96)_0%,rgba(14,17,24,0.94)_100%)] text-[var(--rp-text)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_10px_22px_rgba(0,0,0,0.28)] placeholder:text-[rgba(224,229,240,0.42)] focus:border-[rgba(245,177,45,0.45)]",
            section: "text-[var(--rp-muted-2)]",
            dropdown:
              "overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.12)] bg-[linear-gradient(180deg,rgba(12,15,21,0.98)_0%,rgba(9,11,16,0.98)_100%)] p-1 shadow-[0_22px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl",
            option:
              "rounded-xl text-[var(--rp-text)] transition-colors data-[hovered=true]:bg-[rgba(255,255,255,0.05)] data-[selected=true]:bg-[rgba(245,177,45,0.18)] data-[selected=true]:text-[var(--rp-gold)]",
          }}
          data={options.regions.map((item) => ({
            value: item.value,
            label: `${item.label} (${item.count})`,
          }))}
          value={filters.region}
          onChange={makeSelectHandler("region")}
          clearable
          size="xs"
          disabled={!options.regions.length}
        />
      </div>
      <div className="flex h-12 items-center justify-between rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[linear-gradient(180deg,rgba(9,11,16,0.96)_0%,rgba(14,17,24,0.94)_100%)] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_10px_22px_rgba(0,0,0,0.28)] sm:justify-start sm:gap-2">
        <Switch
          size="xs"
          checked={filters.hideRecentlyFailed}
          onChange={(event) => onChange({ ...filters, hideRecentlyFailed: event.currentTarget.checked })}
          label="Hide unavailable"
          classNames={{
            body: "items-center",
            label: "text-[11px] font-semibold uppercase tracking-[0.2em] text-[rgba(230,234,242,0.72)]",
            track: "bg-black/50 border border-white/10",
            thumb: "bg-[var(--rp-gold)]",
          }}
        />
      </div>
    </div>
  );
}
