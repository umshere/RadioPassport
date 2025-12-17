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
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 sm:justify-start sm:gap-2">
        <Switch
          size="xs"
          checked={filters.hideRecentlyFailed}
          onChange={(event) => onChange({ ...filters, hideRecentlyFailed: event.currentTarget.checked })}
          label="Hide unavailable"
        />
      </div>
    </div>
  );
}
