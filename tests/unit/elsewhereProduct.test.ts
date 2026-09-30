import { estimatedLongitude } from "~/utils/countryCentroids";
import { readFileSync } from "node:fs";
import { readAppCss } from "./appCss";
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

describe("Country centroids", () => {
  it("estimates a longitude from the country code only", () => {
    expect(estimatedLongitude({ countryCode: "in" })).toBeCloseTo(78.96);
    expect(estimatedLongitude({ countryCode: null })).toBeNull();
    expect(estimatedLongitude({ countryCode: "ZZ" })).toBeNull();
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

describe("live stylesheet", () => {
  it("does not ship Mantine or leftover travel CSS on the product face", () => {
    const css = readAppCss();
    const config = readFileSync(
      new URL("../../tailwind.config.ts", import.meta.url),
      "utf8"
    );
    expect(css).not.toMatch(/@mantine\/(core|carousel)/);
    expect(css).not.toMatch(/travel-stack|app-header__inner|hero-morph/);
    expect(css).toContain(".ew-home {");
    expect(css).toContain("not-found-easter-egg");
    expect(css).toContain("minmax(min(258px, 100%), 1fr)");
    expect(css).toContain("grid-template-columns: minmax(0, 1fr)");
    expect(css).toContain('[data-atmosphere="day"]');
    expect(css).toContain(".ew-atmosphere");
    expect(css).toContain(".ew-horizon-kicker");
    expect(css).toContain(".ew-band-nav { display: none; }");
    expect(css).toContain(".ew-band-nav.is-band { position: fixed;");
    expect(css).toContain(".ew-band-nav.is-rail { display: flex;");
    expect(css).toContain("@media (min-width: 961px)");
    expect(css).toContain(".ew-site-bar-left");
    // The bar's ink is opaque, so a blur would paint nothing — and it would
    // become the containing block for fixed descendants, pinning the phone
    // band to the header instead of the viewport.
    expect(css).not.toMatch(/\.ew-site-bar \{[^}]*backdrop-filter:/);
    expect(css).toMatch(/\.rp-overlay \{[^}]*z-index: 39/);
    expect(css).toContain(".ew-atlas");
    expect(css).toContain(".ew-sky {");
    expect(css).toContain(".ew-site-bar");
    expect(css).toContain(".ew-frame.is-home-frame");
    expect(css).toContain("flex-wrap: nowrap");
    expect(css).toContain(".ew-theater-rail .rp-intent");
    expect(css).toContain(".ew-gate-field .ew-seek");
    expect(css).not.toContain(".ew-site-bar.is-home");
    expect(css).not.toContain(".ew-atmosphere-icon");
    expect(css).not.toContain(".ew-site-bar:has(.ew-theater-rail .rp-intent)");
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

describe("home: the departures hall", () => {
  it("keeps the shell, the nav and the overlays wired; no globe on the home", () => {
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
    // The phone band mounts at the root beside the dock — inside the sticky
    // header WebKit drops its paint once the Atlas veil opens. The header
    // keeps only the desktop rail instance.
    expect(root).toContain('<BandNav variant="band" />');
    expect(root).toContain("PlayerDock");
    const siteBar = readFileSync(
      new URL("../../app/components/SiteBar.tsx", import.meta.url),
      "utf8",
    );
    expect(siteBar).toContain('<BandNav variant="rail" />');
    expect(siteBar).toContain("ew-site-bar-left");
    expect(siteBar).toContain("requestCloseAtlas");
    // About is a quiet link in the bar and the home's foot line, not a tab.
    expect(siteBar).toContain('to="/about"');
    expect(home).toContain('to="/about"');
    const band = readFileSync(
      new URL("../../app/components/BandNav.tsx", import.meta.url),
      "utf8",
    );
    expect(band).toContain("Elsewhere");
    expect(band).toContain("Atlas");
    expect(band).toContain("Desk");
    expect(band).not.toContain('"Theater"');
    expect(band).not.toContain('label: "About"');
    expect(band).toContain('id: "theater"');
    expect(band).toContain("aria-disabled");
    expect(band).toContain("homeWithAtlasHref");
    expect(band).not.toContain("/atlas");
    expect(band).toContain("ATLAS_SYNC_EVENT");
    expect(band).toContain("requestCloseAtlas");
    expect(band).toContain("preventScrollReset");
    const homeOverlaysHook = readFileSync(
      new URL("../../app/hooks/home/useHomeOverlays.ts", import.meta.url),
      "utf8",
    );
    const homeOverlays = readFileSync(
      new URL("../../app/components/radio-passport/HomeOverlays.tsx", import.meta.url),
      "utf8",
    );
    expect(homeOverlaysHook).toContain("announceAtlas");
    expect(homeOverlaysHook).toContain("CLOSE_ATLAS_EVENT");
    expect(homeOverlays).toContain("playFromCountryNextState");
    // The instant-board derivation lives in the home stations hook.
    const homeStations = readFileSync(
      new URL("../../app/hooks/home/useHomeStations.ts", import.meta.url),
      "utf8",
    );
    expect(homeStations).toContain("seekingInstantPool");
    expect(home).toContain("useHomeStations");
    expect(home).toContain("hourTravelHead");
    const overlays = readFileSync(
      new URL(
        "../../app/components/radio-passport/Overlays.tsx",
        import.meta.url,
      ),
      "utf8",
    );
    expect(overlays).toContain('<Sheet close={close} label="Atlas" hideClose>');
    expect(overlays).toContain("CountryFlag");
    // Overlay headers are boards too — Atlas and the country name flip.
    expect(overlays).toContain("FlipBoard");
    expect(overlays).toContain('<FlipBoard text="Atlas" />');
    // Atlas and the country drilldown share one way back: no ×, the tabs
    // and ← Atlas dismiss them. (Passport keeps its ×.)
    expect(overlays.match(/<Sheet[^>]*hideClose/g)?.length).toBe(2);
    // Three bands: the sky, the gates (with the intent field as a real child
    // of its rail), the departures board. The Atlas keeps the world.
    expect(home).toContain("<HomeSky");
    expect(home).toContain("<HomeGates");
    expect(home).toContain("<HomeDepartures");
    expect(home).toContain("is-landed");
    expect(home).not.toMatch(/ParticleGlobe|HomeGlobeSide|GalaxyBackdrop|BoardSheet|CoverStrip/);
    const gates = readFileSync(
      new URL("../../app/components/home/HomeGates.tsx", import.meta.url),
      "utf8",
    );
    expect(gates).toContain("<SiteSeekRail />");
    expect(gates).toContain("<HourRail");
    const sky = readFileSync(
      new URL("../../app/components/home/HomeSky.tsx", import.meta.url),
      "utf8",
    );
    expect(sky).toContain('className="ew-sky ew-home-sky"');
    expect(sky).toContain("CountryFlag");
    expect(sky).toContain("<AtmospherePin />");
    expect(sky).toContain('size="desk"');
  });
});

describe("mobile cover strip", () => {
  it("is retired from the home: the gates stand sticky instead", () => {
    const css = readAppCss();
    const home = readFileSync(
      new URL("../../app/routes/_index.tsx", import.meta.url),
      "utf8",
    );
    const listen = readFileSync(
      new URL("../../app/routes/listen.tsx", import.meta.url),
      "utf8",
    );
    expect(home).not.toContain("CoverStrip");
    expect(listen).not.toContain("CoverStrip");
    // The dock keeps no backdrop blur: the ink is 94% opaque so the blur
    // paints nothing, but on mobile Safari it pulled the neighboring fixed
    // band through a path where it stopped painting yet kept hit-testing.
    expect(css).not.toMatch(/\.rp-dock \{[^}]*backdrop-filter:/);
    // The Atlas veil keeps none either, for the same reason.
    expect(css).not.toMatch(/\.rp-overlay \{[^}]*backdrop-filter:/);
    expect(css).toContain("transform: translateZ(0)");
    expect(css).toMatch(/\.ew-gates \{[^}]*position: sticky/);
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
    expect(ship).toContain("elsewhere-npm-cache");
    expect(ship).not.toContain("username=heuristicsai");
    // One push, one build: ship waits for the Git auto-deploy of the pushed
    // commit instead of firing a second CLI build after the push.
    expect(ship).toContain("githubCommitSha");
    expect(ship).toContain("waitForGitDeploy");
    // `vercel ls` draws its table on stderr when piped — the waiter must
    // read both streams or it polls blind forever.
    expect(ship).toContain("probed.stderr");
    expect(deploy).toContain("npm run ship");
    expect(deploy).toContain("gh auth token -u umshere");
    expect(deploy).toContain("vercel ls -m githubCommitSha");
    expect(deploy).toContain("never `vercel --prod` after a push");
  });
});
