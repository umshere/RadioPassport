import { useEffect, useRef, useState } from "react";

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

export function shouldAnimateGlobe(hidden: boolean, reducedMotion: boolean) {
  return !hidden && !reducedMotion;
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
  const targetRef = useRef<number | null>(null);
  const pendingRef = useRef<string | null>(null);
  const [reduced, setReduced] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);

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
    targetRef.current = facingRotation(place.longitude);
  }, [focusId, places]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0,
      raf = 0,
      hidden = document.hidden,
      rotation = rotationRef.current;
    const onVisibility = () => {
      hidden = document.hidden;
      if (!hidden) draw();
    };
    document.addEventListener("visibilitychange", onVisibility);
    const draw = () => {
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
      const playing = places.find((place) => place.playing);
      if (playing && typeof playing.hue === "number") {
        const wash = ctx.createRadialGradient(
          cx,
          cy,
          r * 0.2,
          cx,
          cy,
          r * 1.15
        );
        wash.addColorStop(0, `hsla(${playing.hue}, 28%, 16%, 0.55)`);
        wash.addColorStop(1, "rgba(12,11,9,0)");
        ctx.fillStyle = wash;
        ctx.fillRect(0, 0, rect.width, rect.height);
      }
      ctx.strokeStyle = "rgba(232,223,208,.12)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 300; i++) {
        const y = 1 - (i / 299) * 2,
          radius = Math.sqrt(1 - y * y),
          theta = Math.PI * (3 - Math.sqrt(5)) * i + rotation;
        const x = Math.cos(theta) * radius,
          z = Math.sin(theta) * radius;
        if (z < -0.2) continue;
        ctx.fillStyle = `rgba(232,223,208,${0.08 + (z + 1) * 0.18})`;
        ctx.fillRect(cx + x * r, cy - y * r, 1.1, 1.1);
      }
      if (playing) {
        const point = projectPlace(playing, rotation, cx, cy, r);
        if (point.visible) {
          ctx.strokeStyle = "rgba(198,165,106,.85)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(point.x, 18);
          ctx.lineTo(point.x, rect.height - 18);
          ctx.stroke();
        }
      }
      places.slice(0, 36).forEach((p) => {
        const point = projectPlace(p, rotation, cx, cy, r);
        if (!point.visible) return;
        ctx.fillStyle = p.playing
          ? "#7EB8B4"
          : p.stamped
          ? "#C6A56A"
          : "#C73A3A";
        ctx.beginPath();
        ctx.arc(
          point.x,
          point.y,
          p.active || p.playing || p.stamped ? 5 : 3.2,
          0,
          Math.PI * 2
        );
        ctx.fill();
        if (p.playing) {
          ctx.strokeStyle = "rgba(126,184,180,.7)";
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
      const target = targetRef.current;
      if (target !== null && !reduced) {
        const delta = shortestAngle(rotation, target);
        rotation += delta * 0.14;
        if (Math.abs(delta) < 0.012) {
          rotation = target;
          targetRef.current = null;
          const pending = pendingRef.current;
          pendingRef.current = null;
          if (pending) onSelect(pending);
        }
        rotationRef.current = rotation;
        frame++;
        raf = requestAnimationFrame(draw);
        return;
      }
      if (shouldAnimateGlobe(hidden, reduced) && !hoveredId) {
        rotation += 0.0012;
        rotationRef.current = rotation;
        frame++;
        raf = requestAnimationFrame(draw);
      }
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [hoveredId, onSelect, places, reduced]);

  const locate = (event: { clientX: number; clientY: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return nearestVisiblePlace(
      places,
      rotationRef.current,
      event.clientX - rect.left,
      event.clientY - rect.top,
      rect.width,
      rect.height
    );
  };

  const showTip = (place: GlobePlace, event: { clientX: number; clientY: number }) => {
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
    void event;
  };

  const landOn = (place: GlobePlace) => {
    setHoveredId(place.id);
    showTip(place, { clientX: 0, clientY: 0 });
    const target = facingRotation(place.longitude);
    const alreadyFacing =
      Math.abs(shortestAngle(rotationRef.current, target)) < 0.08;
    if (alreadyFacing || reduced) {
      onSelect(place.id);
      return;
    }
    pendingRef.current = place.id;
    targetRef.current = target;
    setHoveredId(null);
  };

  return (
    <div className="rp-globe-hit">
      <canvas
        ref={canvasRef}
        onClick={(event) => {
          const hit = locate(event);
          if (hit) landOn(hit.place);
        }}
        onMouseMove={(event) => {
          const hit = locate(event);
          if (!hit) {
            setHoveredId(null);
            setTip(null);
            return;
          }
          showTip(hit.place, event);
        }}
        onMouseLeave={() => {
          setHoveredId(null);
          setTip(null);
        }}
        onKeyDown={(event) => {
          const current = Math.max(
            0,
            places.findIndex((place) => place.id === hoveredId)
          );
          if (["ArrowLeft", "ArrowUp"].includes(event.key)) {
            event.preventDefault();
            const next =
              places[nextGlobePlaceIndex(current, places.length, -1)];
            if (next) setHoveredId(next.id);
          } else if (["ArrowRight", "ArrowDown"].includes(event.key)) {
            event.preventDefault();
            const next = places[nextGlobePlaceIndex(current, places.length, 1)];
            if (next) setHoveredId(next.id);
          } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            const place = places[current];
            if (place) landOn(place);
          }
        }}
        className="rp-globe"
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
