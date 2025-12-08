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
  Oceania: <IconHeadphones size={16} />,
  Other: <IconWorld size={16} />,
};

export function AtlasFilters({
  continents,
  activeContinent,
  onContinentSelect,
}: AtlasFiltersProps) {
  const pillBase = "flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-all border shadow-[0_8px_20px_rgba(15,23,42,0.08)]";
  const inactivePill = "bg-white/70 backdrop-blur-md text-slate-600 border-white/80 hover:bg-white hover:text-slate-900";
  const activePill = "bg-slate-900 text-white border-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.16)]";

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
            className={activeContinent === null ? "" : "text-slate-400 group-hover:text-slate-600"}
          />
          Reset Map
        </button>
        <div className="h-6 w-px bg-slate-300/40 mx-1" />
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
                <span className="ml-1 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
