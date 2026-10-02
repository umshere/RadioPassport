/**
 * Countries that keep one clock, so a country alone tells the hour: India is
 * always IST (UTC+5:30), Germany always Berlin. Countries that span zones
 * (US, Russia, Brazil, Canada, Australia, Indonesia, Mexico, Portugal, Spain,
 * Chile…) are left out on purpose; for those the station's own coordinates
 * are the only honest source.
 */
const ZONES: Record<string, string> = {
  IN: "Asia/Kolkata", CN: "Asia/Shanghai", JP: "Asia/Tokyo", KR: "Asia/Seoul", KP: "Asia/Pyongyang",
  TW: "Asia/Taipei", HK: "Asia/Hong_Kong", MO: "Asia/Macau", SG: "Asia/Singapore", MY: "Asia/Kuala_Lumpur",
  TH: "Asia/Bangkok", VN: "Asia/Ho_Chi_Minh", KH: "Asia/Phnom_Penh", LA: "Asia/Vientiane", MM: "Asia/Yangon",
  BD: "Asia/Dhaka", LK: "Asia/Colombo", NP: "Asia/Kathmandu", PK: "Asia/Karachi", AF: "Asia/Kabul",
  IR: "Asia/Tehran", IQ: "Asia/Baghdad", SA: "Asia/Riyadh", AE: "Asia/Dubai", QA: "Asia/Qatar",
  KW: "Asia/Kuwait", BH: "Asia/Bahrain", OM: "Asia/Muscat", YE: "Asia/Aden", JO: "Asia/Amman",
  LB: "Asia/Beirut", SY: "Asia/Damascus", IL: "Asia/Jerusalem", TR: "Europe/Istanbul", GE: "Asia/Tbilisi",
  AM: "Asia/Yerevan", AZ: "Asia/Baku", UZ: "Asia/Tashkent", PH: "Asia/Manila", CY: "Asia/Nicosia",
  EG: "Africa/Cairo", LY: "Africa/Tripoli", TN: "Africa/Tunis", DZ: "Africa/Algiers", MA: "Africa/Casablanca",
  NG: "Africa/Lagos", GH: "Africa/Accra", KE: "Africa/Nairobi", ET: "Africa/Addis_Ababa", TZ: "Africa/Dar_es_Salaam",
  UG: "Africa/Kampala", ZA: "Africa/Johannesburg", ZW: "Africa/Harare", ZM: "Africa/Lusaka", SN: "Africa/Dakar",
  CI: "Africa/Abidjan", CM: "Africa/Douala", AO: "Africa/Luanda",
  GB: "Europe/London", IE: "Europe/Dublin", FR: "Europe/Paris", DE: "Europe/Berlin", IT: "Europe/Rome",
  NL: "Europe/Amsterdam", BE: "Europe/Brussels", CH: "Europe/Zurich", AT: "Europe/Vienna", PL: "Europe/Warsaw",
  CZ: "Europe/Prague", SK: "Europe/Bratislava", HU: "Europe/Budapest", RO: "Europe/Bucharest", BG: "Europe/Sofia",
  GR: "Europe/Athens", RS: "Europe/Belgrade", HR: "Europe/Zagreb", SI: "Europe/Ljubljana", BA: "Europe/Sarajevo",
  SE: "Europe/Stockholm", NO: "Europe/Oslo", DK: "Europe/Copenhagen", FI: "Europe/Helsinki", EE: "Europe/Tallinn",
  LV: "Europe/Riga", LT: "Europe/Vilnius", UA: "Europe/Kyiv", BY: "Europe/Minsk", IS: "Atlantic/Reykjavik",
  MT: "Europe/Malta", LU: "Europe/Luxembourg", AL: "Europe/Tirane", MK: "Europe/Skopje", MD: "Europe/Chisinau",
  CO: "America/Bogota", PE: "America/Lima", VE: "America/Caracas", AR: "America/Argentina/Buenos_Aires",
  UY: "America/Montevideo", PY: "America/Asuncion", BO: "America/La_Paz", CU: "America/Havana",
  JM: "America/Jamaica", DO: "America/Santo_Domingo", CR: "America/Costa_Rica", GT: "America/Guatemala",
  PA: "America/Panama", NZ: "Pacific/Auckland",
};

const formatters = new Map<string, Intl.DateTimeFormat>();

function offsetMinutes(zone: string, now: Date): number | null {
  try {
    let format = formatters.get(zone);
    if (!format) {
      format = new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      formatters.set(zone, format);
    }
    const part = Object.fromEntries(format.formatToParts(now).map((p) => [p.type, p.value]));
    const asUtc = Date.UTC(+part.year!, +part.month! - 1, +part.day!, +part.hour!, +part.minute!, +part.second!);
    return Math.round((asUtc - Math.floor(now.getTime() / 1000) * 1000) / 60_000);
  } catch {
    return null;
  }
}

/** True when this country keeps a single clock. */
export function hasOneClock(countryCode: string | null | undefined): boolean {
  return Boolean(countryCode && ZONES[countryCode.trim().toUpperCase()]);
}

/**
 * The country's own wall clock, as a Date whose UTC fields read the local time
 * (the same convention as localDateAtLongitude). Null for a country that spans
 * zones, or one the table does not know.
 */
export function countryLocalDate(countryCode: string | null | undefined, now = new Date()): Date | null {
  const zone = countryCode ? ZONES[countryCode.trim().toUpperCase()] : undefined;
  if (!zone) return null;
  const minutes = offsetMinutes(zone, now);
  return minutes === null ? null : new Date(now.getTime() + minutes * 60_000);
}
