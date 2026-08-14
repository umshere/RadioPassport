import { describe, expect, it } from "vitest";
import {
  applyAtmosphere,
  ATMOSPHERE_BOOT_SCRIPT,
  ATMOSPHERE_STORAGE_KEY,
  ATMOSPHERE_THEME_COLOR,
  atmosphereThemeColor,
  globeAtmospherePaint,
  nextAtmosphere,
  parseAtmosphere,
  persistAtmosphere,
} from "~/utils/atmosphere";

describe("Atmosphere", () => {
  it("defaults unknown values to night and only accepts day as the other room", () => {
    expect(parseAtmosphere(undefined)).toBe("night");
    expect(parseAtmosphere(null)).toBe("night");
    expect(parseAtmosphere("light")).toBe("night");
    expect(parseAtmosphere("day")).toBe("day");
    expect(nextAtmosphere("night")).toBe("day");
    expect(nextAtmosphere("day")).toBe("night");
  });

  it("keeps the theme-color matched to the room", () => {
    expect(atmosphereThemeColor("night")).toBe(ATMOSPHERE_THEME_COLOR.night);
    expect(atmosphereThemeColor("day")).toBe(ATMOSPHERE_THEME_COLOR.day);
    expect(ATMOSPHERE_THEME_COLOR.night).toBe("#0C0B09");
    expect(ATMOSPHERE_THEME_COLOR.day).toBe("#F2EBE1");
  });

  it("boots a stored day room before paint", () => {
    expect(ATMOSPHERE_BOOT_SCRIPT).toContain(ATMOSPHERE_STORAGE_KEY);
    expect(ATMOSPHERE_BOOT_SCRIPT).toContain("data-atmosphere");
    expect(ATMOSPHERE_BOOT_SCRIPT).toContain(ATMOSPHERE_THEME_COLOR.day);
  });

  it("paints the globe as night earth or a lithograph plate", () => {
    const night = globeAtmospherePaint("night");
    const day = globeAtmospherePaint("day");
    expect(night.washFade).toContain("12,11,9");
    expect(day.washFade).toContain("242,235,225");
    expect(night.cityLive).toBe("#C73A3A");
    expect(day.cityLive).toBe("#C73A3A");
    expect(night.particle(1)).toContain("232,223,208");
    expect(day.particle(1)).toBe("rgba(26,22,18,0.68)");
    expect(day.particleSize).toBeGreaterThan(night.particleSize);
    expect(day.outline).toContain("0.34");
  });

  it("writes the room and applies it on the document", () => {
    const store = new Map<string, string>();
    const attrs = new Map<string, string>();
    const meta = {
      content: ATMOSPHERE_THEME_COLOR.night as string,
      setAttribute: (name: string, value: string) => {
        if (name === "content") meta.content = value;
      },
    };
    const documentElement = {
      style: { colorScheme: "dark" },
      setAttribute: (name: string, value: string) => {
        attrs.set(name, value);
      },
      removeAttribute: (name: string) => {
        attrs.delete(name);
      },
    };
    const previousWindow = globalThis.window;
    const previousDocument = globalThis.document;
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage: {
          getItem: (key: string) => store.get(key) ?? null,
          setItem: (key: string, value: string) => {
            store.set(key, value);
          },
        },
      },
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        documentElement,
        querySelector: (selector: string) =>
          selector === 'meta[name="theme-color"]' ? meta : null,
      },
    });
    try {
      expect(persistAtmosphere("day")).toBe("day");
      expect(store.get(ATMOSPHERE_STORAGE_KEY)).toBe("day");
      expect(applyAtmosphere("day")).toBe("day");
      expect(attrs.get("data-atmosphere")).toBe("day");
      expect(documentElement.style.colorScheme).toBe("light");
      expect(meta.content).toBe(ATMOSPHERE_THEME_COLOR.day);
      expect(applyAtmosphere("night")).toBe("night");
      expect(attrs.has("data-atmosphere")).toBe(false);
      expect(documentElement.style.colorScheme).toBe("dark");
      expect(meta.content).toBe(ATMOSPHERE_THEME_COLOR.night);
    } finally {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: previousWindow,
      });
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: previousDocument,
      });
    }
  });
});
