export const ATMOSPHERES = ["night", "day"] as const;

export type Atmosphere = (typeof ATMOSPHERES)[number];

export const ATMOSPHERE_STORAGE_KEY = "elsewhere-atmosphere";

export const ATMOSPHERE_THEME_COLOR = {
  night: "#0C0B09",
  day: "#F2EBE1",
} as const;

export function parseAtmosphere(value: string | null | undefined): Atmosphere {
  return value === "day" ? "day" : "night";
}

export function nextAtmosphere(current: Atmosphere): Atmosphere {
  return parseAtmosphere(current) === "day" ? "night" : "day";
}

export function atmosphereThemeColor(atmosphere: Atmosphere) {
  return ATMOSPHERE_THEME_COLOR[parseAtmosphere(atmosphere)];
}

export function applyAtmosphere(atmosphere: Atmosphere) {
  if (typeof document === "undefined") return parseAtmosphere(atmosphere);
  const next = parseAtmosphere(atmosphere);
  if (next === "day") {
    document.documentElement.setAttribute("data-atmosphere", "day");
  } else {
    document.documentElement.removeAttribute("data-atmosphere");
  }
  document.documentElement.style.colorScheme = next === "day" ? "light" : "dark";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", ATMOSPHERE_THEME_COLOR[next]);
  return next;
}

export function readStoredAtmosphere(): Atmosphere {
  if (typeof window === "undefined") return "night";
  try {
    return parseAtmosphere(window.localStorage.getItem(ATMOSPHERE_STORAGE_KEY));
  } catch {
    return "night";
  }
}

export function persistAtmosphere(atmosphere: Atmosphere): Atmosphere {
  const next = parseAtmosphere(atmosphere);
  if (typeof window === "undefined") return next;
  try {
    window.localStorage.setItem(ATMOSPHERE_STORAGE_KEY, next);
  } catch {
    // Private mode or blocked storage still keeps the room for this session.
  }
  return next;
}

/** Runs before paint so a stored Day room does not flash Night. */
export const ATMOSPHERE_BOOT_SCRIPT = `(function(){try{if(localStorage.getItem(${JSON.stringify(
  ATMOSPHERE_STORAGE_KEY
)})==="day"){document.documentElement.setAttribute("data-atmosphere","day");document.documentElement.style.colorScheme="light";var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",${JSON.stringify(
  ATMOSPHERE_THEME_COLOR.day
)});}}catch(e){}})();`;

export type GlobeAtmospherePaint = {
  washFade: string;
  washSaturation: number;
  washLightness: number;
  washAlpha: number;
  sphereFill: string;
  outline: string;
  particle: (depth: number) => string;
  particleSize: number;
  cityRadius: number;
  meridian: string;
  aim: string;
  playingRing: string;
  cityPlaying: string;
  cityStamped: string;
  cityLive: string;
};

export function globeAtmospherePaint(
  atmosphere: Atmosphere
): GlobeAtmospherePaint {
  if (parseAtmosphere(atmosphere) === "day") {
    return {
      washFade: "rgba(242,235,225,0)",
      washSaturation: 16,
      washLightness: 70,
      washAlpha: 0.2,
      sphereFill: "rgba(26,22,18,0.08)",
      outline: "rgba(26,22,18,0.34)",
      particle: (depth) =>
        `rgba(26,22,18,${(0.2 + (depth + 1) * 0.24).toFixed(2)})`,
      particleSize: 1.55,
      cityRadius: 3.8,
      meridian: "rgba(138,110,58,0.85)",
      aim: "rgba(138,110,58,0.85)",
      playingRing: "rgba(63,122,118,0.7)",
      cityPlaying: "#3F7A76",
      cityStamped: "#8A6E3A",
      cityLive: "#C73A3A",
    };
  }
  return {
    washFade: "rgba(12,11,9,0)",
    washSaturation: 28,
    washLightness: 16,
    washAlpha: 0.55,
    sphereFill: "rgba(232,223,208,0)",
    outline: "rgba(232,223,208,0.12)",
    particle: (depth) => `rgba(232,223,208,${0.08 + (depth + 1) * 0.18})`,
    particleSize: 1.1,
    cityRadius: 3.2,
    meridian: "rgba(198,165,106,0.85)",
    aim: "rgba(198,165,106,0.85)",
    playingRing: "rgba(126,184,180,0.7)",
    cityPlaying: "#7EB8B4",
    cityStamped: "#C6A56A",
    cityLive: "#C73A3A",
  };
}
