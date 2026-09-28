/**
 * Names the keeper knows by more than one spelling. Jev never generates a
 * spelling: a variant either folds onto a canonical here or it is unknown.
 * Isomorphic — the client fallback and the server both import it.
 */
export const KEEPER_ALIASES: Record<string, string[]> = {
  "Ilaiyaraaja": ["Ilayaraja", "Ilaiyaraja", "Ilayaraaja", "இளையராஜா", "ഇളയരാജ"],
  "A. R. Rahman": ["AR Rahman", "A.R. Rahman", "ARR", "ஏ. ஆர். ரகுமான்"],
  "K. J. Yesudas": ["Yesudas", "KJ Yesudas", "Yesudass", "യേശുദാസ്"],
  "Lata Mangeshkar": ["Lata", "लता मंगेशकर"],
  "Asha Bhosle": ["Asha Bhonsle", "आशा भोसले"],
  "S. P. Balasubrahmanyam": ["SPB", "S.P. Balasubramaniam", "Balasubramanyam", "SP Balasubrahmanyam"],
  "Nusrat Fateh Ali Khan": ["NFAK", "Nusrat", "نصرت فتح علی خان"],
  "Umm Kulthum": ["Oum Kalthoum", "Om Kalsoum", "Umm Kalthum", "أم كلثوم"],
  "Fairuz": ["Fairouz", "Feyrouz", "فيروز"],
  "Amália Rodrigues": ["Amalia Rodrigues", "Amalia"],
  "Cesária Évora": ["Cesaria Evora"],
};

/**
 * Fold a name so spellings meet: strip accents, lowercase, drop dots, spaces
 * and 'h', collapse doubled vowels. "Ilayaraja" and "Ilaiyaraaja" both fold
 * to "ilaiaraja"; non-Latin scripts fold to themselves, minus spaces.
 */
export function foldName(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.\s'’\-]+/g, "")
    .replace(/h/g, "")
    .replace(/y/g, "i")
    .replace(/([aeiou])\1+/g, "$1");
}

const FOLDED = new Map<string, string>();
for (const [canonical, variants] of Object.entries(KEEPER_ALIASES)) {
  for (const name of [canonical, ...variants]) {
    const key = foldName(name);
    if (key.length >= 3 && !FOLDED.has(key)) FOLDED.set(key, canonical);
  }
}

/** The canonical name for a spelling, or null when the table does not know it. */
export function resolveAlias(text: string): string | null {
  const key = foldName(text);
  return key ? FOLDED.get(key) ?? null : null;
}
