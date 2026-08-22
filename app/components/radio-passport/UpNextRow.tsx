import { usePlayerStore } from "~/state/playerStore";
import { useUpNextStore } from "~/state/upNextStore";
import { stationLocation } from "./StationRow";
import { useHydrated } from "~/hooks/useHydrated";

export default function UpNextRow() {
  const hydrated = useHydrated();
  const queue = usePlayerStore((state) => state.queue);
  const index = usePlayerStore((state) => state.currentStationIndex);
  const nowPlaying = usePlayerStore((state) => state.nowPlaying);
  const entries = useUpNextStore((state) => state.entries);

  if (!hydrated || !nowPlaying || queue.length < 2) return null;
  const next = queue[(index + 1) % queue.length];
  if (!next || next.uuid === nowPlaying.uuid) return null;
  const entry = entries[next.uuid];
  if (!entry) return null;

  const bits = [next.name];
  const city = stationLocation(next);
  if (city && city !== stationLocation(nowPlaying)) bits.push(city);
  if (entry.shared.length) bits.push(entry.shared.join(" · "));

  return (
    <p className="ew-upnext" role="status">
      <span className="rp-eyebrow text-foil">Up next</span>
      <span className="ew-upnext-line">{bits.join(" · ")}</span>
    </p>
  );
}
