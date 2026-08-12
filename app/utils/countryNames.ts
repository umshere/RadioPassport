/**
 * Display-only common names for formal ISO/Radio Browser country strings.
 * Never use this for API query keys, cache keys, or filters.
 */

const COMMON_NAMES: Record<string, string> = {
  "the united states of america": "United States",
  "united states of america": "United States",
  "the united kingdom of great britain and northern ireland": "United Kingdom",
  "united kingdom of great britain and northern ireland": "United Kingdom",
  "the russian federation": "Russia",
  "russian federation": "Russia",
  "the republic of moldova": "Moldova",
  "republic of moldova": "Moldova",
  "republic of north macedonia": "North Macedonia",
  "the republic of north macedonia": "North Macedonia",
  "the netherlands": "Netherlands",
  "the czech republic": "Czechia",
  "czech republic": "Czechia",
  "the united arab emirates": "United Arab Emirates",
  "united arab emirates": "United Arab Emirates",
  "the republic of korea": "South Korea",
  "republic of korea": "South Korea",
  "the democratic people's republic of korea": "North Korea",
  "democratic people's republic of korea": "North Korea",
  "the islamic republic of iran": "Iran",
  "islamic republic of iran": "Iran",
  "the philippines": "Philippines",
  "the holy see": "Vatican City",
  "holy see": "Vatican City",
  "bosnia and herzegovina": "Bosnia & Herzegovina",
  "the faroe islands": "Faroe Islands",
  "faroe islands": "Faroe Islands",
};

export function displayCountryName(
  name: string,
  _iso?: string | null
): string {
  const trimmed = (name || "").trim();
  if (!trimmed) return trimmed;
  const key = trimmed.toLowerCase();
  if (COMMON_NAMES[key]) return COMMON_NAMES[key];
  if (/^the\s+/i.test(trimmed)) {
    return trimmed.replace(/^the\s+/i, "").trim();
  }
  return trimmed;
}
