import { Drawer, ScrollArea } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import type { StationFilterOptions, StationFilterState } from "~/utils/stationFilters";
import { StationFiltersPanel } from "./StationFiltersPanel";

type MobileFilterDrawerProps = {
    opened: boolean;
    onClose: () => void;
    filters: StationFilterState;
    options: StationFilterOptions;
    counts: { total: number; filtered: number };
    isDirty: boolean;
    onChange: (next: StationFilterState) => void;
    onReset: () => void;
};

export function MobileFilterDrawer({
    opened,
    onClose,
    filters,
    options,
    counts,
    isDirty,
    onChange,
    onReset,
}: MobileFilterDrawerProps) {
    return (
        <Drawer
            opened={opened}
            onClose={onClose}
            position="bottom"
            size="90%"
            title={<span className="font-bold text-slate-800">Filters</span>}
            padding="md"
            radius="lg"
            transitionProps={{ duration: 250, timingFunction: "ease" }}
            styles={{
                header: { paddingBottom: 16, borderBottom: "1px solid #e2e8f0" },
                body: { padding: 0, paddingTop: 16 },
                content: { borderRadius: "24px 24px 0 0" }
            }}
        >
            <ScrollArea h="100%" type="never" style={{ paddingBottom: 80 }}>
                <div className="px-4">
                    <StationFiltersPanel
                        filters={filters}
                        options={options}
                        counts={counts}
                        isDirty={isDirty}
                        onChange={onChange}
                        onReset={onReset}
                    />

                    <div className="mt-8 flex justify-end pb-8">
                        <button
                            onClick={onClose}
                            className="w-full rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-lg active:scale-[0.98]"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </ScrollArea>
        </Drawer>
    );
}
