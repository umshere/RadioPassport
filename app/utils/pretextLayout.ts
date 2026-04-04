import { layoutWithLines, prepareWithSegments, walkLineRanges } from "@chenglou/pretext";

type PreparedSegments = ReturnType<typeof prepareWithSegments>;

const preparedCache = new Map<string, PreparedSegments>();

function preparedKey(text: string, font: string) {
  return `${font}\u0000${text}`;
}

export function preparePretext(text: string, font: string): PreparedSegments | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const key = preparedKey(trimmed, font);
  const cached = preparedCache.get(key);
  if (cached) return cached;

  const prepared = prepareWithSegments(trimmed, font);
  preparedCache.set(key, prepared);
  return prepared;
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
  const prepared = preparePretext(text, font);
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
