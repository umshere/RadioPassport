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
  GLOBE_LIST_CAP,
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
  spreadCountryOffset,
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
    expect(places.map((place) => place.id)).toEqual([
      "in-1",
      "in-2",
      "my-1",
      "lk-1",
    ]);
    expect(places.map((place) => place.stationName)).toEqual([
      "90s-tamil-melodies",
      "Radio Paramankurichi Tamil",
      "Jei FM Klang Tamil",
      "Sooriyan FM",
    ]);
    const india = places.filter((place) => place.country === "India");
    expect(india).toHaveLength(2);
    expect(india[0]?.count).toBe(1);
    expect(india[0]?.latitude).not.toBeCloseTo(india[1]?.latitude ?? 0, 3);
    for (const place of india) {
      expect(place.latitude).toBeGreaterThan(15);
      expect(place.latitude).toBeLessThan(26);
      expect(place.longitude).toBeGreaterThan(73);
      expect(place.longitude).toBeLessThan(84);
    }
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
    const list = tamilCatalogStub();
    expect(globeStationPool("tamil", tamilCatalogStub(), world, list)).toBe(
      list
    );
  });

  it("turns the globe toward a list station once the catalog lands", () => {
    const places = buildGlobePlaces(tamilCatalogStub(), {
      nowPlaying: null,
      place: null,
      stampedKeys: new Set(),
    });
    expect(globeFocusId(null, "tamil", true, places)).toBe("in-1");
    expect(globeFocusId(null, "tamil", false, places)).toBeNull();
    expect(
      globeFocusId({ uuid: "in-1" }, "tamil", true, places)
    ).toBe("in-1");
  });

  it("caps the globe to the list prefix and keeps the station on air", () => {
    const many = Array.from({ length: GLOBE_LIST_CAP + 8 }, (_, index) => ({
      ...tamilCatalogStub()[0],
      uuid: `in-${index}`,
      name: `Tamil ${index}`,
      clickCount: index,
    })) as Station[];
    const playing = many[many.length - 1] as Station;
    const places = buildGlobePlaces(many, {
      nowPlaying: playing,
      place: null,
      stampedKeys: new Set(),
    });
    expect(places).toHaveLength(GLOBE_LIST_CAP);
    expect(places[0]?.id).toBe("in-0");
    expect(places.some((place) => place.id === playing.uuid)).toBe(true);
    expect(places.filter((place) => place.playing)).toHaveLength(1);
  });

  it("leaves true station coordinates unjittered", () => {
    expect(spreadCountryOffset("x", "station")).toEqual({
      latitude: 0,
      longitude: 0,
    });
    const lisbon = {
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
      city: "Lisbon",
    } as Station;
    const [place] = buildGlobePlaces([lisbon], {
      nowPlaying: null,
      place: null,
      stampedKeys: new Set(),
    });
    expect(place?.id).toBe("lisbon");
    expect(place?.latitude).toBeCloseTo(38.72);
    expect(place?.longitude).toBeCloseTo(-9.14);
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
    expect(css).toContain(".ew-horizon-kicker");
    expect(css).toContain(".ew-band-nav");
    expect(css).toContain("@media (min-width: 961px)");
    expect(css).toContain(".ew-site-bar-left");
    // The bar's ink is opaque, so a blur would paint nothing — and it would
    // become the containing block for fixed descendants, pinning the phone
    // band to the header instead of the viewport.
    expect(css).not.toMatch(/\.ew-site-bar \{[^}]*backdrop-filter:/);
    expect(css).toMatch(/\.rp-overlay \{[^}]*z-index: 39/);
    expect(css).toContain(".ew-atlas");
    expect(css).toContain(".ew-theater-back");
    expect(css).toContain(".ew-theater-field");
    expect(css).toContain(".ew-theater-sky");
    expect(css).toContain(".ew-theater-folio");
    expect(css).toContain("mask-image: linear-gradient(90deg, transparent 0%, #000 32%)");
    expect(css).toContain(".ew-site-bar");
    expect(css).toContain(".ew-frame.is-home-frame");
    expect(css).toContain(".rp-intro-board");
    expect(css).toContain(".rp-land-slot");
    expect(css).toContain("contain: layout paint");
    expect(css).toContain("flex-wrap: nowrap");
    expect(css).toContain(".ew-theater-rail .rp-intent");
    expect(css).toContain(".ew-home-seek");
    expect(css).not.toContain(".ew-site-bar.is-home");
    expect(css).not.toContain(".ew-atmosphere-icon");
    expect(css).toContain(".rp-home.is-landed .rp-land-slot");
    expect(css).toMatch(/\.rp-intro-board \{[\s\S]*?min-height: 16rem/);
    expect(css).not.toContain(".ew-site-bar:has(.ew-theater-rail .rp-intent)");
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

describe("home cover panes", () => {
  it("keeps the intro board and globe as independent shells", () => {
    const home = readFileSync(
      new URL("../../app/routes/_index.tsx", import.meta.url),
      "utf8"
    );
    const root = readFileSync(
      new URL("../../app/root.tsx", import.meta.url),
      "utf8"
    );
    expect(root).toContain("is-home-frame");
    expect(root).toContain("is-home");
    expect(root).not.toContain("BandNav");
    expect(root).toContain("PlayerDock");
    const siteBar = readFileSync(
      new URL("../../app/components/SiteBar.tsx", import.meta.url),
      "utf8",
    );
    expect(siteBar).toContain("BandNav");
    expect(siteBar).toContain("ew-site-bar-left");
    expect(siteBar).toContain("requestCloseAtlas");
    const band = readFileSync(
      new URL("../../app/components/BandNav.tsx", import.meta.url),
      "utf8",
    );
    expect(band).toContain("Elsewhere");
    expect(band).toContain("Atlas");
    expect(band).toContain("Theater");
    expect(band).toContain("Room");
    expect(band).toContain("aria-disabled");
    expect(band).toContain("homeWithAtlasHref");
    expect(band).not.toContain("/atlas");
    expect(band).toContain("ATLAS_SYNC_EVENT");
    expect(band).toContain("requestCloseAtlas");
    expect(band).toContain("preventScrollReset");
    expect(home).toContain("announceAtlas");
    expect(home).toContain("CLOSE_ATLAS_EVENT");
    expect(home).toContain("CountryFlag");
    expect(home).toContain("ew-coverline-flag");
    expect(home).toContain("playFromCountryNextState");
    const overlays = readFileSync(
      new URL(
        "../../app/components/radio-passport/Overlays.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    expect(overlays).toContain('<Overlay close={close} label="Atlas" hideClose>');
    expect(overlays).toContain("CountryFlag");
    expect(home).toContain('className="rp-intro-board"');
    expect(home).toContain('className="rp-intro-copy"');
    expect(home).toContain('className="rp-land-slot"');
    expect(home).toContain('className="rp-intel-slot"');
    expect(home).toContain("is-landed");
    expect(home).not.toContain("{arrival.headline}");
    expect(home).toContain('className="ew-coverline ew-arrive"');
    expect(home).toContain("CoverStrip");
    expect(home).toMatch(/className="rp-stage"[\s\S]*SiteSeekRail/);
    expect(home).not.toContain("scrollIntoView");
    expect(home).toMatch(
      /className=\{`ew-cover\$\{arrivalCity \? " ew-seam-city" : ""\}`\}\s*>/
    );
  });
});

describe("mobile cover strip", () => {
  it("condenses the home coverline with IntersectionObserver, never on theater or room", () => {
    const strip = readFileSync(
      new URL("../../app/components/CoverStrip.tsx", import.meta.url),
      "utf8",
    );
    const css = readFileSync(new URL("../../app/tailwind.css", import.meta.url), "utf8");
    const home = readFileSync(
      new URL("../../app/routes/_index.tsx", import.meta.url),
      "utf8",
    );
    const listen = readFileSync(
      new URL("../../app/routes/listen.tsx", import.meta.url),
      "utf8",
    );
    const about = readFileSync(
      new URL("../../app/routes/about.tsx", import.meta.url),
      "utf8",
    );
    const siteBar = readFileSync(
      new URL("../../app/components/SiteBar.tsx", import.meta.url),
      "utf8",
    );
    const root = readFileSync(
      new URL("../../app/root.tsx", import.meta.url),
      "utf8",
    );
    const slot = readFileSync(
      new URL("../../app/components/radio-passport/CoverSlot.tsx", import.meta.url),
      "utf8",
    );
    const layerIndex = css.indexOf("@layer components");
    const stripCss = css.indexOf(".ew-cover-strip {");
    expect(strip).toContain("IntersectionObserver");
    expect(strip).toContain('root: null');
    expect(strip).toContain('const ROOT_MARGIN = "-52px 0px 0px 0px"');
    expect(strip).toContain("rootMargin: ROOT_MARGIN");
    expect(strip).toContain(".rp-home .ew-coverline");
    expect(strip).toContain("overlay");
    expect(strip).not.toContain("addEventListener(\"scroll\"");
    expect(home).toContain("CoverStrip");
    expect(home).toContain("overlay={atlas || Boolean(country) || passport}");
    expect(listen).not.toContain("CoverStrip");
    expect(about).not.toContain("CoverStrip");
    expect(stripCss).toBeGreaterThan(layerIndex);
    // The strip docks to the sticky bar as a real child (slot, never a DOM
    // portal — Safari drops portaled nodes out of sticky headers), so its
    // edge is the header's true bottom, not a hardcoded 52px guess.
    expect(siteBar).toContain("CoverSlotRail");
    expect(root).toContain("CoverSlotProvider");
    expect(home).toContain("CoverSlotPortal");
    expect(slot).toContain("useSyncExternalStore");
    expect(slot).not.toContain("createPortal");
    expect(css).toContain(".ew-cover-strip { position: absolute;");
    expect(css).toContain("top: 100%");
    expect(css).not.toContain("top: calc(52px + env(safe-area-inset-top, 0px))");
    expect(css).toContain("0 10px 28px rgba(0, 0, 0, .5)");
    // The dock keeps no backdrop blur: the ink is 94% opaque so the blur
    // paints nothing, but on mobile Safari it pulled the neighboring fixed
    // band through a path where it stopped painting yet kept hit-testing.
    expect(css).not.toMatch(/\.rp-dock \{[^}]*backdrop-filter:/);
    expect(css).toContain("transform: translateZ(0)");
    expect(css).toContain(":root[data-atmosphere=\"day\"] .ew-cover-strip-land { color: #6F582D; }");
    expect(css).toContain(":root[data-atmosphere=\"day\"] .ew-cover-strip-dot { background: #35635F; }");
    expect(css).toContain("@media (max-width: 960px) and (prefers-reduced-motion: reduce)");
    expect(css).toContain(".rp-globe-side { position: relative; top: auto; z-index: auto; }");
  });
});

describe("ship command", () => {
  it("pushes as umshere and uses a writable npm cache", () => {
    const ship = readFileSync(
      new URL("../../scripts/ship.mjs", import.meta.url),
      "utf8"
    );
    const deploy = readFileSync(
      new URL("../../docs/DEPLOY.md", import.meta.url),
      "utf8"
    );
    const pkg = JSON.parse(
      readFileSync(new URL("../../package.json", import.meta.url), "utf8")
    );
    expect(pkg.scripts.ship).toBe("node scripts/ship.mjs");
    expect(ship).toContain('["auth", "token", "-u", "umshere"]');
    expect(ship).toContain("username=umshere");
    expect(ship).toContain("vercel");
    expect(ship).toContain("--prod");
    expect(ship).toContain("elsewhere-npm-cache");
    expect(ship).not.toContain("username=heuristicsai");
    expect(deploy).toContain("npm run ship");
    expect(deploy).toContain("gh auth token -u umshere");
  });
});
