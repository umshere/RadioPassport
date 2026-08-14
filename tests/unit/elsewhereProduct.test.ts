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
  nearestVisiblePlace,
  shortestAngle,
} from "~/components/radio-passport/ParticleGlobe";
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
});

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
