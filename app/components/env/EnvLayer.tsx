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
  envBefore,
  envHour,
  envNudge,
  envPageTilt,
  gustFrames,
  type EnvHour,
} from "./envModel";

const LANDING_MS = 6000;

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
  const [arrived, setArrived] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const prevHour = useRef<EnvHour | null>(null);
  const gusts = useRef<Animation[]>([]);
  const arriving = useRef(false);
  const [landing, setLanding] = useState(false);

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

  // On load the room starts one hour back and takes the real hour-change path
  // into the current hour: same tint, angle, softness and gust as any change.
  const shown: EnvHour = arrived ? hour : envBefore(hour);
  const from = prevHour.current ?? shown;
  const duration = envDurationMs(from, shown);

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

  // Once the sprites are up, the light lands: one long, smooth sweep of the
  // shadow into the real hour (a time-lapse of the day), brightest at the start,
  // then quiet. No bounce, no second pass.
  useEffect(() => {
    if (!ready || arrived) return;
    let second = 0;
    let done = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        arriving.current = true;
        setLanding(true);
        setArrived(true);
        const root = rootRef.current;
        if (root && typeof root.animate === "function" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          root.querySelectorAll<HTMLElement>(".ew-env-bloom").forEach((el) => {
            el.animate([{ opacity: 0.45 }, { opacity: 0.1818 }], {
              duration: LANDING_MS,
              easing: "cubic-bezier(.2,.6,.2,1)",
              fill: "none",
            });
          });
        }
        done = window.setTimeout(() => {
          arriving.current = false;
          setLanding(false);
        }, LANDING_MS + 200);
      });
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
      window.clearTimeout(done);
    };
  }, [ready, arrived]);

  // A new hour turns the light and sends the full gust through it.
  useLayoutEffect(() => {
    const previous = prevHour.current;
    prevHour.current = shown;
    if (!previous || previous === shown) return;
    if (!arriving.current) fireGust(shown, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, lite]);

  // A new page or a new station shifts the light a little and stirs a softer gust.
  const stationId = nowPlaying?.uuid ?? null;
  const moveKey = `${pathname}|${stationId ?? ""}`;
  const prevMove = useRef<string | null>(null);
  useLayoutEffect(() => {
    const previous = prevMove.current;
    prevMove.current = moveKey;
    if (previous === null || previous === moveKey) return;
    fireGust(shown, 0.75);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveKey]);

  // Phones: tilt the phone and the room shifts a hair, near leaves more than far.
  // Reads the gyro through one passive listener; writes two custom properties.
  // iOS asks permission, so it is requested on the first tap; if refused, nothing happens.
  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (typeof DeviceOrientationEvent === "undefined") return;
    const root = rootRef.current;
    if (!root) return;

    let base: { g: number; b: number } | null = null;
    let sx = 0;
    let sy = 0;
    let frame = 0;
    let tx = 0;
    let ty = 0;
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    const write = () => {
      frame = 0;
      sx += (tx - sx) * 0.18;
      sy += (ty - sy) * 0.18;
      root.style.setProperty("--env-px", sx.toFixed(3));
      root.style.setProperty("--env-py", sy.toFixed(3));
      if (Math.abs(tx - sx) > 0.002 || Math.abs(ty - sy) > 0.002) frame = requestAnimationFrame(write);
    };
    const onTilt = (event: DeviceOrientationEvent) => {
      if (event.gamma === null || event.beta === null || document.hidden) return;
      const g = event.gamma;
      const b = event.beta;
      if (!base) base = { g, b };
      // The resting pose follows slowly, so any way of holding the phone is centred.
      base.g += (g - base.g) * 0.004;
      base.b += (b - base.b) * 0.004;
      tx = clamp((g - base.g) / 18);
      ty = clamp((b - base.b) / 18);
      if (!frame) frame = requestAnimationFrame(write);
    };

    let listening = false;
    const listen = () => {
      if (listening) return;
      listening = true;
      window.addEventListener("deviceorientation", onTilt, { passive: true });
    };

    type Gated = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };
    const gated = DeviceOrientationEvent as Gated;
    let cleanupTap = () => {};
    if (typeof gated.requestPermission === "function") {
      const ask = () => {
        gated
          .requestPermission?.()
          .then((state) => {
            if (state === "granted") listen();
          })
          .catch(() => {});
      };
      window.addEventListener("pointerup", ask, { once: true });
      cleanupTap = () => window.removeEventListener("pointerup", ask);
    } else {
      listen();
    }

    return () => {
      cleanupTap();
      window.removeEventListener("deviceorientation", onTilt);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // Desktop: the light lives in the sky panel (the left column), not over the
  // whole page, so the rest of the room stays pure black. The layer is clipped to
  // the panel's box and the sun anchors inside it. Off desktop it stays as it is.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const wide = window.matchMedia("(min-width: 768px)");
    let raf = 0;
    let observed: Element | null = null;
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => schedule());
    function measure() {
      raf = 0;
      if (!root) return;
      if (!wide.matches) {
        root.removeAttribute("data-clipped");
        return;
      }
      const sky = document.querySelector(".ew-sky");
      if (sky !== observed) {
        if (observed) ro?.unobserve(observed);
        observed = sky;
        if (sky) ro?.observe(sky);
      }
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let top = 64;
      let left = 0;
      let right = vw * 0.6;
      let bottom = 0;
      let cx = vw * 0.2;
      let cy = vh * 0.35;
      if (sky) {
        const r = sky.getBoundingClientRect();
        if (r.width > 40 && r.height > 40) {
          top = Math.max(0, r.top);
          left = Math.max(0, r.left);
          right = Math.max(0, vw - r.right);
          bottom = Math.max(0, vh - r.bottom);
          cx = r.left + r.width / 2;
          cy = r.top + r.height * 0.3;
        }
      }
      root.style.setProperty("--env-clip", `inset(${top}px ${right}px ${bottom}px ${left}px)`);
      root.style.setProperty("--env-cx", `${cx.toFixed(0)}px`);
      root.style.setProperty("--env-cy", `${cy.toFixed(0)}px`);
      root.setAttribute("data-clipped", "");
    }
    function schedule() {
      if (!raf) raf = requestAnimationFrame(measure);
    }
    schedule();
    const settle = [window.setTimeout(schedule, 150), window.setTimeout(schedule, 900)];
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    wide.addEventListener("change", schedule);
    return () => {
      settle.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      wide.removeEventListener("change", schedule);
      ro?.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pathname, stationId]);

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

  if (pathname.startsWith("/admin")) return null;

  return (
    <div
      ref={rootRef}
      className="ew-env"
      aria-hidden="true"
      data-hour={shown}
      data-arrived={arrived || undefined}
      data-landing={landing || undefined}
      data-lite={lite}
      style={style}
    >
      <div className="ew-env-tint" />
      {ready && !saver ? (
        <div className="ew-env-rig">
          <span className="ew-env-layer is-far" data-gust="far">
            <span className="ew-env-bloom">
            <span className="ew-env-breath">
              <span className="ew-env-img" style={{ maskImage: "url(/env/fleck-far.webp)", WebkitMaskImage: "url(/env/fleck-far.webp)" }} />
            </span>
            </span>
          </span>
          <span className="ew-env-layer is-near" data-gust="near">
            <span className="ew-env-bloom">
            <span className="ew-env-breath">
              <span className="ew-env-img" style={{ maskImage: "url(/env/fleck-near.webp)", WebkitMaskImage: "url(/env/fleck-near.webp)" }} />
            </span>
            </span>
          </span>
        </div>
      ) : null}
    </div>
  );
}
