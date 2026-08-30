/**
 * Theater knowledge-node layer — the keyboard-and-tap surface of the
 * constellation (see docs/PRODUCT_CORRECTION_THEATER_GRAPH.md, "rendering
 * architecture").
 *
 * The canvas below us (TheaterWell.tsx) keeps the atmosphere: dust, nebulae,
 * ambient stars, connecting lines, pulses. This layer is only the real
 * knowledge nodes, absolutely positioned over the well with the SAME
 * normalized seats the canvas draws — so a node can be reached by Tab,
 * announced by a screen reader, and tapped without pixel-hunting.
 *
 * Pure presentation. No fetching, no playback, no model ownership: the merged
 * graph and its seats are decided above the renderer.
 */

import { memo, useState } from "react";
import type { CSSProperties } from "react";
import type {
  KnowledgeImagery,
  KnowledgeKind,
  PositionedKnowledgeNode,
  TheaterNodesProps,
} from "~/types/knowledge";

/*
 * Class contract — the consumer's global stylesheet carries these
 * `.ew-knode-*` rules. Kind styling keys off [data-kind]; the wake entrance
 * (~400ms opacity/rise, CSS only) keys off [data-motion="wake"]; the focus
 * ring keys off .ew-knode-focus / [data-focused="true"]. Nothing here runs
 * continuous animation — nodes mount once, then hold still.
 */
export const KNODE_CLASS = {
  layer: "ew-knode-layer",
  node: "ew-knode",
  label: "ew-knode-label",
  imagery: "ew-knode-imagery",
  mark: "ew-knode-mark",
  focus: "ew-knode-focus",
} as const;

/**
 * Sky caption: first language token, drop the catalog's "unknown" door,
 * ellipsis the rest. Folio and aria keep the full label.
 */
export function skyCaption(kind: KnowledgeKind, label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return "";
  let text = trimmed;
  if (kind === "language") {
    text = trimmed.split(/[,/;|]/)[0]?.trim() || trimmed;
    if (/^unknown$/i.test(text)) return "";
  }
  const max =
    kind === "station" || kind === "album" || kind === "track" ? 22 : 18;
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

/** On a compact sky, only the tuned station and the focused node keep a caption. */
export function skyLabelOpen(opts: {
  focused: boolean;
  tuned: boolean;
  compact: boolean;
}): boolean {
  if (!opts.compact) return true;
  return opts.focused || opts.tuned;
}

/** Labels radiate away from the centre so neighbouring captions do not pile. */
export function labelAnchor(x: number, y: number): "n" | "e" | "s" | "w" {
  if (y < 0.2) return "s";
  if (y > 0.8) return "n";
  return x < 0.5 ? "w" : "e";
}

/**
 * ISO 3166-1 alpha-2 → regional-indicator flag emoji. "" for anything that
 * is not exactly two letters — never invent imagery from a partial code.
 * Same transform as the Atlas sky; kept pure here so tests own it.
 */
export function flagEmoji(code: string): string {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return "";
  let emoji = "";
  for (const char of normalized) {
    emoji += String.fromCodePoint(char.charCodeAt(0) + (0x1f1e6 - 65));
  }
  return emoji;
}

/** First grapheme of `label`, uppercase — the honest fallback disc. */
export function monogramFor(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) return "·";
  const first = Array.from(trimmed)[0];
  return (first ?? "·").toUpperCase();
}

/** Typographic kinds render label text only; pictorial kinds carry imagery. */
const TYPOGRAPHIC_KINDS: ReadonlySet<KnowledgeKind> = new Set([
  "language",
  "year",
  "genre",
  "place",
  "event",
]);

/**
 * Imagery per KnowledgeImagery. Never invents a URL: an empty url or a
 * broken image falls back to the monogram disc, first grapheme of the label.
 */
const KnodeImagery = memo(function KnodeImagery({
  imagery,
  label,
}: {
  imagery: KnowledgeImagery;
  label: string;
}) {
  // Reset when the node's imagery changes seat-mate or source.
  const [broken, setBroken] = useState(false);

  let content: string | null = null;
  let src: string | null = null;

  if (imagery.type === "flag") {
    content = flagEmoji(imagery.code);
    if (!content) content = monogramFor(label); // invalid code → monogram disc
  } else if (imagery.url && !broken) {
    src = imagery.url; // favicon or art; onError falls to monogram
  } else {
    content = monogramFor(imagery.monogram || label);
  }

  return (
    <span className={KNODE_CLASS.imagery} aria-hidden="true">
      {src ? (
        <img
          src={src}
          alt=""
          width={28}
          height={28}
          loading="lazy"
          draggable={false}
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
        />
      ) : (
        content
      )}
    </span>
  );
});

type KnodeButtonProps = {
  node: PositionedKnowledgeNode;
  focused: boolean;
  tuned: boolean;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
};

/** One knowledge node — a real button at its seat, min 28px hit area. */
const KnodeButton = memo(function KnodeButton({
  node,
  focused,
  tuned,
  reducedMotion,
  onSelect,
}: KnodeButtonProps) {
  // Individual `translate` centers the seat; stylesheets may animate
  // `transform` for the wake rise without disturbing the centering.
  const seatStyle: CSSProperties = {
    position: "absolute",
    left: `${node.x * 100}%`,
    top: `${node.y * 100}%`,
    translate: "-50% -50%",
    minWidth: "28px",
    minHeight: "28px",
  };

  const tunedStation = tuned && node.kind === "station";
  const caption = skyCaption(node.kind, node.label);
  const anchor = labelAnchor(node.x, node.y);

  return (
    <button
      type="button"
      className={
        focused
          ? `${KNODE_CLASS.node} ${KNODE_CLASS.focus}`
          : KNODE_CLASS.node
      }
      style={seatStyle}
      data-kind={node.kind}
      data-anchor={anchor}
      data-motion={reducedMotion ? "still" : "wake"}
      data-focused={focused ? "true" : undefined}
      data-tuned={tunedStation ? "true" : undefined}
      title={caption && caption !== node.label ? node.label : undefined}
      aria-label={`${node.label}, ${node.kind}${tunedStation ? ", tuned station" : ""}`}
      aria-pressed={focused ? true : undefined}
      onClick={() => onSelect(node.id)}
    >
      {TYPOGRAPHIC_KINDS.has(node.kind) ? (
        <span className={KNODE_CLASS.mark} aria-hidden="true" />
      ) : node.imagery ? (
        <KnodeImagery imagery={node.imagery} label={node.label} />
      ) : (
        <span className={KNODE_CLASS.imagery} aria-hidden="true">
          {monogramFor(node.label)}
        </span>
      )}
      {caption ? <span className={KNODE_CLASS.label}>{caption}</span> : null}
    </button>
  );
});

/**
 * The layer itself. Wrapper is geometry only — absolute, inset 0,
 * pointer-events none — and carries no role that would fight the buttons:
 * they are the accessibility surface, in nodes-array Tab order.
 */
function TheaterNodesImpl({
  nodes,
  focusId,
  tunedId = null,
  reducedMotion,
  onSelect,
}: TheaterNodesProps) {
  return (
    <div
      className={KNODE_CLASS.layer}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
      }}
    >
      {nodes.map((node) => (
        <KnodeButton
          key={node.id}
          node={node}
          focused={node.id === focusId}
          tuned={node.id === tunedId}
          reducedMotion={reducedMotion}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

/** Named export — frozen contract app/types/knowledge.ts TheaterNodesProps. */
export const TheaterNodes = memo(TheaterNodesImpl);
