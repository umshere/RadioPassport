import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import {
  formatLocalLabel,
  localDateAtLongitude,
  offsetHoursFromLongitude,
  solarHourFromDate,
  stationMatchesSolarHour,
} from "~/utils/localTime";
import {
  intentFromExtractor,
  wantsMixFromPrompt,
} from "~/api/ai/interpret";
import {
  clearDispatchCache,
  dispatchCacheKey,
  readDispatch,
  rememberDispatch,
  templateDispatch,
} from "~/api/ai/dispatch";
import {
  dispatchAfterStationChange,
  liveDispatch,
} from "~/state/dispatchStore";
import {
  stationLocation,
  stationPlaceLine,
} from "~/components/radio-passport/StationRow";
import {
  languageChipsFromStations,
  stationSpeaksLanguage,
} from "~/components/radio-passport/countryData";
import type { Station } from "~/types/radio";
import {
  facingRotation,
  globeHitDistance,
  GLOBE_HIT_ACQUIRE,
  GLOBE_HIT_HOLD,
  GLOBE_HIT_TOUCH,
  nearestVisiblePlace,
  rotationAtTurn,
  shortestAngle,
  shouldSpinGlobe,
  turnProgress,
} from "~/components/radio-passport/ParticleGlobe";
import {
  buildGlobePlaces,
  countryCentroid,
  globeFocusId,
  globeStationPool,
  stationGlobeCoords,
} from "~/components/radio-passport/globePlaces";
import { getGatewayConfig } from "~/services/ai/gateway";
import { getGeminiModel, trimEnv } from "~/services/ai/completeFallback";
import { getProvider, resetProviderCache } from "~/services/ai/providers";
import { HeuristicsProvider } from "~/services/ai/providers/HeuristicsProvider";
import { FallbackProvider } from "~/services/ai/providers/FallbackProvider";
import { OpenRouterProvider } from "~/services/ai/providers/OpenRouterProvider";

describe("Elsewhere local time", () => {
  it("maps longitude to hour offsets", () => {
    expect(offsetHoursFromLongitude(0)).toBe(0);
    expect(offsetHoursFromLongitude(77)).toBe(5);
    expect(offsetHoursFromLongitude(-74)).toBe(-5);
  });

  it("classifies solar hours and requires longitude when filtering", () => {
    expect(solarHourFromDate(new Date(2026, 7, 13, 6, 30))).toBe("Dawn");
    expect(solarHourFromDate(new Date(2026, 7, 13, 12, 0))).toBe("Midday");
    expect(solarHourFromDate(new Date(2026, 7, 13, 19, 0))).toBe("Dusk");
    expect(solarHourFromDate(new Date(2026, 7, 13, 23, 0))).toBe("Night");
    expect(stationMatchesSolarHour(null, "Night")).toBe(false);
    expect(stationMatchesSolarHour(0, null)).toBe(true);
  });

  it("labels a city clock in UTC solar time", () => {
    const date = localDateAtLongitude(0, new Date("2026-08-13T12:00:00Z"));
    expect(formatLocalLabel("Lisbon", date)).toBe("12:00 in Lisbon");
  });
});

describe("Country language catalog", () => {
  it("matches a language inside a combined Radio Browser field", () => {
    const mixed = {
      language: "english,hindi",
    } as Station;
    expect(stationSpeaksLanguage(mixed, "Hindi")).toBe(true);
    expect(stationSpeaksLanguage(mixed, "Malayalam")).toBe(false);
    expect(
      languageChipsFromStations([
        { language: "malayalam" } as Station,
        { language: "english,hindi" } as Station,
        { language: "hindi" } as Station,
      ])
    ).toEqual(["Hindi", "English", "Malayalam"]);
  });
});

describe("Elsewhere place names", () => {
  it("strips a trailing region code from a city", () => {
    const station = {
      city: "New York NY",
      state: "New York",
      country: "The United States Of America",
    } as Station;
    expect(stationLocation(station)).toBe("New York");
  });

  it("prints the country once when the location fallback is the country", () => {
    expect(
      stationPlaceLine({
        city: "",
        state: "",
        country: "India",
      } as Station)
    ).toBe("India");
    expect(
      stationPlaceLine({
        city: "Kochi",
        state: "Kerala",
        country: "India",
      } as Station)
    ).toBe("Kochi, India");
  });
});

describe("Elsewhere globe intelligence", () => {
  const lisbon = {
    id: "Portugal:Lisbon",
    name: "Lisbon",
    country: "Portugal",
    region: "Europe",
    stationName: "Antena 1",
    count: 4,
    latitude: 38.72,
    longitude: -9.14,
  };
  const tokyo = {
    ...lisbon,
    id: "Japan:Tokyo",
    name: "Tokyo",
    country: "Japan",
    region: "Asia",
    stationName: "J-Wave",
    latitude: 35.68,
    longitude: 139.69,
  };

  it("turns the globe to face a longitude", () => {
    expect(facingRotation(0)).toBeCloseTo(0);
    expect(facingRotation(90)).toBeCloseTo(-Math.PI / 2);
  });

  it("takes the short turn", () => {
    expect(Math.abs(shortestAngle(3, -3))).toBeLessThan(Math.PI);
    expect(Math.abs(shortestAngle(-Math.PI + 0.1, Math.PI - 0.1))).toBeLessThan(
      1
    );
  });

  it("ignores cities on the far side of the globe", () => {
    const rotation = facingRotation(lisbon.longitude);
    const hit = nearestVisiblePlace(
      [lisbon, tokyo],
      rotation,
      200,
      200,
      400,
      400,
      400
    );
    expect(hit?.place.name).toBe("Lisbon");
  });

  it("holds the globe still while the pointer is over it", () => {
    expect(shouldSpinGlobe(false, false, false)).toBe(true);
    expect(shouldSpinGlobe(false, false, true)).toBe(false);
    expect(shouldSpinGlobe(true, false, false)).toBe(false);
    expect(shouldSpinGlobe(false, true, false)).toBe(false);
  });

  it("widens the city hit once a place is already aimed", () => {
    expect(globeHitDistance("mouse", false)).toBe(GLOBE_HIT_ACQUIRE);
    expect(globeHitDistance("mouse", true)).toBe(GLOBE_HIT_HOLD);
    expect(globeHitDistance("touch", false)).toBe(GLOBE_HIT_TOUCH);
  });

  it("eases the facing turn instead of snapping", () => {
    expect(turnProgress(0)).toBe(0);
    expect(turnProgress(520)).toBe(1);
    expect(turnProgress(260)).toBeGreaterThan(0.8);
    const halfway = rotationAtTurn(0, Math.PI / 2, 0.5);
    expect(halfway).toBeCloseTo(Math.PI / 4);
  });

  it("keeps a station's own coordinates when Radio Browser sent them", () => {
    const point = stationGlobeCoords({
      latitude: 13.08,
      longitude: 80.27,
      countryCode: "IN",
      country: "India",
    });
    expect(point).toEqual({
      latitude: 13.08,
      longitude: 80.27,
      sourced: "station",
    });
  });

  it("falls back to the country center when a search row has no geo", () => {
    const india = countryCentroid("IN", "India");
    expect(india).toEqual({ latitude: 20.59, longitude: 78.96 });
    expect(
      stationGlobeCoords({
        latitude: null,
        longitude: null,
        countryCode: "IN",
        country: "India",
      })
    ).toEqual({ latitude: 20.59, longitude: 78.96, sourced: "country" });
  });

  it("still locates a country by name when the ISO code is missing", () => {
    expect(
      stationGlobeCoords({
        latitude: null,
        longitude: null,
        countryCode: null,
        country: "Sri Lanka",
      })?.sourced
    ).toBe("country");
  });

  it("plots a Tamil catalog that Radio Browser returned without coordinates", () => {
    const tamil = [
      {
        uuid: "in-1",
        name: "90s-tamil-melodies",
        country: "India",
        countryCode: "IN",
        city: null,
        state: null,
        latitude: null,
        longitude: null,
        clickCount: 40,
      },
      {
        uuid: "in-2",
        name: "Radio Paramankurichi Tamil",
        country: "India",
        countryCode: "IN",
        city: null,
        state: null,
        latitude: null,
        longitude: null,
        clickCount: 12,
      },
      {
        uuid: "my-1",
        name: "Jei FM Klang Tamil",
        country: "Malaysia",
        countryCode: "MY",
        city: null,
        state: "Selangor",
        latitude: null,
        longitude: null,
        clickCount: 8,
      },
      {
        uuid: "lk-1",
        name: "Sooriyan FM",
        country: "Sri Lanka",
        countryCode: "LK",
        city: null,
        state: null,
        latitude: null,
        longitude: null,
        clickCount: 20,
      },
    ].map(
      (row) =>
        ({
          url: "",
          streamUrl: null,
          favicon: "",
          language: "Tamil",
          tags: "tamil",
          bitrate: 128,
          codec: "MP3",
          ...row,
        }) as Station
    );
    const places = buildGlobePlaces(tamil, {
      nowPlaying: null,
      place: null,
      stampedKeys: new Set(),
    });
    expect(places.map((place) => place.country).sort()).toEqual([
      "India",
      "Malaysia",
      "Sri Lanka",
    ]);
    const india = places.find((place) => place.country === "India");
    expect(india?.count).toBe(2);
    expect(india?.latitude).toBeCloseTo(20.59);
    expect(india?.longitude).toBeCloseTo(78.96);
    expect(places[0]?.country).toBe("India");
  });

  it("keeps the world globe while a typed search catalog is still empty", () => {
    const world = [
      {
        uuid: "lisbon",
        name: "Antena 1",
        country: "Portugal",
        countryCode: "PT",
        latitude: 38.72,
        longitude: -9.14,
        url: "",
        streamUrl: null,
        favicon: "",
        state: null,
        language: null,
        tags: null,
        bitrate: 0,
        codec: null,
      } as Station,
    ];
    expect(globeStationPool("tamil", [], world)).toBe(world);
    expect(globeStationPool("tamil", tamilCatalogStub(), world)).toHaveLength(1);
    expect(globeStationPool("", [], world)).toBe(world);
  });

  it("turns the globe toward the densest search country once the catalog lands", () => {
    const places = buildGlobePlaces(tamilCatalogStub(), {
      nowPlaying: null,
      place: null,
      stampedKeys: new Set(),
    });
    expect(
      globeFocusId(null, null, "tamil", true, places)
    ).toBe("India:India");
    expect(globeFocusId(null, null, "tamil", false, places)).toBeNull();
  });
});

function tamilCatalogStub(): Station[] {
  return [
    {
      uuid: "in-1",
      name: "Big FM Tamil",
      url: "",
      streamUrl: null,
      favicon: "",
      country: "India",
      countryCode: "IN",
      state: null,
      latitude: null,
      longitude: null,
      language: "Tamil",
      tags: "tamil",
      bitrate: 128,
      codec: "MP3",
    } as Station,
  ];
}

describe("Elsewhere interpret fallback", () => {
  it("detects mix intent and extracts country from a sentence", () => {
    expect(wantsMixFromPrompt("surprise me with a late night mix")).toBe(true);
    const intent = intentFromExtractor("rainy night jazz in kerala");
    expect(intent.country).toBe("India");
    expect(intent.query).toContain("kerala");
    expect(intent.wantsMix).toBe(false);
  });

  it("does not treat dusk, night, or tonight as a mix", () => {
    expect(wantsMixFromPrompt("Lisbon at dusk")).toBe(false);
    expect(wantsMixFromPrompt("Malayalam night")).toBe(false);
    expect(wantsMixFromPrompt("tonight")).toBe(false);
    expect(intentFromExtractor("Lisbon at dusk").wantsMix).toBe(false);
    expect(intentFromExtractor("three unknown words").wantsMix).toBe(false);
  });
});

describe("Elsewhere live dispatch", () => {
  it("never shows a previous station's caption", () => {
    const vinyl = {
      id: "vinyl|none|2026-08-15T17",
      headline: "Live from New York",
      body: "Classic Vinyl HD is on the air from New York. This station is not sending track titles.",
      mood: "jazz",
      localLabel: "17:08 in New York",
    };
    expect(liveDispatch(vinyl, "adroit", "vinyl")).toBeNull();
    expect(liveDispatch(vinyl, "vinyl", "vinyl")?.body).toMatch(/Classic Vinyl/);
    expect(liveDispatch(vinyl, "adroit")).toBeNull();
    expect(
      dispatchAfterStationChange("vinyl", "adroit", vinyl)
    ).toEqual({
      stationId: "adroit",
      dispatch: null,
      status: "idle",
    });
    expect(
      dispatchAfterStationChange("adroit", "adroit", vinyl).dispatch
    ).toBe(vinyl);
    expect(dispatchAfterStationChange("adroit", null, vinyl).dispatch).toBeNull();
  });
});

describe("Elsewhere dispatch templates", () => {
  beforeEach(() => clearDispatchCache());

  it("writes an honest no-track caption and caches by station/track/hour", () => {
    const request = {
      stationId: "abc",
      stationName: "Club FM",
      city: "Kochi",
      country: "India",
      localTimeISO: "2026-08-13T14:07:00.000Z",
      track: null,
    };
    const dispatch = templateDispatch(request);
    expect(dispatch.headline).toBe("Live from Kochi");
    expect(dispatch.body).toMatch(/not sending track titles/i);
    rememberDispatch(dispatchCacheKey(request), dispatch);
    expect(readDispatch(dispatchCacheKey(request))?.headline).toBe(
      "Live from Kochi"
    );
  });
});

describe("Heuristics cost lock", () => {
  it("uses DeepSeek V4 Flash only", () => {
    process.env.HEURISTICS_MODEL = "deepseek-v4-pro";
    process.env.HEURISTICS_FALLBACK_MODEL = "kimi-k3";
    expect(getGatewayConfig().models).toEqual(["deepseek-v4-flash"]);
  });
});

describe("Gemini free-tier model", () => {
  it("prefers 2.5 Flash and strips Vercel newlines", () => {
    const previous = process.env.GEMINI_MODEL;
    delete process.env.GEMINI_MODEL;
    expect(getGeminiModel({} as NodeJS.ProcessEnv)).toBe("gemini-2.5-flash");
    expect(trimEnv("gemini-2.5-flash-lite\\n")).toBe("gemini-2.5-flash-lite");
    expect(trimEnv("gemini\n")).toBe("gemini");
    process.env.GEMINI_MODEL = previous;
  });
});

describe("Heuristics provider wiring", () => {
  const original = { ...process.env };

  beforeEach(() => {
    resetProviderCache();
    Object.assign(process.env, original);
    delete process.env.HEURISTICS_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.OLLAMA_URL;
  });

  it("constructs only when a key is present", () => {
    process.env.AI_PROVIDER = "heuristics";
    process.env.HEURISTICS_API_KEY = "sk-test";
    const provider = getProvider();
    expect(provider).toBeInstanceOf(HeuristicsProvider);
  });

  it("prefers heuristics ahead of openrouter when both keys exist", () => {
    process.env.AI_PROVIDER = "heuristics";
    process.env.HEURISTICS_API_KEY = "sk-test";
    process.env.OPENROUTER_API_KEY = "or-test";
    const provider = getProvider();
    expect(provider).toBeInstanceOf(FallbackProvider);
    const providers = (provider as unknown as { providers: unknown[] })
      .providers;
    expect(providers[0]).toBeInstanceOf(HeuristicsProvider);
    expect(providers[1]).toBeInstanceOf(OpenRouterProvider);
  });
});

describe("live stylesheet", () => {
  it("does not ship Mantine or leftover travel CSS on the product face", () => {
    const css = readFileSync(
      new URL("../../app/tailwind.css", import.meta.url),
      "utf8"
    );
    const config = readFileSync(
      new URL("../../tailwind.config.ts", import.meta.url),
      "utf8"
    );
    expect(css).not.toMatch(/@mantine\/(core|carousel)/);
    expect(css).not.toMatch(/travel-stack|app-header__inner|hero-morph/);
    expect(css).toContain(".rp-home");
    expect(css).toContain("not-found-easter-egg");
    expect(css).toContain("minmax(min(258px, 100%), 1fr)");
    expect(css).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(css).toContain('[data-atmosphere="day"]');
    expect(css).toContain(".ew-atmosphere");
    expect(css).toContain(".ew-atmosphere-icon");
    expect(css).toContain(".ew-atlas");
    expect(css).toContain(".ew-theater-back");
    expect(css).toContain(".ew-theater-field");
    expect(css).toContain(".ew-theater-sky");
    expect(css).toContain(".ew-theater-folio");
    expect(css).toContain(".ew-theater-well");
    expect(css).toMatch(/\.ew-theater-well[^{]*\{[^}]*min-height:\s*16\.75rem/);
    expect(css).toMatch(/\.ew-theater-well \{ min-height: 16rem; \}/);
    expect(css).toMatch(/grid-template-areas:\s*"sky" "folio"/);
    expect(css).toContain(".rp-art-mark");
    expect(css).toContain(".rp-art img");
    expect(config).toContain("./app/components/radio-passport/**/*.{ts,tsx}");
    expect(config).not.toContain("./app/**/*.{ts,tsx,jsx,js}");
    const stationRow = readFileSync(
      new URL("../../app/components/radio-passport/StationRow.tsx", import.meta.url),
      "utf8",
    );
    expect(stationRow).toContain("sanitizeArtworkUrl");
    expect(stationRow).toContain("rp-art-mark");
    expect(stationRow).not.toContain("▶");
  });
});
