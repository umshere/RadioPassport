import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "@remix-run/react";
import { usePlayerStore } from "~/state/playerStore";
import { dispatchRequestFor } from "~/state/roomStore";
import type { DispatchResponse } from "~/types/ai";
import {
  isStampReady,
  stationStampId,
  type PassportStamp,
  useJourneyStore,
} from "~/state/journeyStore";
import { stationLocation, stationTelemetry } from "./StationRow";
import { homeWithPassportHref, openPassportNow } from "./productFlow";

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
  const location = useLocation();
  const navigate = useNavigate();
  const nowPlaying = usePlayerStore((state) => state.nowPlaying);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const hydrated = useJourneyStore((state) => state.hydrated);
  const stamps = useJourneyStore((state) => state.stamps);
  const hydrate = useJourneyStore((state) => state.hydrate);
  const addStamp = useJourneyStore((state) => state.addStamp);
  const [toast, setToast] = useState<PassportStamp | null>(null);
  const [toastLine, setToastLine] = useState<string | null>(null);
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
      setToastLine(null);
      void fetch("/api/ai/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dispatchRequestFor(nowPlaying, null)),
      })
        .then(async (response) => (response.ok ? response.json() : null))
        .then((payload: DispatchResponse | null) => {
          const headline = payload?.dispatch?.headline?.trim();
          if (headline) setToastLine(headline);
        })
        .catch(() => {});
    }, 60_000);

    return () => {
      window.clearTimeout(timer);
      if (startedAtRef.current === startedAt) startedAtRef.current = null;
    };
  }, [addStamp, hydrated, isPlaying, nowPlaying, stamps]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toastLine ? 6500 : 4000);
    return () => window.clearTimeout(timer);
  }, [toast, toastLine]);

  if (!toast) return null;
  return (
    <button
      type="button"
      className="rp-toast text-left"
      role="status"
      aria-live="polite"
      onClick={() =>
        openPassportNow(location.pathname, () =>
          navigate(homeWithPassportHref())
        )
      }
    >
      <span className="rp-eyebrow text-foil">INKED</span>
      <strong>
        {toast.city}
      </strong>
      <small>
        {toast.stationName} · {toast.country}
      </small>
      {toastLine ? <em className="rp-toast-line">{toastLine}</em> : null}
    </button>
  );
}
