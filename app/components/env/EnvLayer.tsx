import { useLocation } from "@remix-run/react";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { arrivalSky } from "~/components/home/homeModel";
import { useEnvStore } from "~/state/envStore";
import { usePlayerStore } from "~/state/playerStore";
import { solarHourFromDate } from "~/utils/localTime";
import {
  GUST_BREEZE,
  envDurationMs,
  envGain,
  envHour,
  envNudge,
  envPageTilt,
  gustFrames,
  type EnvHour,
} from "./envModel";

type Lite = "on" | undefined;

/**
 * The room's light. One fixed, quiet layer of soft foliage shade (Day room) or
 * warm flecks (Night room) that shares one state with the hour: angle, stretch,
 * softness, tint and breeze all move together, and a change of hour sends a
 * single gust through it. Sprites are baked (scripts/gen-foliage.mjs); nothing
 * filters at runtime and nothing runs on the main thread while idle.
 */
export function EnvLayer() {
  const { pathname } = useLocation();
  const homeHour = useEnvStore((state) => state.homeHour);
  const nowPlaying = usePlayerStore((state) => state.nowPlaying);
  const [clock, setClock] = useState<EnvHour | null>(null);
  const [lite, setLite] = useState<Lite>(undefined);
  const [saver, setSaver] = useState(false);
  const [ready, setReady] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const prevHour = useRef<EnvHour | null>(null);
  const gusts = useRef<Animation[]>([]);

  // The listener's own hour, refreshed every few minutes.
  useEffect(() => {
    const read = () => setClock(envHour(solarHourFromDate(new Date())));
    read();
    const id = window.setInterval(read, 5 * 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
    const weak =
      window.matchMedia("(max-width: 767px)").matches ||
      (nav.deviceMemory !== undefined && nav.deviceMemory <= 4) ||
      (navigator.hardwareConcurrency !== undefined && navigator.hardwareConcurrency <= 4);
    setLite(weak ? "on" : undefined);
    setSaver(Boolean(nav.connection?.saveData) || window.matchMedia("(prefers-reduced-data: reduce)").matches);
    // Sprites arrive after the page is up.
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const id = idle ? idle(() => setReady(true)) : window.setTimeout(() => setReady(true), 600);
    return () => {
      if (!idle) window.clearTimeout(id);
    };
  }, []);

  // Which hour the room is in: the home's gate or sky, else the station that is
  // playing, else the listener's own.
  const stationHour = nowPlaying ? arrivalSky(nowPlaying).solar : null;
  const source = pathname === "/" && homeHour ? homeHour : stationHour;
  const hour: EnvHour = source ? envHour(source) : (clock ?? "midday");

  const from = prevHour.current ?? hour;
  const duration = envDurationMs(from, hour);

  const fireGust = (hourNow: EnvHour, power: number) => {
    const root = rootRef.current;
    if (!root || typeof root.animate !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (document.hidden) return;
    const seconds = lite ? 3.4 : 4.2;
    const breeze = GUST_BREEZE[hourNow];
    gusts.current.forEach((anim) => anim.cancel());
    gusts.current = [];
    root.querySelectorAll<HTMLElement>("[data-gust]").forEach((layer) => {
      const far = layer.dataset.gust === "far";
      const frames = gustFrames({
        seconds,
        strength: breeze.strength * power,
        direction: breeze.direction,
        scale: (far ? 0.6 : 1) * (lite ? 0.8 : 1),
      });
      gusts.current.push(
        layer.animate(frames, {
          duration: seconds * 1000,
          delay: far ? 180 : 0,
          easing: "linear",
          fill: "none",
        })
      );
    });
  };

  // A new hour turns the light and sends the full gust through it.
  useLayoutEffect(() => {
    const previous = prevHour.current;
    prevHour.current = hour;
    if (!previous || previous === hour) return;
    fireGust(hour, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hour, lite]);

  // A new page or a new station shifts the light a little and stirs a softer gust.
  const stationId = nowPlaying?.uuid ?? null;
  const moveKey = `${pathname}|${stationId ?? ""}`;
  const prevMove = useRef<string | null>(null);
  useLayoutEffect(() => {
    const previous = prevMove.current;
    prevMove.current = moveKey;
    if (previous === null || previous === moveKey) return;
    fireGust(hour, 0.75);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveKey]);

  // A hidden tab holds still and comes back where it was.
  useEffect(() => {
    const onVisibility = () => rootRef.current?.classList.toggle("is-paused", document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const style = {
    "--env-dur": `${duration}ms`,
    "--env-gain": envGain(pathname),
    "--env-nudge": `${(envPageTilt(pathname) + envNudge(stationId)).toFixed(2)}deg`,
  } as CSSProperties;

  return (
    <div
      ref={rootRef}
      className="ew-env"
      aria-hidden="true"
      data-hour={hour}
      data-lite={lite}
      style={style}
    >
      <div className="ew-env-tint" />
      {ready && !saver ? (
        <div className="ew-env-rig">
          <span className="ew-env-layer is-far" data-gust="far">
            <span className="ew-env-breath">
              <img className="ew-env-img is-fleck" src="/env/fleck-far.webp" alt="" decoding="async" />
              <img className="ew-env-img is-shade" src="/env/shade-far.webp" alt="" decoding="async" />
            </span>
          </span>
          <span className="ew-env-layer is-near" data-gust="near">
            <span className="ew-env-breath">
              <img className="ew-env-img is-fleck" src="/env/fleck-near.webp" alt="" decoding="async" />
              <img className="ew-env-img is-shade" src="/env/shade-near.webp" alt="" decoding="async" />
            </span>
          </span>
        </div>
      ) : null}
    </div>
  );
}
