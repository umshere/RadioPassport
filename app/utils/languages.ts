/**
 * Normalize Radio Browser language strings for display.
 * Allowlist only — unmatched tokens are dropped, never title-cased as junk.
 */

/** alias (lowercased) → canonical English display name */
const LANGUAGE_ALIASES: Record<string, string> = {
  // English + regional variants → English
  en: "English",
  eng: "English",
  english: "English",
  angol: "English",
  angolul: "English",
  "american english": "English",
  "british english": "English",
  "english (us)": "English",
  "english (uk)": "English",
  "english us": "English",
  "english uk": "English",
  "en-us": "English",
  "en-gb": "English",
  "en us": "English",
  "en gb": "English",

  // German
  de: "German",
  ger: "German",
  deu: "German",
  german: "German",
  deutsch: "German",
  gernan: "German",
  "deutsch fränkisch": "German",
  "deutsch frankisch": "German",
  frankisch: "German",
  fränkisch: "German",
  hochdeutsch: "German",
  nemet: "German",
  nemetul: "German",

  // French
  fr: "French",
  fre: "French",
  fra: "French",
  french: "French",
  francais: "French",
  française: "French",
  francaise: "French",

  // Spanish + regional / endonyms
  es: "Spanish",
  spa: "Spanish",
  spanish: "Spanish",
  espanol: "Spanish",
  español: "Spanish",
  española: "Spanish",
  espanola: "Spanish",
  castellano: "Spanish",
  "castellano. español": "Spanish",
  "castellano español": "Spanish",
  "castellano. espanol": "Spanish",

  // Portuguese
  pt: "Portuguese",
  por: "Portuguese",
  portuguese: "Portuguese",
  portugues: "Portuguese",
  português: "Portuguese",
  "brazilian portuguese": "Portuguese",
  "portuguese (brazil)": "Portuguese",
  "pt-br": "Portuguese",

  // Italian
  it: "Italian",
  ita: "Italian",
  italian: "Italian",
  italiano: "Italian",

  // Dutch / Flemish
  nl: "Dutch",
  dut: "Dutch",
  nld: "Dutch",
  dutch: "Dutch",
  nederlands: "Dutch",
  flemish: "Flemish",
  flammish: "Flemish",
  vlaams: "Flemish",

  // Greek
  el: "Greek",
  gre: "Greek",
  ell: "Greek",
  greek: "Greek",
  ελληνικά: "Greek",
  ελληνικα: "Greek",

  // Russian
  ru: "Russian",
  rus: "Russian",
  russian: "Russian",
  русский: "Russian",
  russkij: "Russian",
  "язык: русский": "Russian",
  "язык русский": "Russian",

  // Ukrainian
  uk: "Ukrainian",
  ukr: "Ukrainian",
  ukrainian: "Ukrainian",
  українська: "Ukrainian",

  // Polish
  pl: "Polish",
  pol: "Polish",
  polish: "Polish",
  polski: "Polish",

  // Czech
  cs: "Czech",
  ces: "Czech",
  cze: "Czech",
  czech: "Czech",
  čeština: "Czech",
  cestina: "Czech",

  // Slovak
  sk: "Slovak",
  slo: "Slovak",
  slk: "Slovak",
  slovak: "Slovak",
  slovenčina: "Slovak",

  // Hungarian
  hu: "Hungarian",
  hun: "Hungarian",
  hungarian: "Hungarian",
  magyar: "Hungarian",

  // Romanian
  ro: "Romanian",
  ron: "Romanian",
  rum: "Romanian",
  romanian: "Romanian",
  română: "Romanian",
  romana: "Romanian",

  // Bulgarian
  bg: "Bulgarian",
  bul: "Bulgarian",
  bulgarian: "Bulgarian",
  български: "Bulgarian",

  // Serbian
  sr: "Serbian",
  srp: "Serbian",
  serbian: "Serbian",
  srpski: "Serbian",

  // Croatian
  hr: "Croatian",
  hrv: "Croatian",
  croatian: "Croatian",
  hrvatski: "Croatian",

  // Bosnian
  bs: "Bosnian",
  bos: "Bosnian",
  bosnian: "Bosnian",
  bosanski: "Bosnian",

  // Slovenian
  sl: "Slovenian",
  slv: "Slovenian",
  slovenian: "Slovenian",
  slovene: "Slovenian",
  slovenščina: "Slovenian",

  // Macedonian
  mk: "Macedonian",
  mkd: "Macedonian",
  mac: "Macedonian",
  macedonian: "Macedonian",

  // Albanian
  sq: "Albanian",
  alb: "Albanian",
  sqi: "Albanian",
  albanian: "Albanian",
  shqip: "Albanian",

  // Turkish
  tr: "Turkish",
  tur: "Turkish",
  turkish: "Turkish",
  türkçe: "Turkish",
  turkce: "Turkish",

  // Arabic
  ar: "Arabic",
  ara: "Arabic",
  arabic: "Arabic",
  العربية: "Arabic",

  // Hebrew
  he: "Hebrew",
  heb: "Hebrew",
  hebrew: "Hebrew",
  ivrit: "Hebrew",
  עברית: "Hebrew",

  // Persian
  fa: "Persian",
  per: "Persian",
  fas: "Persian",
  persian: "Persian",
  farsi: "Persian",
  فارسی: "Persian",

  // Kurdish
  ku: "Kurdish",
  kur: "Kurdish",
  kurdish: "Kurdish",
  kurmanji: "Kurdish",
  sorani: "Kurdish",

  // South Asian
  hi: "Hindi",
  hin: "Hindi",
  hindi: "Hindi",
  हिन्दी: "Hindi",
  ur: "Urdu",
  urd: "Urdu",
  urdu: "Urdu",
  bn: "Bengali",
  ben: "Bengali",
  bengali: "Bengali",
  bangla: "Bengali",
  pa: "Punjabi",
  pan: "Punjabi",
  punjabi: "Punjabi",
  panjabi: "Punjabi",
  ta: "Tamil",
  tam: "Tamil",
  tamil: "Tamil",
  te: "Telugu",
  tel: "Telugu",
  telugu: "Telugu",
  ml: "Malayalam",
  mal: "Malayalam",
  malayalam: "Malayalam",
  kn: "Kannada",
  kan: "Kannada",
  kannada: "Kannada",
  mr: "Marathi",
  mar: "Marathi",
  marathi: "Marathi",
  gu: "Gujarati",
  guj: "Gujarati",
  gujarati: "Gujarati",
  ne: "Nepali",
  nep: "Nepali",
  nepali: "Nepali",
  si: "Sinhala",
  sin: "Sinhala",
  sinhala: "Sinhala",
  sinhalese: "Sinhala",

  // Chinese family
  zh: "Chinese",
  chi: "Chinese",
  zho: "Chinese",
  chinese: "Chinese",
  mandarin: "Mandarin",
  "mandarin chinese": "Mandarin",
  cmn: "Mandarin",
  cantonese: "Cantonese",
  yue: "Cantonese",
  "chinese (simplified)": "Chinese",
  "chinese (traditional)": "Chinese",

  // Japanese / Korean
  ja: "Japanese",
  jpn: "Japanese",
  japanese: "Japanese",
  日本語: "Japanese",
  ko: "Korean",
  kor: "Korean",
  korean: "Korean",
  한국어: "Korean",

  // SE Asia
  vi: "Vietnamese",
  vie: "Vietnamese",
  vietnamese: "Vietnamese",
  th: "Thai",
  tha: "Thai",
  thai: "Thai",
  km: "Khmer",
  khm: "Khmer",
  khmer: "Khmer",
  cambodian: "Khmer",
  lo: "Lao",
  lao: "Lao",
  laotian: "Lao",
  my: "Burmese",
  bur: "Burmese",
  mya: "Burmese",
  burmese: "Burmese",
  myanmar: "Burmese",
  id: "Indonesian",
  ind: "Indonesian",
  indonesian: "Indonesian",
  bahasa: "Indonesian",
  "bahasa indonesia": "Indonesian",
  ms: "Malay",
  may: "Malay",
  msa: "Malay",
  malay: "Malay",
  "bahasa melayu": "Malay",
  fil: "Filipino",
  filipino: "Filipino",
  tl: "Tagalog",
  tgl: "Tagalog",
  tagalog: "Tagalog",

  // Nordic / Baltic
  sv: "Swedish",
  swe: "Swedish",
  swedish: "Swedish",
  svenska: "Swedish",
  no: "Norwegian",
  nor: "Norwegian",
  norwegian: "Norwegian",
  norsk: "Norwegian",
  bokmål: "Norwegian",
  bokmal: "Norwegian",
  nynorsk: "Norwegian",
  da: "Danish",
  dan: "Danish",
  danish: "Danish",
  dansk: "Danish",
  fi: "Finnish",
  fin: "Finnish",
  finnish: "Finnish",
  suomi: "Finnish",
  is: "Icelandic",
  ice: "Icelandic",
  isl: "Icelandic",
  icelandic: "Icelandic",
  et: "Estonian",
  est: "Estonian",
  estonian: "Estonian",
  eesti: "Estonian",
  lv: "Latvian",
  lav: "Latvian",
  latvian: "Latvian",
  latviešu: "Latvian",
  lt: "Lithuanian",
  lit: "Lithuanian",
  lithuanian: "Lithuanian",
  lietuvių: "Lithuanian",

  // Iberian minority + Celtic
  ca: "Catalan",
  cat: "Catalan",
  catalan: "Catalan",
  català: "Catalan",
  catala: "Catalan",
  eu: "Basque",
  baq: "Basque",
  eus: "Basque",
  basque: "Basque",
  euskara: "Basque",
  gl: "Galician",
  glg: "Galician",
  galician: "Galician",
  galego: "Galician",
  cy: "Welsh",
  wel: "Welsh",
  cym: "Welsh",
  welsh: "Welsh",
  cymraeg: "Welsh",
  ga: "Irish",
  gle: "Irish",
  irish: "Irish",
  gaeilge: "Irish",
  "irish gaelic": "Irish",
  gd: "Scottish Gaelic",
  gla: "Scottish Gaelic",
  "scottish gaelic": "Scottish Gaelic",
  gaelic: "Scottish Gaelic",
  "scots gaelic": "Scottish Gaelic",

  // African
  sw: "Swahili",
  swa: "Swahili",
  swahili: "Swahili",
  kiswahili: "Swahili",
  am: "Amharic",
  amh: "Amharic",
  amharic: "Amharic",
  so: "Somali",
  som: "Somali",
  somali: "Somali",
  ha: "Hausa",
  hau: "Hausa",
  hausa: "Hausa",
  yo: "Yoruba",
  yor: "Yoruba",
  yoruba: "Yoruba",
  ig: "Igbo",
  ibo: "Igbo",
  igbo: "Igbo",
  zu: "Zulu",
  zul: "Zulu",
  zulu: "Zulu",
  af: "Afrikaans",
  afr: "Afrikaans",
  afrikaans: "Afrikaans",

  // Caucasus / Central Asia
  hy: "Armenian",
  arm: "Armenian",
  hye: "Armenian",
  armenian: "Armenian",
  ka: "Georgian",
  geo: "Georgian",
  kat: "Georgian",
  georgian: "Georgian",
  az: "Azerbaijani",
  aze: "Azerbaijani",
  azerbaijani: "Azerbaijani",
  azeri: "Azerbaijani",
  kk: "Kazakh",
  kaz: "Kazakh",
  kazakh: "Kazakh",
  uz: "Uzbek",
  uzb: "Uzbek",
  uzbek: "Uzbek",
  mn: "Mongolian",
  mon: "Mongolian",
  mongolian: "Mongolian",

  // Other European
  mt: "Maltese",
  mlt: "Maltese",
  maltese: "Maltese",
  lb: "Luxembourgish",
  ltz: "Luxembourgish",
  luxembourgish: "Luxembourgish",
  letzebuergesch: "Luxembourgish",
};

function stripLanguagePrefix(raw: string): string {
  const colon = raw.indexOf(":");
  if (colon > 0 && colon < raw.length - 1) {
    const prefix = raw.slice(0, colon).trim().toLowerCase();
    if (
      prefix.length <= 12 &&
      (/^lang(uage)?$/.test(prefix) ||
        prefix === "язык" ||
        prefix === "sprache" ||
        prefix === "idioma")
    ) {
      return raw.slice(colon + 1).trim();
    }
  }
  return raw;
}

/** Lowercase, trim, strip punctuation noise, collapse whitespace. */
function normalizeTokenKey(token: string): string {
  let value = stripLanguagePrefix(token).trim();
  if (!value) return "";
  // Strip surrounding punctuation and trailing "." segments like "Castellano. Español"
  // after split may still leave "castellano."
  value = value
    .toLowerCase()
    .replace(/^[\s"'“”‘’(.\-–—]+/, "")
    .replace(/[\s"'“”‘’).,;:!\-–—]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  // Collapse "castellano. español" style if it survived as one token
  value = value.replace(/\.\s+/g, " ").replace(/\./g, " ").replace(/\s+/g, " ").trim();
  return value;
}

/**
 * Map a single raw token to a canonical display name, or null if not allowlisted.
 */
function mapLanguageToken(token: string): string | null {
  const key = normalizeTokenKey(token);
  if (!key || key.length < 2) return null;
  if (/^\d+$/.test(key)) return null;
  // Unrecognized label:value junk
  if (key.includes(":")) return null;

  if (LANGUAGE_ALIASES[key]) return LANGUAGE_ALIASES[key];

  // Try parenthetical form stripped: "english (us)" already in map; also "foo (bar)"
  const withoutParens = key.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  if (withoutParens !== key && LANGUAGE_ALIASES[withoutParens]) {
    return LANGUAGE_ALIASES[withoutParens];
  }

  // Allowlist only — do not title-case unknown tokens.
  return null;
}

/**
 * Split, map via allowlist, and dedupe language values into canonical display names.
 * Unrecognized tokens are dropped.
 */
export function normalizeLanguages(
  raw: string | string[] | undefined | null
): string[] {
  if (raw == null) return [];
  const parts = Array.isArray(raw)
    ? raw.flatMap((entry) => String(entry).split(/[,;|/]+/))
    : String(raw).split(/[,;|/]+/);

  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of parts) {
    // Also split residual middot / " · " style fragments inside a part
    const subparts = String(part).split(/\s*[·•]\s*/);
    for (const sub of subparts) {
      const mapped = mapLanguageToken(sub);
      if (!mapped) continue;
      const dedupeKey = mapped.toLowerCase();
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      result.push(mapped);
    }
  }
  return result;
}

/** Join for UI; caps at `max` entries (default 3). */
export function formatLanguageList(langs: string[], max = 3): string {
  if (!langs.length) return "";
  return langs.slice(0, max).join(" · ");
}
