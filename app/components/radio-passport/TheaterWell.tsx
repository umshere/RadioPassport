import { useEffect, useMemo, useRef, useState } from "react";
import {
  meridianKind,
  type MeridianKind,
  type TheaterFact,
  type TheaterLink,
} from "./productFlow";
import { safeExternalUrl } from "./stationInsights";
import {
  markArtworkUrlFailed,
  sanitizeArtworkUrl,
} from "~/utils/stations";
import {
  advanceFieldTraveler,
  fieldDensity,
  fieldNodesFromReleases,
  fieldPoint,
  fieldSemanticEdges,
  fieldSpanEdges,
  fieldTravelerInTransit,
  fieldTravelerVisiting,
  fieldStandingLabel,
  fieldVisitLabel,
  fieldWalk,
  fieldTriangles,
  hexRgb,
  startFieldTraveler,
  theaterSkyLive,
  theaterWellAria,
  type FieldNode,
  type FieldPoint,
  type FieldRelease,
  type TheaterPhase,
} from "./theaterLock";

function usePrefersReducedMotion() {
  const reduced = useRef(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      reduced.current = media.matches;
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return reduced;
}

function paletteOf(element: HTMLElement) {
  const style = getComputedStyle(element);
  return {
    foil: hexRgb(style.getPropertyValue("--ew-foil")) ?? [198, 165, 106],
    ether: hexRgb(style.getPropertyValue("--ew-ether")) ?? [126, 184, 180],
    bone: hexRgb(style.getPropertyValue("--ew-bone")) ?? [232, 223, 208],
    lacquer: hexRgb(style.getPropertyValue("--ew-lacquer")) ?? [199, 58, 58],
  };
}

function rgba(rgb: [number, number, number], alpha: number) {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function paintSkyLabel(
  context: CanvasRenderingContext2D,
  name: string,
  px: number,
  py: number,
  width: number,
  height: number,
  color: [number, number, number],
  alpha: number,
  placed: Array<{ x: number; y: number; w: number }>,
) {
  const text = name.toUpperCase();
  const textW = context.measureText(text).width;
  let x = px + 10;
  let y = py - 10;
  if (x + textW > width - 8) x = Math.max(8, px - 10 - textW);
  if (y < 14) y = py + 16;
  if (y > height - 6) y = py - 10;
  const hits = placed.some(
    (spot) =>
      x < spot.x + spot.w + 10 &&
      x + textW + 10 > spot.x &&
      Math.abs(spot.y - y) < 13,
  );
  if (hits) return;
  context.fillStyle = rgba(color, alpha);
  context.fillText(text, x, y);
  placed.push({ x, y, w: textW });
}

function drawSkyLabels(
  context: CanvasRenderingContext2D,
  active: Array<{ node: FieldNode; point: FieldPoint; weight: number }>,
  visitingKey: string | null,
  compact: boolean,
  width: number,
  height: number,
  foil: [number, number, number],
  glow: number,
) {
  context.font = '500 10px "Azeret Mono", ui-monospace, monospace';
  context.letterSpacing = "0.12em";
  const placed: Array<{ x: number; y: number; w: number }> = [];
  const guest = visitingKey
    ? active.find((entry) => entry.node.key === visitingKey)
    : null;
  if (guest) {
    const name = fieldVisitLabel(guest.node.family, guest.node.label);
    if (name) {
      paintSkyLabel(
        context,
        name,
        guest.point.x * width,
        guest.point.y * height,
        width,
        height,
        foil,
        0.94,
        placed,
      );
    }
  }
  active.forEach((entry) => {
    if (entry.node.key === visitingKey) return;
    if (compact && entry.node.family !== "place") return;
    const name = fieldStandingLabel(entry.node.family, entry.node.label);
    if (!name) return;
    paintSkyLabel(
      context,
      name,
      entry.point.x * width,
      entry.point.y * height,
      width,
      height,
      foil,
      Math.max(0.42, glow * 0.62) * entry.weight,
      placed,
    );
  });
}

function kindRgb(
  kind: FieldNode["kind"],
  palette: ReturnType<typeof paletteOf>,
) {
  if (kind === "ether") return palette.ether;
  if (kind === "foil") return palette.foil;
  return palette.bone;
}

export function TheaterField({
  seed,
  phase,
  releases,
  longitude,
}: {
  seed: number;
  phase: TheaterPhase;
  releases: FieldRelease[];
  longitude?: number | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();
  const nodes = useMemo(
    () => fieldNodesFromReleases(releases, seed, longitude),
    [longitude, releases, seed],
  );
  const nodesRef = useRef(nodes);
  const phaseRef = useRef(phase);
  nodesRef.current = nodes;
  phaseRef.current = phase;
  const opacityRef = useRef(new Map<string, number>());
  const glowRef = useRef(fieldDensity(phase).glow);
  const reachRef = useRef(fieldDensity(phase).reach);
  const driftRef = useRef(fieldDensity(phase).drift);
  const travelerRef = useRef<ReturnType<typeof startFieldTraveler>>(null);

  useEffect(() => {
    opacityRef.current.clear();
    travelerRef.current = null;
    glowRef.current = fieldDensity("reading").glow;
    reachRef.current = fieldDensity("reading").reach;
  }, [seed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const parent = canvas.parentElement ?? canvas;
    let frame = 0;
    let last = performance.now();

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      const nodes = nodesRef.current;
      const phase = phaseRef.current;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const rect = parent.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const ease = 0.055;
      const target = fieldDensity(phase);
      const motion = reduced.current ? 0 : target.drift;
      glowRef.current += (target.glow - glowRef.current) * ease;
      reachRef.current += (target.reach - reachRef.current) * ease;
      driftRef.current += (motion - driftRef.current) * ease;
      const glow = glowRef.current;
      const reach = reachRef.current;
      const drift = driftRef.current;
      const opacity = opacityRef.current;
      const liveKeys = new Set(nodes.map((node) => node.key));
      liveKeys.forEach((key) => {
        opacity.set(key, (opacity.get(key) ?? 0) + (1 - (opacity.get(key) ?? 0)) * ease);
      });
      [...opacity.keys()].forEach((key) => {
        if (liveKeys.has(key)) return;
        const next = (opacity.get(key) ?? 0) * (1 - ease);
        if (next < 0.02) opacity.delete(key);
        else opacity.set(key, next);
      });
      const time = now / 1000;
      const palette = paletteOf(parent);
      const aspect = height / Math.max(width, 1);
      const compact = width < 720;
      const mark = compact ? 1.22 : 1.08;

      context.clearRect(0, 0, width, height);

      const points = nodes.map((node) => fieldPoint(node, time, drift));
      const active = nodes
        .map((node, index) => ({
          node,
          point: points[index]!,
          weight: opacity.get(node.key) ?? 0,
        }))
        .filter((entry) => entry.weight > 0.04);
      const activePoints = active.map((entry) => entry.point);
      const activeNodes = active.map((entry) => entry.node);
      const triangles = fieldTriangles(activePoints, reach, aspect);
      const local = fieldSemanticEdges(activeNodes, activePoints, reach, aspect);
      const edges = [
        ...local,
        ...fieldSpanEdges(activeNodes, activePoints, local, aspect),
      ];

      triangles.forEach((triangle) => {
        const a = active[triangle.i]!;
        const b = active[triangle.j]!;
        const c = active[triangle.k]!;
        const alpha =
          triangle.strength * glow * 0.08 * Math.min(a.weight, b.weight, c.weight);
        if (alpha < 0.01) return;
        context.beginPath();
        context.moveTo(a.point.x * width, a.point.y * height);
        context.lineTo(b.point.x * width, b.point.y * height);
        context.lineTo(c.point.x * width, c.point.y * height);
        context.closePath();
        context.fillStyle = rgba(palette.foil, alpha);
        context.fill();
      });

      const pairs = edges.map((edge) => [
        active[edge.i]!.node.key,
        active[edge.j]!.node.key,
      ] as [string, string]);
      const walk = fieldWalk(
        active.map((entry) => entry.node),
        pairs,
      );
      if (!theaterSkyLive(phase)) {
        travelerRef.current = null;
      } else if (walk.length && !reduced.current) {
        travelerRef.current = travelerRef.current
          ? advanceFieldTraveler(travelerRef.current, walk, dt)
          : startFieldTraveler(walk);
      } else if (walk.length) {
        travelerRef.current = startFieldTraveler(walk);
      }
      const traveler = travelerRef.current;
      const byKey = new Map(active.map((entry) => [entry.node.key, entry]));

      edges.forEach((edge) => {
        const a = active[edge.i]!;
        const b = active[edge.j]!;
        const onPath =
          traveler &&
          ((traveler.from === a.node.key && traveler.to === b.node.key) ||
            (traveler.from === b.node.key && traveler.to === a.node.key));
        const alpha = edge.strength * glow * 0.62 * Math.min(a.weight, b.weight);
        if (alpha < 0.02 && !onPath) return;
        context.beginPath();
        context.moveTo(a.point.x * width, a.point.y * height);
        context.lineTo(b.point.x * width, b.point.y * height);
        context.strokeStyle = rgba(palette.foil, onPath ? Math.max(alpha, 0.72) : alpha);
        context.lineWidth = onPath ? 1.6 : 0.7 + edge.strength * 0.6;
        context.stroke();
      });

      if (traveler && fieldTravelerInTransit(traveler)) {
        const origin = byKey.get(traveler.from);
        const dest = byKey.get(traveler.to);
        if (origin && dest) {
          context.beginPath();
          context.moveTo(origin.point.x * width, origin.point.y * height);
          context.lineTo(dest.point.x * width, dest.point.y * height);
          context.strokeStyle = rgba(palette.foil, 0.78);
          context.lineWidth = 1.6;
          context.stroke();
        }
      }

      active.forEach((entry) => {
        const body = entry.node;
        const px = entry.point.x * width;
        const py = entry.point.y * height;
        const alpha = glow * entry.weight;
        if (alpha < 0.03) return;
        const rgb = kindRgb(body.kind, palette);
        const radius = (body.kind === "ether" ? 1.8 : 1.25) * body.size * mark;
        const halo = context.createRadialGradient(px, py, 0, px, py, radius * 3.4);
        halo.addColorStop(0, rgba(rgb, alpha * 0.42));
        halo.addColorStop(1, rgba(rgb, 0));
        context.fillStyle = halo;
        context.beginPath();
        context.arc(px, py, radius * 3.4, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = rgba(rgb, Math.min(1, alpha + 0.18));
        context.beginPath();
        context.arc(px, py, radius, 0, Math.PI * 2);
        context.fill();
      });

      if (traveler) {
        const origin = byKey.get(traveler.from);
        const dest = byKey.get(traveler.to) ?? origin;
        if (origin && dest) {
          const px =
            (origin.point.x + (dest.point.x - origin.point.x) * traveler.progress) *
            width;
          const py =
            (origin.point.y + (dest.point.y - origin.point.y) * traveler.progress) *
            height;
          context.beginPath();
          context.arc(px, py, 6.2, 0, Math.PI * 2);
          context.strokeStyle = rgba(palette.foil, 0.9);
          context.lineWidth = 1.3;
          context.stroke();
          context.beginPath();
          context.arc(px, py, 3.4, 0, Math.PI * 2);
          context.fillStyle = rgba(palette.lacquer, 0.96);
          context.fill();
        }
      }
      drawSkyLabels(
        context,
        active,
        traveler ? fieldTravelerVisiting(traveler) : null,
        compact,
        width,
        height,
        palette.foil,
        glow,
      );

      const missing = nodes.some((node) => (opacity.get(node.key) ?? 0) < 0.96);
      const settled =
        !missing &&
        Math.abs(target.glow - glow) < 0.012 &&
        Math.abs(target.reach - reach) < 0.003;
      const still =
        reduced.current || (!theaterSkyLive(phase) && drift < 0.02 && settled);
      if (!still) frame = window.requestAnimationFrame(draw);
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    frame = window.requestAnimationFrame(draw);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [seed]);

  return (
    <canvas
      ref={canvasRef}
      className="ew-theater-field"
      data-phase={phase}
      data-nodes={String(releases.length)}
      aria-hidden="true"
    />
  );
}

function MeridianIcon({ kind }: { kind: MeridianKind }) {
  if (kind === "youtube") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <rect
          x="1.25"
          y="3.25"
          width="13.5"
          height="9.5"
          rx="2.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
        />
        <path d="M6.6 6.15v3.7L10.4 8z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "wiki") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M2.2 4.2 5 12.1h.1L8 5.4l2.9 6.7h.1L13.8 4.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="5.1" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="8" cy="8" r="1.15" fill="currentColor" />
    </svg>
  );
}

export function TheaterWell({
  phase,
  dispatchBody,
  summary,
  facts,
  imageUrl,
  links,
  track,
}: {
  phase: TheaterPhase;
  dispatchBody: string | null;
  summary: string | null;
  facts: TheaterFact[];
  imageUrl?: string | null;
  links?: TheaterLink[];
  track?: string | null;
}) {
  const aria = theaterWellAria(phase);
  const plate = sanitizeArtworkUrl(imageUrl);
  const [plateFailed, setPlateFailed] = useState(false);
  useEffect(() => {
    setPlateFailed(false);
  }, [plate]);
  const meridians = (links ?? [])
    .map((link) => {
      const url = safeExternalUrl(link.url);
      if (!url) return null;
      const label = link.label.trim();
      return { label, url, kind: meridianKind(url, label) };
    })
    .filter(
      (link): link is { label: string; url: string; kind: MeridianKind } =>
        Boolean(link),
    );
  const coverTitle = track?.trim() || null;
  const showPlate = Boolean(plate && !plateFailed);
  const showCover =
    phase === "filed" && Boolean(showPlate || summary || coverTitle);
  return (
    <div
      className={`ew-theater-well${phase === "filed" ? " is-filed" : ""}`}
      data-phase={phase}
      role={aria ? "status" : undefined}
      aria-live={aria ? "polite" : undefined}
      aria-label={aria}
    >
      <i className="ew-cover-rule" />
      {dispatchBody ? <p className="ew-caption">{dispatchBody}</p> : null}
      {phase === "filed" ? (
        <>
          {showCover ? (
            <div className={`ew-cover-row${showPlate ? "" : " is-bare"}`}>
              {showPlate ? (
                <figure className="ew-plate">
                  <img
                    src={plate!}
                    alt=""
                    onError={() => {
                      markArtworkUrlFailed(plate!);
                      setPlateFailed(true);
                    }}
                  />
                </figure>
              ) : null}
              <div>
                {coverTitle ? <p className="ew-cover-title">{coverTitle}</p> : null}
                {summary ? <p className="ew-caption">{summary}</p> : null}
              </div>
            </div>
          ) : null}
          {facts.length > 0 ? (
            <ol className="ew-journey">
              {facts.map((item) => (
                <li key={`${item.label}:${item.value}`}>
                  <i className="ew-journey-star" />
                  <span className="ew-journey-value">{item.value}</span>
                  <span className="ew-journey-label">{item.label}</span>
                </li>
              ))}
            </ol>
          ) : null}
          {meridians.length > 0 ? (
            <p className="ew-meridians">
              {meridians.map((link) => (
                <a
                  key={`${link.label}:${link.url}`}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MeridianIcon kind={link.kind} />
                  {link.label}
                </a>
              ))}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
