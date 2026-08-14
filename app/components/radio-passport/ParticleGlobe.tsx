import { useEffect, useRef, useState } from "react";
import { useAtmosphereStore } from "~/state/atmosphereStore";
import { globeAtmospherePaint } from "~/utils/atmosphere";

export type GlobePlace = {
  id: string;
  name: string;
  country: string;
  countryCode?: string | null;
  region: string;
  stationName: string;
  count: number;
  latitude: number;
  longitude: number;
  active?: boolean;
  playing?: boolean;
  stamped?: boolean;
  hue?: number;
  clicks?: number;
};

export const GLOBE_HIT_ACQUIRE = 32;
export const GLOBE_HIT_HOLD = 52;
export const GLOBE_HIT_TOUCH = 48;
export const GLOBE_TURN_MS = 520;
export const GLOBE_SPIN_RAD_PER_SEC = 0.055;

export function shouldAnimateGlobe(hidden: boolean, reducedMotion: boolean) {
  return !hidden && !reducedMotion;
}

export function shouldSpinGlobe(
  hidden: boolean,
  reducedMotion: boolean,
  pointerOver: boolean
) {
  return shouldAnimateGlobe(hidden, reducedMotion) && !pointerOver;
}

export function globeHitDistance(
  pointerType?: string | null,
  alreadyHovered = false
) {
  if (pointerType === "touch") return GLOBE_HIT_TOUCH;
  return alreadyHovered ? GLOBE_HIT_HOLD : GLOBE_HIT_ACQUIRE;
}

export function turnProgress(elapsedMs: number, durationMs = GLOBE_TURN_MS) {
  const t = Math.min(1, Math.max(0, elapsedMs / durationMs));
  return 1 - (1 - t) ** 3;
}

export function rotationAtTurn(from: number, to: number, progress: number) {
  return from + shortestAngle(from, to) * progress;
}

export function nextGlobePlaceIndex(
  index: number,
  length: number,
  direction: number
) {
  if (length <= 0) return -1;
  return (Math.max(0, index) + direction + length) % length;
}

export function facingRotation(longitude: number) {
  return -((longitude * Math.PI) / 180);
}

export function shortestAngle(from: number, to: number) {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

export function projectPlace(
  place: Pick<GlobePlace, "latitude" | "longitude">,
  rotation: number,
  cx: number,
  cy: number,
  radius: number
) {
  const lat = (place.latitude * Math.PI) / 180;
  const lon = (place.longitude * Math.PI) / 180 + rotation;
  const x = Math.cos(lat) * Math.sin(lon);
  const y = Math.sin(lat);
  const z = Math.cos(lat) * Math.cos(lon);
  return {
    x: cx + x * radius,
    y: cy - y * radius,
    z,
    visible: z >= 0,
  };
}

export function nearestVisiblePlace(
  places: GlobePlace[],
  rotation: number,
  px: number,
  py: number,
  width: number,
  height: number,
  maxDistance = 28
) {
  const radius = Math.min(width, height) * 0.405;
  const cx = width / 2;
  const cy = height / 2;
  let nearest: GlobePlace | null = null;
  let distance = Infinity;
  for (const place of places) {
    const point = projectPlace(place, rotation, cx, cy, radius);
    if (!point.visible) continue;
    const next = Math.hypot(px - point.x, py - point.y);
    if (next < distance) {
      nearest = place;
      distance = next;
    }
  }
  if (!nearest || distance > maxDistance) return null;
  return { place: nearest, distance };
}

type GlobeTurn = {
  from: number;
  to: number;
  startedAt: number;
};

type Tip = {
  id: string;
  x: number;
  y: number;
  name: string;
  country: string;
  region: string;
  stationName: string;
  count: number;
};

export function ParticleGlobe({
  places,
  onSelect,
  focusId,
}: {
  places: GlobePlace[];
  onSelect: (id: string) => void;
  focusId?: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0.45);
  const turnRef = useRef<GlobeTurn | null>(null);
  const pointerOverRef = useRef(false);
  const hoveredIdRef = useRef<string | null>(null);
  const placesRef = useRef(places);
  const onSelectRef = useRef(onSelect);
  const leaveTimerRef = useRef<number | null>(null);
  const [reduced, setReduced] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const atmosphere = useAtmosphereStore((state) => state.atmosphere);
  const atmosphereRef = useRef(atmosphere);

  placesRef.current = places;
  onSelectRef.current = onSelect;
  hoveredIdRef.current = hoveredId;
  atmosphereRef.current = atmosphere;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!focusId) return;
    const place = places.find((item) => item.id === focusId);
    if (!place) return;
    const target = facingRotation(place.longitude);
    const currentTurn = turnRef.current;
    if (
      currentTurn &&
      Math.abs(shortestAngle(currentTurn.to, target)) < 0.04
    ) {
      return;
    }
    if (Math.abs(shortestAngle(rotationRef.current, target)) < 0.04) return;
    turnRef.current = {
      from: rotationRef.current,
      to: target,
      startedAt: performance.now(),
    };
  }, [focusId, places]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0,
      raf = 0,
      hidden = document.hidden,
      rotation = rotationRef.current,
      lastNow = performance.now();
    const onVisibility = () => {
      hidden = document.hidden;
      if (!hidden) {
        lastNow = performance.now();
        draw(lastNow);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    const draw = (now: number) => {
      const dt = Math.min(0.05, Math.max(0, (now - lastNow) / 1000));
      lastNow = now;
      const livePlaces = placesRef.current;
      const rect = canvas.getBoundingClientRect(),
        dpr = Math.min(window.devicePixelRatio || 1, 2),
        size = Math.min(rect.width, rect.height);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);
      const cx = rect.width / 2,
        cy = rect.height / 2,
        r = size * 0.405;
      const turn = turnRef.current;
      if (turn && !reduced) {
        const progress = turnProgress(now - turn.startedAt);
        rotation = rotationAtTurn(turn.from, turn.to, progress);
        if (progress >= 1) {
          rotation = turn.to;
          turnRef.current = null;
        }
        rotationRef.current = rotation;
      } else if (shouldSpinGlobe(hidden, reduced, pointerOverRef.current)) {
        rotation += GLOBE_SPIN_RAD_PER_SEC * dt;
        rotationRef.current = rotation;
      }
      const playing = livePlaces.find((place) => place.playing);
      const hoverId = hoveredIdRef.current;
      const paint = globeAtmospherePaint(atmosphereRef.current);
      if (playing && typeof playing.hue === "number") {
        const wash = ctx.createRadialGradient(
          cx,
          cy,
          r * 0.2,
          cx,
          cy,
          r * 1.15
        );
        wash.addColorStop(
          0,
          `hsla(${playing.hue}, ${paint.washSaturation}%, ${paint.washLightness}%, ${paint.washAlpha})`
        );
        wash.addColorStop(1, paint.washFade);
        ctx.fillStyle = wash;
        ctx.fillRect(0, 0, rect.width, rect.height);
      }
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = paint.sphereFill;
      ctx.fill();
      ctx.strokeStyle = paint.outline;
      ctx.lineWidth = 1;
      ctx.stroke();
      for (let i = 0; i < 300; i++) {
        const y = 1 - (i / 299) * 2,
          radius = Math.sqrt(1 - y * y),
          theta = Math.PI * (3 - Math.sqrt(5)) * i + rotation;
        const x = Math.cos(theta) * radius,
          z = Math.sin(theta) * radius;
        if (z < -0.2) continue;
        ctx.fillStyle = paint.particle(z);
        ctx.fillRect(cx + x * r, cy - y * r, paint.particleSize, paint.particleSize);
      }
      if (playing) {
        const point = projectPlace(playing, rotation, cx, cy, r);
        if (point.visible) {
          ctx.strokeStyle = paint.meridian;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(point.x, 18);
          ctx.lineTo(point.x, rect.height - 18);
          ctx.stroke();
        }
      }
      livePlaces.slice(0, 36).forEach((p) => {
        const point = projectPlace(p, rotation, cx, cy, r);
        if (!point.visible) return;
        const aimed = hoverId === p.id;
        ctx.fillStyle = p.playing
          ? paint.cityPlaying
          : p.stamped
          ? paint.cityStamped
          : paint.cityLive;
        ctx.beginPath();
        ctx.arc(
          point.x,
          point.y,
          p.active || p.playing || p.stamped || aimed ? 5.4 : paint.cityRadius,
          0,
          Math.PI * 2
        );
        ctx.fill();
        if (aimed && !p.playing) {
          ctx.strokeStyle = paint.aim;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(point.x, point.y, 9, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (p.playing) {
          ctx.strokeStyle = paint.playingRing;
          ctx.beginPath();
          ctx.arc(
            point.x,
            point.y,
            8 + (Math.sin(frame * 0.08) + 1) * 2,
            0,
            Math.PI * 2
          );
          ctx.stroke();
        }
      });
      frame++;
      if (!hidden && (!reduced || turnRef.current)) {
        raf = requestAnimationFrame(draw);
      }
    };
    draw(lastNow);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [atmosphere, reduced]);

  const clearLeaveTimer = () => {
    if (leaveTimerRef.current === null) return;
    window.clearTimeout(leaveTimerRef.current);
    leaveTimerRef.current = null;
  };

  const holdGlobe = () => {
    clearLeaveTimer();
    pointerOverRef.current = true;
  };

  const releaseGlobe = () => {
    clearLeaveTimer();
    leaveTimerRef.current = window.setTimeout(() => {
      pointerOverRef.current = false;
      hoveredIdRef.current = null;
      setHoveredId(null);
      setTip(null);
      leaveTimerRef.current = null;
    }, 240);
  };

  const locate = (
    event: { clientX: number; clientY: number; pointerType?: string }
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return nearestVisiblePlace(
      places,
      rotationRef.current,
      event.clientX - rect.left,
      event.clientY - rect.top,
      rect.width,
      rect.height,
      globeHitDistance(event.pointerType, Boolean(hoveredIdRef.current))
    );
  };

  const showTip = (place: GlobePlace) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const point = projectPlace(
      place,
      rotationRef.current,
      rect.width / 2,
      rect.height / 2,
      Math.min(rect.width, rect.height) * 0.405
    );
    hoveredIdRef.current = place.id;
    setHoveredId(place.id);
    setTip({
      id: place.id,
      x: Math.min(rect.width - 188, Math.max(8, point.x + 12)),
      y: Math.max(8, point.y - 78),
      name: place.name,
      country: place.countryCode || place.country,
      region: place.region,
      stationName: place.stationName,
      count: place.count,
    });
  };

  const landOn = (place: GlobePlace) => {
    holdGlobe();
    showTip(place);
    onSelect(place.id);
    const target = facingRotation(place.longitude);
    if (
      reduced ||
      Math.abs(shortestAngle(rotationRef.current, target)) < 0.04
    ) {
      return;
    }
    turnRef.current = {
      from: rotationRef.current,
      to: target,
      startedAt: performance.now(),
    };
  };

  useEffect(
    () => () => {
      clearLeaveTimer();
    },
    []
  );

  return (
    <div
      className="rp-globe-hit"
      onPointerEnter={holdGlobe}
      onPointerLeave={releaseGlobe}
      onPointerDown={(event) => {
        holdGlobe();
        const hit = locate(event);
        if (hit) showTip(hit.place);
      }}
      onPointerMove={(event) => {
        holdGlobe();
        const hit = locate(event);
        if (!hit) {
          hoveredIdRef.current = null;
          setHoveredId(null);
          setTip(null);
          return;
        }
        showTip(hit.place);
      }}
      onClick={(event) => {
        const hit = locate(event);
        if (hit) landOn(hit.place);
      }}
    >
      <canvas
        ref={canvasRef}
        onKeyDown={(event) => {
          const current = Math.max(
            0,
            places.findIndex((place) => place.id === hoveredId)
          );
          if (["ArrowLeft", "ArrowUp"].includes(event.key)) {
            event.preventDefault();
            const next =
              places[nextGlobePlaceIndex(current, places.length, -1)];
            if (next) {
              holdGlobe();
              showTip(next);
            }
          } else if (["ArrowRight", "ArrowDown"].includes(event.key)) {
            event.preventDefault();
            const next = places[nextGlobePlaceIndex(current, places.length, 1)];
            if (next) {
              holdGlobe();
              showTip(next);
            }
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            const place = places[current];
            if (place) landOn(place);
          }
        }}
        className={`rp-globe${hoveredId ? " is-aimed" : ""}`}
        aria-label={`Interactive globe with ${places.length} live cities. Hover or tap a dot to read the place, then click to land.`}
        role="application"
        tabIndex={0}
      />
      {tip ? (
        <div
          className="ew-globe-tip"
          style={{ left: tip.x, top: tip.y }}
          role="tooltip"
        >
          <strong>{tip.name}</strong>
          <span>
            {tip.region}
            {tip.region && tip.country ? " · " : ""}
            {tip.country}
          </span>
          <em>{tip.stationName}</em>
          <small>
            {tip.count} live signal{tip.count === 1 ? "" : "s"}
          </small>
        </div>
      ) : null}
    </div>
  );
}
