import { layoutWithLines, prepareWithSegments, walkLineRanges } from "@chenglou/pretext";

type PreparedSegments = ReturnType<typeof prepareWithSegments>;
type WhiteSpaceMode = "normal" | "pre-wrap";

const preparedCache = new Map<string, PreparedSegments>();

function preparedKey(text: string, font: string, whiteSpace: WhiteSpaceMode) {
  return `${font}\u0000${whiteSpace}\u0000${text}`;
}

export function preparePretext(
  text: string,
  font: string,
  whiteSpace: WhiteSpaceMode = "normal"
): PreparedSegments | null {
  const normalized = whiteSpace === "pre-wrap" ? text : text.trim();
  if (!normalized) return null;

  const key = preparedKey(normalized, font, whiteSpace);
  const cached = preparedCache.get(key);
  if (cached) return cached;

  try {
    const prepared = prepareWithSegments(normalized, font, { whiteSpace });
    preparedCache.set(key, prepared);
    return prepared;
  } catch {
    // SSR and some browser states may not expose a canvas measurement context.
    // Callers must fall back to CSS clamping/heuristics when this happens.
    return null;
  }
}

export function getPretextLines(
  text: string,
  font: string,
  width: number,
  lineHeight: number
) {
  const prepared = preparePretext(text, font);
  if (!prepared || width <= 0) return [];
  return layoutWithLines(prepared, Math.max(1, Math.floor(width)), lineHeight).lines;
}

export function getPretextLineCount(
  text: string,
  font: string,
  width: number,
  lineHeight: number
) {
  return getPretextLines(text, font, width, lineHeight).length;
}

export function getPretextTightWidth(text: string, font: string) {
  const whiteSpace = /\s/.test(text) ? "pre-wrap" : "normal";
  const prepared = preparePretext(text, font, whiteSpace);
  if (!prepared) return 0;

  let measured = 0;
  walkLineRanges(prepared, 10000, (line) => {
    measured = Math.max(measured, line.width);
  });
  return Math.ceil(measured);
}

export function fitsPretextWidth(text: string, font: string, width: number, extraPadding = 0) {
  if (width <= 0) return false;
  return getPretextTightWidth(text, font) + extraPadding <= width;
}
