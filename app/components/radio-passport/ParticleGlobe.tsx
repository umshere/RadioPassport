import { useEffect, useRef, useState } from "react";

export type GlobePlace = {
  id: string;
  name: string;
  count: number;
  latitude: number;
  longitude: number;
  active?: boolean;
  playing?: boolean;
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

export function ParticleGlobe({
  places,
  onSelect,
}: {
  places: GlobePlace[];
  onSelect: (id: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0.45);
  const [reduced, setReduced] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
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
      ctx.strokeStyle = "rgba(229,83,95,.7)";
      ctx.setLineDash([2.4, 3.4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = "rgba(242,237,228,.15)";
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
        ctx.fillStyle = `rgba(242,237,228,${0.12 + (z + 1) * 0.25})`;
        ctx.fillRect(cx + x * r, cy - y * r, 1.2, 1.2);
      }
      places.slice(0, 30).forEach((p) => {
        const lat = (p.latitude * Math.PI) / 180,
          lon = (p.longitude * Math.PI) / 180 + rotation;
        const x = Math.cos(lat) * Math.sin(lon),
          y = Math.sin(lat),
          z = Math.cos(lat) * Math.cos(lon);
        if (z < 0) return;
        const px = cx + x * r,
          py = cy - y * r;
        ctx.fillStyle = p.playing ? "#6FB5C4" : "#E5535F";
        ctx.beginPath();
        ctx.arc(px, py, p.active || p.playing ? 5 : 3, 0, Math.PI * 2);
        ctx.fill();
        if (p.playing) {
          ctx.strokeStyle = "rgba(111,181,196,.7)";
          ctx.beginPath();
          ctx.arc(px, py, 8 + (Math.sin(frame * 0.08) + 1) * 2, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (p.id === hoveredId) {
          const label = `${p.name} · ${p.count} station${
            p.count === 1 ? "" : "s"
          }`;
          ctx.font = '600 11px "Sora", sans-serif';
          const width = ctx.measureText(label).width + 18;
          const tipX = Math.min(Math.max(8, px + 10), rect.width - width - 8);
          const tipY = Math.max(8, py - 31);
          ctx.fillStyle = "#1C1915";
          ctx.strokeStyle = "rgba(229,83,95,.7)";
          ctx.beginPath();
          ctx.roundRect(tipX, tipY, width, 24, 6);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = "#F2EDE4";
          ctx.fillText(label, tipX + 9, tipY + 16);
        }
      });
      if (shouldAnimateGlobe(hidden, reduced) && !hoveredId) {
        rotation += 0.0022;
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
  }, [hoveredId, places, reduced]);
  const click = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect(),
      x = event.clientX - rect.left,
      y = event.clientY - rect.top;
    let nearest: GlobePlace | undefined,
      distance = Infinity;
    places.forEach((p) => {
      const lat = (p.latitude * Math.PI) / 180,
        lon = (p.longitude * Math.PI) / 180 + rotationRef.current,
        px =
          rect.width / 2 +
          Math.cos(lat) *
            Math.sin(lon) *
            Math.min(rect.width, rect.height) *
            0.405,
        py =
          rect.height / 2 -
          Math.sin(lat) * Math.min(rect.width, rect.height) * 0.405,
        d = Math.hypot(x - px, y - py);
      if (d < distance) {
        nearest = p;
        distance = d;
      }
    });
    if (nearest && distance < 26) onSelect(nearest.id);
  };
  const hover = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const radius = Math.min(rect.width, rect.height) * 0.405;
    const nearest = places.reduce<{ id: string; distance: number } | null>(
      (closest, place) => {
        const lat = (place.latitude * Math.PI) / 180;
        const lon = (place.longitude * Math.PI) / 180 + rotationRef.current;
        const px = rect.width / 2 + Math.cos(lat) * Math.sin(lon) * radius;
        const py = rect.height / 2 - Math.sin(lat) * radius;
        const distance = Math.hypot(x - px, y - py);
        return !closest || distance < closest.distance
          ? { id: place.id, distance }
          : closest;
      },
      null
    );
    setHoveredId(nearest && nearest.distance < 26 ? nearest.id : null);
  };
  const selectedIndex = Math.max(
    0,
    places.findIndex((place) => place.id === hoveredId)
  );
  const selectRelativePlace = (direction: number) => {
    if (!places.length) return;
    const next =
      places[nextGlobePlaceIndex(selectedIndex, places.length, direction)];
    if (next) setHoveredId(next.id);
  };
  const keyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (["ArrowLeft", "ArrowUp"].includes(event.key)) {
      event.preventDefault();
      selectRelativePlace(-1);
    } else if (["ArrowRight", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      selectRelativePlace(1);
    } else if (event.key === "Home") {
      event.preventDefault();
      if (places[0]) setHoveredId(places[0].id);
    } else if (event.key === "End") {
      event.preventDefault();
      const last = places[places.length - 1];
      if (last) setHoveredId(last.id);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const place = places[selectedIndex];
      if (place) onSelect(place.id);
    }
  };
  return (
    <canvas
      ref={canvasRef}
      onClick={click}
      onMouseMove={hover}
      onMouseLeave={() => setHoveredId(null)}
      onFocus={() => places[0] && setHoveredId(places[0].id)}
      onKeyDown={keyDown}
      className="rp-globe"
      aria-label={`Interactive globe with ${places.length} real catalog locations. Use arrow keys to choose a location, then Enter to tune in.`}
      role="button"
      tabIndex={0}
    />
  );
}
