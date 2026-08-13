import { useEffect, useRef, useState } from "react";
import { usePlayerStore } from "~/state/playerStore";
import {
  isStampReady,
  stationStampId,
  type PassportStamp,
  useJourneyStore,
} from "~/state/journeyStore";
import { stationLocation, stationTelemetry } from "./StationRow";

export function stampForContinuousSession(
  station: NonNullable<
    ReturnType<typeof usePlayerStore.getState>["nowPlaying"]
  >,
  startedAt: number,
  now: number,
  isContinuous: boolean
): PassportStamp | null {
  if (!isStampReady(startedAt, now, isContinuous)) return null;
  const city = stationLocation(station);
  return {
    id: stationStampId(station.uuid, city, station.country),
    stationId: station.uuid,
    stationName: station.name,
    city,
    country: station.country,
    countryCode: station.countryCode ?? null,
    language: station.language ?? null,
    telemetry: stationTelemetry(station),
    stampedAt: now,
  };
}

export function JourneyBridge() {
  const nowPlaying = usePlayerStore((state) => state.nowPlaying);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const hydrated = useJourneyStore((state) => state.hydrated);
  const stamps = useJourneyStore((state) => state.stamps);
  const hydrate = useJourneyStore((state) => state.hydrate);
  const addStamp = useJourneyStore((state) => state.addStamp);
  const [toast, setToast] = useState<PassportStamp | null>(null);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => hydrate(), [hydrate]);

  useEffect(() => {
    if (!hydrated || !nowPlaying || !isPlaying) {
      startedAtRef.current = null;
      return;
    }

    const location = stationLocation(nowPlaying);
    const id = stationStampId(nowPlaying.uuid, location, nowPlaying.country);
    if (stamps.some((stamp) => stamp.id === id)) return;

    const startedAt = Date.now();
    startedAtRef.current = startedAt;
    const timer = window.setTimeout(() => {
      const current = usePlayerStore.getState();
      const stamp = stampForContinuousSession(
        nowPlaying,
        startedAt,
        Date.now(),
        Boolean(
          current.isPlaying &&
            current.nowPlaying?.uuid === nowPlaying.uuid &&
            startedAtRef.current === startedAt
        )
      );
      if (!stamp) return;
      addStamp(stamp);
      setToast(stamp);
    }, 60_000);

    return () => {
      window.clearTimeout(timer);
      if (startedAtRef.current === startedAt) startedAtRef.current = null;
    };
  }, [addStamp, hydrated, isPlaying, nowPlaying, stamps]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;
  return (
    <div className="rp-toast" role="status" aria-live="polite">
      <span className="rp-eyebrow text-foil">INKED</span>
      <strong>
        {toast.city}
      </strong>
      <small>
        {toast.stationName} · {toast.country}
      </small>
    </div>
  );
}
