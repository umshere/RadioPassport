import { Text } from "@mantine/core";
import {
  IconGlobe,
  IconCompass,
  IconMapPin,
  IconHeadphones,
  IconWorld,
} from "@tabler/icons-react";

type AtlasFiltersProps = {
  continents: string[];
  activeContinent: string | null;
  onContinentSelect: (continent: string | null) => void;
};

const continentIcons: Record<string, JSX.Element> = {
  "North America": <IconGlobe size={16} />,
  "South America": <IconGlobe size={16} />,
  Europe: <IconCompass size={16} />,
  Asia: <IconMapPin size={16} />,
  Africa: <IconGlobe size={16} />,
  Australia: <IconHeadphones size={16} />,
  Other: <IconWorld size={16} />,
};

export function AtlasFilters({
  continents,
  activeContinent,
  onContinentSelect,
}: AtlasFiltersProps) {
  const pillBase = "flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-all border shadow-[0_10px_24px_rgba(0,0,0,0.4)]";
  const inactivePill = "bg-black/40 backdrop-blur-md text-[var(--rp-text)] border-white/10 hover:bg-black/60";
  const activePill = "bg-[var(--rp-gold)] text-black border-[rgba(245,177,45,0.5)] shadow-[0_14px_28px_rgba(245,177,45,0.25)]";

  return (
    <div id="atlas-filters" className="scroll-track overflow-x-auto pb-2 pt-2 pl-1">
      <div className="flex min-w-max items-center gap-2.5">
        <button
          type="button"
          className={`${pillBase} ${activeContinent === null ? activePill : inactivePill}`}
          onClick={() => onContinentSelect(null)}
        >
          <IconGlobe
            size={18}
            className={activeContinent === null ? "" : "text-[var(--rp-muted-2)]"}
          />
          Reset Map
        </button>
        <div className="h-6 w-px bg-white/10 mx-1" />
        {continents.map((continent) => {
          const isActive = activeContinent === continent;
          return (
            <button
              key={continent}
              type="button"
              className={`${pillBase} ${isActive ? activePill : `${inactivePill} font-medium`}`}
              onClick={() => onContinentSelect(continent)}
            >
              {continentIcons[continent] ?? <IconWorld size={18} />}
              {continent}
              {isActive && (
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-black/70" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
