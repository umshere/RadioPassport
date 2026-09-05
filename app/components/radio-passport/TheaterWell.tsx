import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  meridianDomain,
  meridianKind,
  type MeridianKind,
  type TheaterFact,
  type TheaterLink,
} from "./productFlow";
import { safeExternalUrl } from "./stationInsights";
import { grainPath } from "./halftone";
import {
  markArtworkUrlFailed,
  sanitizeArtworkUrl,
} from "~/utils/stations";
import type { TriviaGraph } from "~/types/trivia";
import { EMPTY_GRAPH } from "~/types/trivia";
import type {
  KnowledgeEdge,
  KnowledgeSeat,
  PositionedKnowledgeNode,
} from "~/types/knowledge";
import { TheaterNodes } from "~/components/radio-passport/knowledge/TheaterNodes";
import {
  advanceFieldTraveler,
  FIELD_LINE_WEIGHT,
  GRAPH_PULSE_MS,
  fieldBirthBloom,
  fieldBirthRipple,
  fieldDensity,
  fieldDensestPoint,
  fieldDust,
  fieldDustAlpha,
  fieldDustPoint,
  fieldDustTwinkle,
  fieldEdgeShimmer,
  fieldGraphPulse,
  fieldMilkyWay,
  fieldShootingStar,
  fieldHopRelation,
  fieldKnowledgeEdges,
  fieldNebulaAlpha,
  fieldNebulae,
  fieldNodesFromReleases,
  fieldPoint,
  fieldSemanticEdges,
  fieldSpanEdges,
  FIELD_STRUCTURE_MS,
  fieldStarTwinkle,
  fieldStructureProgress,
  fieldStructureReady,
  nodeHasId,
  fieldStructuredTargets,
  fieldTourSpans,
  fieldTravelerInTransit,
  fieldTravelerVisiting,
  fieldStandingLabel,
  fieldVisitLabel,
  fieldWalk,
  fieldTriangles,
  hexRgb,
  lockSeed,
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

/** Phone sky from Theater.html: three foil meridians, a handful of dust grains. */
function drawBoardSky(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: { foil: [number, number, number]; bone: [number, number, number] },
  grains: Array<{ x: number; y: number; size: number; depth: number }>,
) {
  context.save();
  context.scale(width / 390, height / 236);
  context.strokeStyle = rgba(palette.foil, 0.16);
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, 60);
  context.bezierCurveTo(70, 86, 150, 94, 220, 82);
  context.bezierCurveTo(290, 70, 340, 42, 390, 16);
  context.stroke();
  context.beginPath();
  context.moveTo(0, 132);
  context.bezierCurveTo(60, 166, 140, 180, 214, 168);
  context.bezierCurveTo(286, 154, 336, 126, 390, 96);
  context.stroke();
  context.beginPath();
  context.moveTo(0, 196);
  context.bezierCurveTo(66, 218, 148, 222, 216, 206);
  context.bezierCurveTo(284, 190, 338, 168, 390, 142);
  context.stroke();
  context.restore();
  grains.slice(0, 12).forEach((grain, index) => {
    if (index % 2) return;
    context.fillStyle = rgba(palette.bone, 0.28);
    context.beginPath();
    context.arc(grain.x * width, grain.y * height, 1.05, 0, Math.PI * 2);
    context.fill();
  });
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
  pinned?: Set<string>,
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
    const isPinned = pinned?.has(entry.node.key) ?? false;
    if (compact && entry.node.family !== "place" && !isPinned) return;
    const name = isPinned
      ? entry.node.label
      : fieldStandingLabel(entry.node.family, entry.node.label, entry.node.origin);
    if (!name) return;
    paintSkyLabel(
      context,
      name,
      entry.point.x * width,
      entry.point.y * height,
      width,
      height,
      foil,
      (isPinned ? 0.66 : Math.max(0.42, glow * 0.62)) * entry.weight,
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

function knowledgeTint(
  kind: PositionedKnowledgeNode["kind"],
  palette: ReturnType<typeof paletteOf>,
): [number, number, number] {
  if (
    kind === "language" ||
    kind === "year" ||
    kind === "genre" ||
    kind === "city" ||
    kind === "place"
  ) {
    return palette.ether;
  }
  if (kind === "event") return palette.lacquer;
  if (kind === "station" || kind === "track") return palette.bone;
  return palette.foil;
}

/** The navigable knowledge layer handed in from /listen — the Room owns the
 * merged graph; the field only draws and offers clicks. */
export type TheaterKnowledgeLayer = {
  nodes: PositionedKnowledgeNode[];
  edges: KnowledgeEdge[];
  awakeIds: Set<string>;
  firing: Array<{ from: string; to: string }>;
  focusId: string | null;
  tunedId?: string | null;
  onSelect: (id: string) => void;
};

export function TheaterField({
  seed,
  phase,
  releases,
  longitude,
  graph = EMPTY_GRAPH,
  focusId = null,
  knowledge,
}: {
  seed: number;
  phase: TheaterPhase;
  releases: FieldRelease[];
  longitude?: number | null;
  graph?: TriviaGraph | null;
  focusId?: string | null;
  knowledge?: TheaterKnowledgeLayer;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reduced = usePrefersReducedMotion();
  const knowledgeRef = useRef<TheaterKnowledgeLayer | null>(knowledge ?? null);
  knowledgeRef.current = knowledge ?? null;
  const firingAtRef = useRef(new Map<string, number>());
  const nodes = useMemo(
    () => fieldNodesFromReleases(releases, seed, longitude),
    [longitude, releases, seed],
  );
  const dust = useMemo(() => fieldDust(seed), [seed]);
  const band = useMemo(() => fieldMilkyWay(seed), [seed]);
  const nebulae = useMemo(
    () =>
      fieldNebulae(
        seed,
        fieldDensestPoint(nodes.map((node) => ({ x: node.x, y: node.y }))),
      ),
    [nodes, seed],
  );
  const nodesRef = useRef(nodes);
  const phaseRef = useRef(phase);
  const graphRef = useRef(graph ?? EMPTY_GRAPH);
  const dustRef = useRef(dust);
  const bandRef = useRef(band);
  const nebulaeRef = useRef(nebulae);
  // The graph's arrival is a moment: one foil pulse across its edges.
  const graphPulseRef = useRef<number | null>(null);
  const graphEdgesRef = useRef(0);
  nodesRef.current = nodes;
  phaseRef.current = phase;
  graphRef.current = graph ?? EMPTY_GRAPH;
  dustRef.current = dust;
  bandRef.current = band;
  nebulaeRef.current = nebulae;
  const opacityRef = useRef(new Map<string, number>());
  const birthRef = useRef(new Map<string, number>());
  const warmthRef = useRef(new Map<string, number>());
  const glowRef = useRef(fieldDensity(phase).glow);
  const reachRef = useRef(fieldDensity(phase).reach);
  const driftRef = useRef(fieldDensity(phase).drift);
  const travelerRef = useRef<ReturnType<typeof startFieldTraveler>>(null);
  // Semantic figure state: where connected stars settle, when they began
  // moving, and which shape definition produced them.
  const structureRef = useRef(new Map<string, { x: number; y: number }>());
  const structureSignatureRef = useRef("");
  const structureStartRef = useRef<number | null>(null);
  const focusRef = useRef(focusId);
  focusRef.current = focusId;
  // The draw loop stops itself once the sky settles; a later dossier upgrade
  // (free facts, AI graph) needs one kick to paint the new stars.
  const repaintRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    opacityRef.current.clear();
    birthRef.current.clear();
    warmthRef.current.clear();
    travelerRef.current = null;
    structureRef.current.clear();
    structureSignatureRef.current = "";
    structureStartRef.current = null;
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
      const graph = graphRef.current;
      const stillSky = reduced.current;
      const edgeCount = graph.edges.length;
      if (edgeCount > graphEdgesRef.current) graphPulseRef.current = now;
      graphEdgesRef.current = edgeCount;
      const pulseAge =
        graphPulseRef.current === null ? null : now - graphPulseRef.current;
      if (pulseAge !== null && pulseAge > GRAPH_PULSE_MS) {
        graphPulseRef.current = null;
      }
      const graphPulse = stillSky ? 0 : fieldGraphPulse(pulseAge, false);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const rect = parent.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const ease = 0.055;
      const target = fieldDensity(phase);
      const live = theaterSkyLive(phase);
      const motion = stillSky ? 0 : target.drift;
      glowRef.current += (target.glow - glowRef.current) * ease;
      reachRef.current += (target.reach - reachRef.current) * ease;
      driftRef.current += (motion - driftRef.current) * ease;
      const glow = glowRef.current;
      const reach = reachRef.current;
      const drift = driftRef.current;
      const opacity = opacityRef.current;
      const births = birthRef.current;
      const warmth = warmthRef.current;
      const liveKeys = new Set(nodes.map((node) => node.key));
      const inhabited = [...opacity.values()].some((value) => value > 0.9);
      liveKeys.forEach((key) => {
        if (!births.has(key)) births.set(key, inhabited ? now : 0);
        opacity.set(key, (opacity.get(key) ?? 0) + (1 - (opacity.get(key) ?? 0)) * ease);
      });
      [...opacity.keys()].forEach((key) => {
        if (liveKeys.has(key)) return;
        const next = (opacity.get(key) ?? 0) * (1 - ease);
        if (next < 0.02) {
          opacity.delete(key);
          births.delete(key);
          warmth.delete(key);
        } else opacity.set(key, next);
      });
      const time = now / 1000;
      const palette = paletteOf(parent);
      const aspect = height / Math.max(width, 1);
      const compact = width < 720;
      const mark = compact ? 1.22 : 1.08;

      context.clearRect(0, 0, width, height);

      if (width <= 960) {
        drawBoardSky(context, width, height, palette, dustRef.current);
        frame = 0;
        return;
      }

      const sky = bandRef.current;
      {
        const span = Math.hypot(width, height);
        const half = sky.width * Math.max(width, height) * 1.6;
        context.save();
        context.translate(sky.cx * width, sky.cy * height);
        context.rotate(sky.angle);
        const river = context.createLinearGradient(0, -half, 0, half);
        river.addColorStop(0, rgba(palette.bone, 0));
        river.addColorStop(0.5, rgba(palette.bone, 0.05));
        river.addColorStop(1, rgba(palette.bone, 0));
        context.fillStyle = river;
        context.fillRect(-span, -half, span * 2, half * 2);
        context.restore();
      }

      dustRef.current.forEach((grain) => {
        const point = fieldDustPoint(grain, time, live, stillSky);
        const twinkle = fieldDustTwinkle(time, grain.freq, grain.phase, stillSky);
        const alpha = fieldDustAlpha(grain.depth) * twinkle;
        if (alpha < 0.02) return;
        const tint =
          grain.tint === "bone"
            ? palette.bone
            : grain.tint === "ether"
              ? palette.ether
              : palette.foil;
        const px = point.x * width;
        const py = point.y * height;
        context.fillStyle = rgba(tint, Math.min(0.44, alpha));
        context.beginPath();
        context.arc(px, py, grain.size, 0, Math.PI * 2);
        context.fill();
        if (grain.flare) {
          const ray = grain.size * (4.4 + 1.8 * twinkle);
          context.strokeStyle = rgba(tint, Math.min(0.3, alpha * 0.8));
          context.lineWidth = 0.5;
          context.beginPath();
          context.moveTo(px - ray, py);
          context.lineTo(px + ray, py);
          context.moveTo(px, py - ray);
          context.lineTo(px, py + ray);
          context.stroke();
        }
      });

      // Knowledge layer: awake catalog/research nodes glow under their DOM
      // buttons; a firing edge sends one bright sweep from the known star to
      // the newly woken one — the neuron reading, drawn once per arrival.
      const layer = knowledgeRef.current;
      const knowledgeSky = Boolean(layer && layer.nodes.length);
      if (layer && layer.awakeIds.size) {
        const now = time * 1000;
        for (const fire of layer.firing) {
          const key = `${fire.from}>${fire.to}`;
          if (!firingAtRef.current.has(key)) {
            firingAtRef.current.set(key, Date.now());
          }
        }
        const seatOf = (id: string) => layer.nodes.find((n) => n.id === id);
        for (const edge of layer.edges) {
          const a = seatOf(edge.from);
          const b = seatOf(edge.to);
          if (!a || !b) continue;
          if (!layer.awakeIds.has(edge.to)) continue;
          const x1 = a.x * width;
          const y1 = a.y * height;
          const x2 = b.x * width;
          const y2 = b.y * height;
          const baseAlpha =
            edge.provenance === "musicbrainz"
              ? 0.5
              : edge.provenance === "web"
                ? 0.34
                : 0.22;
          context.strokeStyle = rgba(
            knowledgeTint(b.kind, palette),
            baseAlpha * glow,
          );
          context.lineWidth = edge.provenance === "musicbrainz" ? 1 : 0.7;
          context.beginPath();
          context.moveTo(x1, y1);
          context.lineTo(x2, y2);
          context.stroke();
          // The pulse: one sweep per firing, then the edge rests.
          const firedAt = firingAtRef.current.get(`${edge.from}>${edge.to}`);
          if (firedAt !== undefined) {
            const age = (Date.now() - firedAt) / 900;
            if (age >= 0 && age <= 1) {
              const px = x1 + (x2 - x1) * age;
              const py = y1 + (y2 - y1) * age;
              const pulseAlpha = (1 - age) * 0.9;
              context.fillStyle = rgba(palette.bone, pulseAlpha);
              context.beginPath();
              context.arc(px, py, 2.2, 0, Math.PI * 2);
              context.fill();
              context.strokeStyle = rgba(palette.bone, pulseAlpha * 0.7);
              context.lineWidth = 1.4;
              context.beginPath();
              context.moveTo(x1, y1);
              context.lineTo(px, py);
              context.stroke();
            }
          }
        }
        for (const node of layer.nodes) {
          if (!layer.awakeIds.has(node.id)) continue;
          const rgb = knowledgeTint(node.kind, palette);
          const px = node.x * width;
          const py = node.y * height;
          const focused = node.id === layer.focusId;
          context.fillStyle = rgba(rgb, focused ? 0.55 : 0.28);
          context.beginPath();
          context.arc(px, py, focused ? 4.2 : 2.4, 0, Math.PI * 2);
          context.fill();
        }
      }

      // Semantic figure: when the verified graph can hold a shape, connected
      // stars glide from their sky drift into deterministic stations — focus
      // centre, kind-sector rings — while everything else keeps drifting.
      const graphReady = fieldStructureReady(nodes, graph);
      const signature = `${seed}|${focusRef.current ?? ""}|${graph.edges
        .map((edge) => `${edge.from}>${edge.to}`)
        .join(",")}|${nodes.map((node) => node.key).join(",")}`;
      if (!graphReady) {
        if (structureSignatureRef.current !== "") {
          structureSignatureRef.current = "";
          structureRef.current.clear();
        }
        structureStartRef.current = null;
      } else if (structureSignatureRef.current !== signature) {
        // Rebuilding keeps every surviving station pinned verbatim, so a
        // growing figure never drags stars that were already filed.
        const previous =
          structureRef.current.size > 0 ? structureRef.current : null;
        structureRef.current = fieldStructuredTargets(
          nodes,
          graph,
          previous,
          focusRef.current,
          seed,
        );
        const beginning = previous === null;
        structureSignatureRef.current = signature;
        if (beginning || structureStartRef.current === null) {
          structureStartRef.current = now;
        }
      }
      const structureProgress =
        graphReady && structureRef.current.size > 0
          ? fieldStructureProgress(
              structureStartRef.current === null
                ? FIELD_STRUCTURE_MS
                : now - structureStartRef.current,
              stillSky,
            )
          : 0;
      const points = nodes.map((node) => {
        const home = fieldPoint(node, time, drift);
        const target = structureRef.current.get(node.key);
        if (!target || structureProgress <= 0) return home;
        // A settled star keeps a breath of life: the station holds while the
        // light sways a hair around it (never under reduced motion).
        const sway = stillSky ? 0 : structureProgress * 0.0032;
        const phase = lockSeed([seed, node.key]) % (Math.PI * 2);
        return {
          x:
            home.x +
            (target.x - home.x) * structureProgress +
            Math.sin(time * 0.5 + phase) * sway,
          y:
            home.y +
            (target.y - home.y) * structureProgress +
            Math.cos(time * 0.43 + phase * 1.7) * sway * 0.8,
        };
      });
      nebulaeRef.current.forEach((cloud) => {
        const alpha = fieldNebulaAlpha(cloud, time, stillSky);
        if (alpha < 0.008) return;
        const cx = cloud.x * width;
        const cy = cloud.y * height;
        const radius = cloud.radius * Math.max(width, height);
        const wash = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
        const tint =
          cloud.tint === "ether"
            ? palette.ether
            : cloud.tint === "bone"
              ? palette.bone
              : palette.foil;
        wash.addColorStop(0, rgba(tint, alpha));
        wash.addColorStop(1, rgba(tint, 0));
        context.fillStyle = wash;
        context.beginPath();
        context.arc(cx, cy, radius, 0, Math.PI * 2);
        context.fill();
        if (!reduced.current) grainPath(context, 0.06);
      });

      const active = nodes
        .map((node, index) => ({
          node,
          point: points[index]!,
          weight: opacity.get(node.key) ?? 0,
        }))
        .filter((entry) => entry.weight > 0.04);
      const activePoints = active.map((entry) => entry.point);
      const activeNodes = active.map((entry) => entry.node);
      if (!knowledgeSky) {
      const triangles = fieldTriangles(activePoints, reach, aspect);
      const local = fieldSemanticEdges(activeNodes, activePoints, reach, aspect);
      const knowledge = fieldKnowledgeEdges(activeNodes, graph.edges);
      const knowledgeReady = knowledge.filter((edge) => {
        const weight = Math.min(
          active[edge.i]!.weight,
          active[edge.j]!.weight,
        );
        return weight >= FIELD_LINE_WEIGHT;
      });
      const knowledgeKeys = new Set(
        knowledgeReady.map((edge) => `${edge.i}:${edge.j}`),
      );
      const edges = [
        ...local,
        ...fieldSpanEdges(activeNodes, activePoints, local, aspect),
      ];

      // Once the figure stands, its decorative backdrop recedes: proximity
      // threads touching structured stars fade to a whisper so the knowledge
      // spine reads alone.
      const decorativeDim = (key: string) =>
        structureRef.current.has(key) ? 1 - 0.68 * structureProgress : 1;
      triangles.forEach((triangle) => {
        const a = active[triangle.i]!;
        const b = active[triangle.j]!;
        const c = active[triangle.k]!;
        const dim = Math.min(
          decorativeDim(a.node.key),
          decorativeDim(b.node.key),
          decorativeDim(c.node.key),
        );
        const alpha =
          triangle.strength *
          glow *
          0.055 *
          dim *
          Math.min(a.weight, b.weight, c.weight);
        if (alpha < 0.01) return;
        context.beginPath();
        context.moveTo(a.point.x * width, a.point.y * height);
        context.lineTo(b.point.x * width, b.point.y * height);
        context.lineTo(c.point.x * width, c.point.y * height);
        context.closePath();
        context.fillStyle = rgba(palette.foil, alpha);
        context.fill();
      });

      const walkNodes = active
        .filter((entry) => entry.weight >= FIELD_LINE_WEIGHT)
        .map((entry) => entry.node);
      const walkKeys = new Set(walkNodes.map((node) => node.key));
      const pairs = edges
        .filter(
          (edge) =>
            walkKeys.has(active[edge.i]!.node.key) &&
            walkKeys.has(active[edge.j]!.node.key),
        )
        .map(
          (edge) =>
            [active[edge.i]!.node.key, active[edge.j]!.node.key] as [
              string,
              string,
            ],
        );
      const preferred = knowledgeReady.map(
        (edge) =>
          [active[edge.i]!.node.key, active[edge.j]!.node.key] as [
            string,
            string,
          ],
      );
      const walk = fieldWalk(walkNodes, pairs, preferred);
      const drawnPairs = [
        ...edges.map(
          (edge) =>
            [active[edge.i]!.node.key, active[edge.j]!.node.key] as [
              string,
              string,
            ],
        ),
        ...knowledge.map(
          (edge) =>
            [active[edge.i]!.node.key, active[edge.j]!.node.key] as [
              string,
              string,
            ],
        ),
      ];
      const mesh = [
        ...edges,
        ...fieldTourSpans(walk, activeNodes, drawnPairs),
      ];
      if (!live) {
        travelerRef.current = null;
      } else if (walk.length && !stillSky) {
        travelerRef.current = travelerRef.current
          ? advanceFieldTraveler(travelerRef.current, walk, dt)
          : startFieldTraveler(walk);
      } else if (walk.length) {
        travelerRef.current = startFieldTraveler(walk);
      }
      const traveler = travelerRef.current;
      const byKey = new Map(active.map((entry) => [entry.node.key, entry]));
      const visiting = traveler ? fieldTravelerVisiting(traveler) : null;
      active.forEach((entry) => {
        const current = warmth.get(entry.node.key) ?? 0;
        const next =
          entry.node.key === visiting
            ? Math.min(1, current + dt * 3.2)
            : current * 0.92;
        if (next < 0.02) warmth.delete(entry.node.key);
        else warmth.set(entry.node.key, next);
      });

      mesh.forEach((edge) => {
        if (knowledgeKeys.has(`${edge.i}:${edge.j}`)) return;
        const a = active[edge.i]!;
        const b = active[edge.j]!;
        const onPath =
          traveler &&
          ((traveler.from === a.node.key && traveler.to === b.node.key) ||
            (traveler.from === b.node.key && traveler.to === a.node.key));
        const alpha =
          edge.strength *
          glow *
          0.72 *
          Math.min(a.weight, b.weight) *
          Math.min(decorativeDim(a.node.key), decorativeDim(b.node.key));
        if (alpha < 0.02 && !onPath) return;
        context.beginPath();
        context.moveTo(a.point.x * width, a.point.y * height);
        context.lineTo(b.point.x * width, b.point.y * height);
        context.strokeStyle = rgba(palette.foil, onPath ? Math.max(alpha, 0.72) : alpha);
        context.lineWidth = onPath ? 1.5 : 0.8 + edge.strength * 0.55;
        context.stroke();
      });

      knowledge.forEach((edge) => {
        const a = active[edge.i]!;
        const b = active[edge.j]!;
        const onPath =
          traveler &&
          ((traveler.from === a.node.key && traveler.to === b.node.key) ||
            (traveler.from === b.node.key && traveler.to === a.node.key));
        // The landing pulse lifts every knowledge thread for one breath.
        const alpha = Math.min(
          1,
          glow * 0.88 * Math.min(a.weight, b.weight) * (1 + graphPulse * 0.7),
        );
        const x1 = a.point.x * width;
        const y1 = a.point.y * height;
        const x2 = b.point.x * width;
        const y2 = b.point.y * height;
        const pulse = fieldEdgeShimmer(
          lockSeed([a.node.key, b.node.key]),
          time,
          stillSky,
        );
        const midX = x1 + (x2 - x1) * pulse;
        const midY = y1 + (y2 - y1) * pulse;
        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.strokeStyle = rgba(palette.foil, onPath ? Math.max(alpha, 0.9) : alpha);
        context.lineWidth = onPath ? 2 : 1.35 + graphPulse * 0.9;
        context.stroke();
        if (!stillSky) {
          context.beginPath();
          context.arc(midX, midY, 1.35, 0, Math.PI * 2);
          context.fillStyle = rgba(palette.bone, 0.55);
          context.fill();
        }
      });

      if (traveler && fieldTravelerInTransit(traveler)) {
        const origin = byKey.get(traveler.from);
        const dest = byKey.get(traveler.to);
        if (origin && dest) {
          const x1 = origin.point.x * width;
          const y1 = origin.point.y * height;
          const x2 = dest.point.x * width;
          const y2 = dest.point.y * height;
          context.beginPath();
          context.moveTo(x1, y1);
          context.lineTo(x2, y2);
          context.strokeStyle = rgba(palette.foil, 0.78);
          context.lineWidth = 1.6;
          context.stroke();
          const relation = fieldHopRelation(
            traveler.from,
            traveler.to,
            activeNodes,
            knowledge,
          );
          if (relation) {
            const fade =
              traveler.progress < 0.18
                ? traveler.progress / 0.18
                : traveler.progress > 0.82
                  ? (1 - traveler.progress) / 0.18
                  : 1;
            context.font = '500 9px "Azeret Mono", ui-monospace, monospace';
            context.letterSpacing = "0.08em";
            context.fillStyle = rgba(palette.foil, 0.72 * fade);
            context.fillText(
              relation,
              (x1 + x2) / 2 - context.measureText(relation).width / 2,
              (y1 + y2) / 2 - 6,
            );
          }
        }
      }
      } else {
        travelerRef.current = null;
      }

      active.forEach((entry) => {
        const body = entry.node;
        const px = entry.point.x * width;
        const py = entry.point.y * height;
        const twinkle = fieldStarTwinkle(time, body.freq, body.phase, stillSky);
        const alpha =
          glow * entry.weight * twinkle * (knowledgeSky ? 0.28 : 1);
        if (alpha < 0.03) return;
        const rgb = kindRgb(body.kind, palette);
        const bornAt = births.get(body.key) ?? 0;
        const age = bornAt > 0 ? now - bornAt : null;
        const bloom = fieldBirthBloom(age, stillSky);
        const visit = 1 + 0.5 * (warmth.get(body.key) ?? 0);
        const radius =
          (body.kind === "ether" ? 1.8 : 1.25) * body.size * mark * bloom;
        const haloR = radius * 3.4 * visit;
        const halo = context.createRadialGradient(px, py, 0, px, py, haloR);
        halo.addColorStop(0, rgba(rgb, alpha * 0.42 * visit));
        halo.addColorStop(1, rgba(rgb, 0));
        context.fillStyle = halo;
        context.beginPath();
        context.arc(px, py, haloR, 0, Math.PI * 2);
        context.fill();
        const ripple = fieldBirthRipple(age, stillSky);
        if (ripple) {
          context.beginPath();
          context.arc(px, py, radius * ripple.radius, 0, Math.PI * 2);
          context.strokeStyle = rgba(palette.foil, ripple.alpha * 0.7);
          context.lineWidth = 1.1;
          context.stroke();
        }
        context.fillStyle = rgba(rgb, Math.min(1, alpha + 0.18));
        context.beginPath();
        context.arc(px, py, radius, 0, Math.PI * 2);
        context.fill();
      });

      if (!knowledgeSky && travelerRef.current) {
        const traveler = travelerRef.current;
        const byKey = new Map(active.map((entry) => [entry.node.key, entry]));
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

      const meteor = fieldShootingStar(seed, time, {
        live,
        reduced: stillSky,
      });
      if (meteor) {
        const flash = Math.sin(Math.PI * meteor.progress);
        const hx = (meteor.x0 + (meteor.x1 - meteor.x0) * meteor.progress) * width;
        const hy = (meteor.y0 + (meteor.y1 - meteor.y0) * meteor.progress) * height;
        const tx = hx - (meteor.x1 - meteor.x0) * 0.28 * width;
        const ty = hy - (meteor.y1 - meteor.y0) * 0.28 * height;
        const streak = context.createLinearGradient(tx, ty, hx, hy);
        streak.addColorStop(0, rgba(palette.bone, 0));
        streak.addColorStop(1, rgba(palette.bone, 0.66 * flash));
        context.beginPath();
        context.moveTo(tx, ty);
        context.lineTo(hx, hy);
        context.strokeStyle = streak;
        context.lineWidth = 1;
        context.stroke();
        context.beginPath();
        context.arc(hx, hy, 1.2, 0, Math.PI * 2);
        context.fillStyle = rgba(palette.bone, 0.8 * flash);
        context.fill();
      }

      {
        const cx = width / 2;
        const cy = height / 2;
        const edge = Math.hypot(cx, cy);
        const vignette = context.createRadialGradient(
          cx,
          cy,
          edge * 0.55,
          cx,
          cy,
          edge,
        );
        vignette.addColorStop(0, "rgba(6, 5, 3, 0)");
        vignette.addColorStop(1, "rgba(6, 5, 3, 0.32)");
        context.fillStyle = vignette;
        context.fillRect(0, 0, width, height);
      }
      if (!knowledgeSky) {
      const visiting = travelerRef.current
        ? fieldTravelerVisiting(travelerRef.current)
        : null;
      let pinnedLabels: Set<string> | undefined;
      if (structureProgress > 0.5 && structureRef.current.size) {
        const degreeByKey = new Map<string, number>();
        for (const edge of graph.edges) {
          degreeByKey.set(edge.from, (degreeByKey.get(edge.from) ?? 0) + 1);
          degreeByKey.set(edge.to, (degreeByKey.get(edge.to) ?? 0) + 1);
        }
        const idToKey = new Map(
          nodes.map((node) => {
            const graphNode = graph.nodes.find((entry) =>
              nodeHasId(node, entry.id),
            );
            return [graphNode?.id ?? node.key, node.key] as const;
          }),
        );
        pinnedLabels = new Set(
          [...degreeByKey.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([id]) => idToKey.get(id))
            .filter((key): key is string => Boolean(key)),
        );
      }
      drawSkyLabels(
        context,
        active,
        visiting,
        compact,
        width,
        height,
        palette.foil,
        glow,
        pinnedLabels,
      );
      }

      const missing = nodes.some((node) => (opacity.get(node.key) ?? 0) < 0.96);
      const settled =
        !missing &&
        Math.abs(target.glow - glow) < 0.012 &&
        Math.abs(target.reach - reach) < 0.003;
      const pulseAlive = [...firingAtRef.current.values()].some(
        (started) => Date.now() - started < 900,
      );
      const still =
        !pulseAlive && (stillSky || (!live && drift < 0.02 && settled));
      if (!still) frame = window.requestAnimationFrame(draw);
      else frame = 0; // settled — a later repaint kick may restart us
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    frame = window.requestAnimationFrame(draw);
    repaintRef.current = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(draw);
    };
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      frame = 0;
      repaintRef.current = null;
    };
  }, [seed]);

  useEffect(() => {
    repaintRef.current?.();
  }, [releases, phase, knowledge?.nodes.length, knowledge?.firing.length]);

  return (
    <div className="ew-theater-field-wrap">
      <canvas
        ref={canvasRef}
        className="ew-theater-field"
        data-phase={phase}
        data-nodes={String(releases.length)}
        aria-hidden="true"
      />
      {knowledge && knowledge.nodes.length ? (
        <TheaterNodes
          nodes={knowledge.nodes}
          focusId={knowledge.focusId}
          tunedId={knowledge.tunedId ?? null}
          reducedMotion={reduced.current}
          onSelect={knowledge.onSelect}
        />
      ) : null}
    </div>
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

function TheaterLetter({
  text,
  signed,
}: {
  text: string;
  signed?: boolean;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [needed, setNeeded] = useState(false);

  useEffect(() => {
    setOpen(false);
    setNeeded(false);
  }, [text]);

  useEffect(() => {
    const node = ref.current;
    if (!node || open) return;
    const check = () => {
      if (node.scrollHeight > node.clientHeight + 1) setNeeded(true);
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(node);
    return () => observer.disconnect();
  }, [open, text]);

  return (
    <div className={`ew-letter${open ? " is-open" : ""}`}>
      <p ref={ref} className="ew-caption">
        {text}
      </p>
      {signed && !open ? <span className="ew-letter-sign">— night desk</span> : null}
      {needed ? (
        <button
          type="button"
          className="ew-letter-more"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "less" : "more"}
        </button>
      ) : null}
    </div>
  );
}

export function TheaterWell({
  phase,
  dispatchBody,
  deskSigned,
  summary,
  facts,
  imageUrl,
  links,
  track,
  catalog,
  children,
}: {
  phase: TheaterPhase;
  dispatchBody: string | null;
  deskSigned?: boolean;
  summary: string | null;
  facts: TheaterFact[];
  imageUrl?: string | null;
  links?: TheaterLink[];
  track?: string | null;
  catalog?: {
    land?: string | null;
    city?: string | null;
    spoken?: string | null;
    signal?: string | null;
  };
  children?: ReactNode;
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
      const host = meridianDomain(url);
      return { label, url, kind: meridianKind(url, label), host };
    })
    .filter(
      (
        link,
      ): link is {
        label: string;
        url: string;
        kind: MeridianKind;
        host: string;
      } => Boolean(link),
    );
  const coverTitle = track?.trim() || null;
  const showPlate = Boolean(plate && !plateFailed);
  const icy = Boolean(coverTitle);
  const filed = phase === "filed";
  const titleParts = coverTitle
    ? coverTitle.split(/\s+[—–-]\s+/)
    : [];
  const trackArtist = titleParts.length > 1 ? titleParts[0] : null;
  const trackName =
    titleParts.length > 1 ? titleParts.slice(1).join(" — ") : coverTitle;
  // Knowledge 02 seats the plate as soon as a title exists. trivia empty/error
  // keeps theaterPhase at quiet — the desk still shows the cover, it never
  // invents facts.
  const showCover = icy;
  const catalogRows: Array<[string, string]> = [];
  for (const [label, value] of [
    ["Land", catalog?.land],
    ["City", catalog?.city],
    ["Spoken", catalog?.spoken],
    ["Signal", catalog?.signal],
  ] as const) {
    const text = value?.trim();
    if (text) catalogRows.push([label, text]);
  }
  const catalogLine = catalogRows.map(([, value]) => value).join(" · ");
  const waiting = icy
    ? phase === "locking"
      ? "Reading the live title"
      : null
    : "No title on the air yet";
  return (
    <div
      className={`ew-theater-well${filed ? " is-filed" : ""}`}
      data-phase={phase}
      role={aria ? "status" : undefined}
      aria-live={aria ? "polite" : undefined}
      aria-label={aria}
    >
      <i className="ew-cover-rule" />
      {dispatchBody ? (
        <TheaterLetter text={dispatchBody} signed={deskSigned} />
      ) : null}
      {!filed && !icy && catalogRows.length > 0 ? (
        <section className="ew-known">
          <p className="rp-eyebrow ew-known-lab">Known on landing</p>
          {catalogRows.map(([label, value]) => (
            <div className="ew-krow" key={label}>
              <span className="ew-krow-key">{label}</span>
              <b className="ew-krow-value">{value}</b>
              <span className="ew-krow-prov">Catalog</span>
            </div>
          ))}
        </section>
      ) : null}
      {waiting && !icy ? (
        <p className="ew-waiting">
          <i className="ew-waiting-dot" aria-hidden="true" />
          {waiting}
        </p>
      ) : null}
      {showCover ? (
        <div className="ew-cover-row">
          <figure className="ew-plate">
            {showPlate ? (
              <img
                src={plate!}
                alt=""
                onError={() => {
                  markArtworkUrlFailed(plate!);
                  setPlateFailed(true);
                }}
              />
            ) : null}
            <span className="ew-plate-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1">
                <circle cx="12" cy="12" r="8.5" />
                <circle cx="12" cy="12" r="2.6" fill="#C73A3A" stroke="none" />
              </svg>
            </span>
          </figure>
          <div className="ew-plate-copy">
            {trackName ? <p className="ew-cover-title">{trackName}</p> : null}
            {!filed && catalogLine ? (
              <p className="ew-known-line">{catalogLine}</p>
            ) : null}
            {filed && trackArtist ? (
              <p className="ew-known-line">{trackArtist}</p>
            ) : null}
          </div>
        </div>
      ) : null}
      {waiting && icy ? (
        <p className="ew-waiting">
          <i className="ew-waiting-dot" aria-hidden="true" />
          {waiting}
        </p>
      ) : null}
      {children}
      {filed ? (
        <>
          {filed && facts.length > 0 ? (
            <div className="ew-journey-wrap">
              {deskSigned ? (
                <p className="rp-eyebrow text-ether ew-desk-label">
                  the desk found
                </p>
              ) : null}
              <ol className="ew-journey">
                {facts.map((item) => (
                  <li key={`${item.label}:${item.value}`}>
                    <i className="ew-journey-star" />
                    <span className="ew-journey-value">{item.value}</span>
                    <span className="ew-journey-label">{item.label}</span>
                  </li>
                ))}
              </ol>
              <p className="ew-desk-verified">
                MusicBrainz · verified relations
              </p>
            </div>
          ) : null}
          {filed && meridians.length > 0 ? (
            <>
            <p className="rp-eyebrow ew-meridian-lab">Read it elsewhere</p>
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
                  {link.host ? (
                    <em className="ew-meridian-host">{link.host}</em>
                  ) : null}
                </a>
              ))}
            </p>
            </>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
