import { useHydrated } from "~/hooks/useHydrated";
import { usePlayerStore } from "~/state/playerStore";
import { Eyebrow } from "~/components/ui/Eyebrow";
import { Row, RowText } from "~/components/ui/Row";
import { stationLocation } from "./StationRow";

export function TheaterQueue() {
  const hydrated = useHydrated();
  const queue = usePlayerStore((state) => state.queue);
  const index = usePlayerStore((state) => state.currentStationIndex);
  const nowPlaying = usePlayerStore((state) => state.nowPlaying);
  const startStation = usePlayerStore((state) => state.startStation);

  if (!hydrated || !nowPlaying || queue.length < 2) return null;

  const upcoming: typeof queue = [];
  const seen = new Set([nowPlaying.uuid]);
  for (let step = 1; step <= queue.length && upcoming.length < 3; step += 1) {
    const next = queue[(index + step) % queue.length];
    if (!next || seen.has(next.uuid)) continue;
    seen.add(next.uuid);
    upcoming.push(next);
  }
  if (!upcoming.length) return null;

  return (
    <section className="ew-theater-queue">
      <Eyebrow tone="dust">Up next in the room</Eyebrow>
      {upcoming.map((station) => (
        <Row
          as="button"
          key={station.uuid}
          onClick={() => startStation(station, { preserveQueue: true, autoPlay: true })}
        >
          <RowText title={station.name} sub={stationLocation(station)} />
        </Row>
      ))}
    </section>
  );
}
