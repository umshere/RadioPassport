/**
 * Some streams send UTF-8 that was read as Windows-1252 and encoded again:
 * “–” arrives as “â€“”. Undo exactly that, and only when the result is clean
 * UTF-8 — a title that merely contains an accented letter is left alone.
 */
const CP1252_HIGH: Record<string, number> = {
  "€": 0x80, "‚": 0x82, "ƒ": 0x83, "„": 0x84, "…": 0x85, "†": 0x86, "‡": 0x87,
  "ˆ": 0x88, "‰": 0x89, "Š": 0x8a, "‹": 0x8b, "Œ": 0x8c, "Ž": 0x8e, "‘": 0x91,
  "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97, "˜": 0x98,
  "™": 0x99, "š": 0x9a, "›": 0x9b, "œ": 0x9c, "ž": 0x9e, "Ÿ": 0x9f,
};

// A UTF-8 lead byte (C2–F4) shown as Latin-1, followed by a continuation byte
// (80–BF) shown as Latin-1 or CP1252.
const SUSPECT = /[Â-ô][\u0080-¿€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ]/;

export function repairMojibake(text: string): string {
  if (!SUSPECT.test(text)) return text;
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (code < 0x100) bytes.push(code);
    else if (CP1252_HIGH[char] !== undefined) bytes.push(CP1252_HIGH[char]);
    else return text; // a real non-Latin character: not double-encoded
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bytes));
  } catch {
    return text;
  }
}
