import {
  json,
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
} from "@remix-run/node";
import type { PlaybackStrategy, SceneDescriptor } from "~/scenes/types";
import type { Station } from "~/types/radio";
import { getProvider } from "~/services/ai/providers";
import { rankStations, type IntentMeta } from "~/server/stations/ranking";
import { annotateHealth } from "~/server/stations/health";
import { rbFetchJson } from "~/utils/radioBrowser";
import { normalizeStations } from "~/utils/stations";
import { filterStationCandidates } from "~/services/ai/providers/providerUtils";
import { extractPromptIntent } from "~/services/ai/intent/promptIntent";

const USE_MOCK = process.env.USE_MOCK?.trim().toLowerCase() === "true";

const LANGUAGE_CODE_TO_NAME: Record<string, string> = {
  ta: "tamil",
  ml: "malayalam",
  hi: "hindi",
  kn: "kannada",
  te: "telugu",
  pa: "punjabi",
  bn: "bengali",
  mr: "marathi",
  gu: "gujarati",
  ur: "urdu",
};

const BASE_STATIONS: Record<string, Station[]> = {
  "aurora-trails": [
    {
      uuid: "aurora-horizon-1",
      name: "Reykjavik Aurora FM",
      url: "https://streams.radio-passport.com/aurora",
      streamUrl: "https://streams.radio-passport.com/aurora",
      favicon: "/radio-passport-icon.png",
      country: "Iceland",
      countryCode: "IS",
      state: null,
      language: "Icelandic",
      languageCodes: ["is"],
      tags: "ambient,chill,northern lights",
      tagList: ["ambient", "chill", "northern lights"],
      bitrate: 192,
      codec: "mp3",
      homepage: "https://aurorafm.example.com",
      hls: false,
      lastCheckOk: true,
      lastCheckOkTime: null,
      lastCheckTime: null,
      lastLocalCheckTime: null,
      sslError: false,
      votes: 0,
      clickCount: 0,
      clickTrend: 0,
      highlight:
        "Glacial pads and aurora-inspired textures drifting above Reykjavik.",
    },
    {
      uuid: "aurora-horizon-2",
      name: "Oslo Fjord Echoes",
      url: "https://streams.radio-passport.com/fjord",
      streamUrl: "https://streams.radio-passport.com/fjord",
      favicon: "/radio-passport-icon.png",
      country: "Norway",
      countryCode: "NO",
      state: null,
      language: "Norwegian",
      languageCodes: ["no"],
      tags: "downtempo,scandinavian",
      tagList: ["downtempo", "scandinavian"],
      bitrate: 160,
      codec: "aac",
      homepage: "https://fjordechoes.example.com",
      hls: true,
      lastCheckOk: true,
      lastCheckOkTime: null,
      lastCheckTime: null,
      lastLocalCheckTime: null,
      sslError: false,
      votes: 0,
      clickCount: 0,
      clickTrend: 0,
      highlight: "Nordic downtempo with soft shoreline field recordings.",
    },
    {
      uuid: "aurora-horizon-3",
      name: "Svalbard Signal",
      url: "https://streams.radio-passport.com/svalbard",
      streamUrl: "https://streams.radio-passport.com/svalbard",
      favicon: "/radio-passport-icon.png",
      country: "Norway",
      countryCode: "NO",
      state: "Svalbard",
      language: "English",
      languageCodes: ["en"],
      tags: "arctic,ambient",
      tagList: ["arctic", "ambient"],
      bitrate: 128,
      codec: "mp3",
      homepage: "https://svalbard-signal.example.com",
      hls: false,
      lastCheckOk: true,
      lastCheckOkTime: null,
      lastCheckTime: null,
      lastLocalCheckTime: null,
      sslError: false,
      votes: 0,
      clickCount: 0,
      clickTrend: 0,
      highlight: "Slow-blooming drones captured beneath polar twilight.",
    },
    {
      uuid: "aurora-horizon-4",
      name: "Helsinki Polar Jazz",
      url: "https://streams.radio-passport.com/polarjazz",
      streamUrl: "https://streams.radio-passport.com/polarjazz",
      favicon: "/radio-passport-icon.png",
      country: "Finland",
      countryCode: "FI",
      state: null,
      language: "Finnish",
      languageCodes: ["fi"],
      tags: "jazz,night",
      tagList: ["jazz", "night"],
      bitrate: 192,
      codec: "mp3",
      homepage: "https://polarnightjazz.example.com",
      hls: false,
      lastCheckOk: true,
      lastCheckOkTime: null,
      lastCheckTime: null,
      lastLocalCheckTime: null,
      sslError: false,
      votes: 0,
      clickCount: 0,
      clickTrend: 0,
      highlight: "Late-night Nordic jazz with frosted brass and vinyl crackle.",
    },
  ],
  "desert-nocturne": [
    {
      uuid: "desert-night-1",
      name: "Marrakesh Midnight Market",
      url: "https://streams.radio-passport.com/marrakesh",
      streamUrl: "https://streams.radio-passport.com/marrakesh",
      favicon: "/radio-passport-icon.png",
      country: "Morocco",
      countryCode: "MA",
      state: null,
      language: "Arabic",
      languageCodes: ["ar"],
      tags: "gnawa,desert",
      tagList: ["gnawa", "desert"],
      bitrate: 160,
      codec: "aac",
      homepage: "https://midnightmarket.example.com",
      hls: true,
      lastCheckOk: true,
      lastCheckOkTime: null,
      lastCheckTime: null,
      lastLocalCheckTime: null,
      sslError: false,
      votes: 0,
      clickCount: 0,
      clickTrend: 0,
      highlight: "Gnawa rhythms weaving through the echo of lantern-lit souks.",
    },
    {
      uuid: "desert-night-2",
      name: "Cairo Rooftop Breeze",
      url: "https://streams.radio-passport.com/cairo",
      streamUrl: "https://streams.radio-passport.com/cairo",
      favicon: "/radio-passport-icon.png",
      country: "Egypt",
      countryCode: "EG",
      state: null,
      language: "Arabic",
      languageCodes: ["ar"],
      tags: "lounge,oriental",
      tagList: ["lounge", "oriental"],
      bitrate: 128,
      codec: "mp3",
      homepage: "https://cairorooftop.example.com",
      hls: false,
      lastCheckOk: true,
      lastCheckOkTime: null,
      lastCheckTime: null,
      lastLocalCheckTime: null,
      sslError: false,
      votes: 0,
      clickCount: 0,
      clickTrend: 0,
      highlight: "Midnight oud sessions drifting over warm city air.",
    },
    {
      uuid: "desert-night-3",
      name: "Doha Mirage Lounge",
      url: "https://streams.radio-passport.com/doha",
      streamUrl: "https://streams.radio-passport.com/doha",
      favicon: "/radio-passport-icon.png",
      country: "Qatar",
      countryCode: "QA",
      state: null,
      language: "Arabic",
      languageCodes: ["ar"],
      tags: "chillout,night",
      tagList: ["chillout", "night"],
      bitrate: 192,
      codec: "mp3",
      homepage: "https://dohamirage.example.com",
      hls: false,
      lastCheckOk: true,
      lastCheckOkTime: null,
      lastCheckTime: null,
      lastLocalCheckTime: null,
      sslError: false,
      votes: 0,
      clickCount: 0,
      clickTrend: 0,
      highlight: "Desert breeze lounge with low-slung bass and oud flourishes.",
    },
    {
      uuid: "desert-night-4",
      name: "Riyadh Night Caravan",
      url: "https://streams.radio-passport.com/riyadh",
      streamUrl: "https://streams.radio-passport.com/riyadh",
      favicon: "/radio-passport-icon.png",
      country: "Saudi Arabia",
      countryCode: "SA",
      state: null,
      language: "Arabic",
      languageCodes: ["ar"],
      tags: "electronic,desert",
      tagList: ["electronic", "desert"],
      bitrate: 160,
      codec: "aac",
      homepage: "https://nightcaravan.example.com",
      hls: true,
      lastCheckOk: true,
      lastCheckOkTime: null,
      lastCheckTime: null,
      lastLocalCheckTime: null,
      sslError: false,
      votes: 0,
      clickCount: 0,
      clickTrend: 0,
      highlight: "Desert electronica with distant caravan percussion.",
    },
  ],
  "harbor-dawn": [
    {
      uuid: "harbor-dawn-1",
      name: "Lisbon Harbor Daybreak",
      url: "https://streams.radio-passport.com/lisbon",
      streamUrl: "https://streams.radio-passport.com/lisbon",
      favicon: "/radio-passport-icon.png",
      country: "Portugal",
      countryCode: "PT",
      state: null,
      language: "Portuguese",
      languageCodes: ["pt"],
      tags: "bossa nova,sunrise",
      tagList: ["bossa nova", "sunrise"],
      bitrate: 160,
      codec: "aac",
      homepage: "https://harbordaybreak.example.com",
      hls: true,
      lastCheckOk: true,
      lastCheckOkTime: null,
      lastCheckTime: null,
      lastLocalCheckTime: null,
      sslError: false,
      votes: 0,
      clickCount: 0,
      clickTrend: 0,
      highlight: "Sun-warmed bossa nova echoing from Alfama balconies.",
    },
    {
      uuid: "harbor-dawn-2",
      name: "Cape Town Morning Currents",
      url: "https://streams.radio-passport.com/capetown",
      streamUrl: "https://streams.radio-passport.com/capetown",
      favicon: "/radio-passport-icon.png",
      country: "South Africa",
      countryCode: "ZA",
      state: null,
      language: "English",
      languageCodes: ["en"],
      tags: "afro-jazz,sunrise",
      tagList: ["afro-jazz", "sunrise"],
      bitrate: 192,
      codec: "mp3",
      homepage: "https://morningcurrents.example.com",
      hls: false,
      lastCheckOk: true,
      lastCheckOkTime: null,
      lastCheckTime: null,
      lastLocalCheckTime: null,
      sslError: false,
      votes: 0,
      clickCount: 0,
      clickTrend: 0,
      highlight: "Afro-jazz sunrise sets with gulls and harbor bells.",
    },
    {
      uuid: "harbor-dawn-3",
      name: "Hong Kong Harbor Haze",
      url: "https://streams.radio-passport.com/hongkong",
      streamUrl: "https://streams.radio-passport.com/hongkong",
      favicon: "/radio-passport-icon.png",
      country: "Hong Kong",
      countryCode: "HK",
      state: null,
      language: "Cantonese",
      languageCodes: ["yue"],
      tags: "city pop,morning",
      tagList: ["city pop", "morning"],
      bitrate: 160,
      codec: "aac",
      homepage: "https://harborhaze.example.com",
      hls: true,
      lastCheckOk: true,
      lastCheckOkTime: null,
      lastCheckTime: null,
      lastLocalCheckTime: null,
      sslError: false,
      votes: 0,
      clickCount: 0,
      clickTrend: 0,
      highlight: "Soft city pop with ferry horn interludes at dawn.",
    },
    {
      uuid: "harbor-dawn-4",
      name: "Seattle Mist Radio",
      url: "https://streams.radio-passport.com/seattle",
      streamUrl: "https://streams.radio-passport.com/seattle",
      favicon: "/radio-passport-icon.png",
      country: "United States",
      countryCode: "US",
      state: "Washington",
      language: "English",
      languageCodes: ["en"],
      tags: "indie,coffeehouse",
      tagList: ["indie", "coffeehouse"],
      bitrate: 192,
      codec: "mp3",
      homepage: "https://seattlemist.example.com",
      hls: false,
      lastCheckOk: true,
      lastCheckOkTime: null,
      lastCheckTime: null,
      lastLocalCheckTime: null,
      sslError: false,
      votes: 0,
      clickCount: 0,
      clickTrend: 0,
      highlight: "Coffeehouse indie with rain-soaked vinyl textures.",
    },
  ],
};

type MockSceneDefinition = {
  id: string;
  slug: string;
  label: string;
  mood: string;
  summary: string;
  narrative: string;
  keywords: string[];
  visual: string;
  animation?: string;
  playback: {
    strategy: string;
    crossfadeSeconds: number;
  };
  stations: Station[];
  reason: string;
};

type RecommendRequest = {
  prompt?: string | null;
  mood?: string | null;
  visual?: string | null;
  scene?: string | null;
  sceneId?: string | null;
  country?: string | null;
  language?: string | null;
  preferredCountries?: string[];
  preferredLanguages?: string[];
  preferredTags?: string[];
  favoriteStationIds?: string[];
  recentStationIds?: string[];
  dislikedStationIds?: string[];
  currentStationId?: string | null;
};

type AiRecommendationResponse = {
  descriptor: SceneDescriptor;
};

const DESCRIPTORS: MockSceneDefinition[] = [
  {
    id: "descriptor-aurora-trails",
    slug: "aurora-trails",
    label: "Aurora Trails",
    mood: "Luminous & Serene",
    summary: "Arctic calm washed in shimmering synths and radio snow.",
    narrative:
      "Follow the aurora from Reykjavik to Helsinki with stations that glow like polar dawn, blending ambient pads, jazz, and midnight field recordings.",
    keywords: [
      "aurora",
      "arctic",
      "nordic",
      "ambient",
      "iceland",
      "snow",
      "jazz",
    ],
    visual: "3d_globe",
    animation: "slow-orbit",
    playback: {
      strategy: "autoplay-first",
      crossfadeSeconds: 12,
    },
    stations: BASE_STATIONS["aurora-trails"]!,
    reason: "Polar ambient, Nordic jazz, and hi-bitrate aurora stations",
  },
  {
    id: "descriptor-desert-nocturne",
    slug: "desert-nocturne",
    label: "Desert Nocturne",
    mood: "Velvet Twilight",
    summary: "Warm desert winds with hypnotic midnight grooves.",
    narrative:
      "Glide between Marrakesh rooftops and Doha lounges as oud, electronic pulses, and lantern-lit percussion guide you through the hush of desert midnight.",
    keywords: ["desert", "midnight", "oud", "north africa", "gulf", "twilight"],
    visual: "card_stack",
    animation: "slow-pan",
    playback: {
      strategy: "respect-current",
      crossfadeSeconds: 8,
    },
    stations: BASE_STATIONS["desert-nocturne"]!,
    reason: "Desert nocturne moods with oud, downtempo, and Gulf lounge cuts",
  },
  {
    id: "descriptor-harbor-dawn",
    slug: "harbor-dawn",
    label: "Harbor Dawn",
    mood: "Optimistic & Breezy",
    summary: "Coastal mornings steeped in jazz, city pop, and salt air.",
    narrative:
      "From Lisbon's tiled hills to Hong Kong's ferries, greet the sunrise with breezy rhythms, gulls in the distance, and coffeehouse warmth.",
    keywords: ["harbor", "sunrise", "bossa", "city pop", "coastal"],
    visual: "3d_globe",
    animation: "sunrise-spin",
    playback: {
      strategy: "autoplay-first",
      crossfadeSeconds: 6,
    },
    stations: BASE_STATIONS["harbor-dawn"]!,
    reason: "Sunrise jazz, coastal city pop, and warm atlantic breezes",
  },
];

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStringList(value: unknown): string[] {
  const collected: string[] = [];

  function collect(entry: unknown) {
    if (entry == null) return;
    if (Array.isArray(entry)) {
      entry.forEach(collect);
      return;
    }

    const parts = String(entry)
      .split(",")
      .map((part) => part.trim())
      .filter((part): part is string => part.length > 0);

    collected.push(...parts);
  }

  collect(value);
  return Array.from(new Set(collected));
}

function buildPreferredList(
  primary: string | null,
  secondary: string | null,
  extras: string[] | undefined
): string[] {
  return Array.from(
    new Set(
      [primary, secondary, ...(extras ?? [])]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );
}

function mapPlaybackStrategy(value: string): PlaybackStrategy {
  switch (value) {
    case "autoplay-first":
      return "autoplay_first";
    case "queue-only":
      return "queue_only";
    case "preview-on-hover":
      return "preview_on_hover";
    case "respect-current":
      return "queue_only";
    default:
      return "autoplay_first";
  }
}

function toSceneDescriptor(definition: MockSceneDefinition): SceneDescriptor {
  const strategy = mapPlaybackStrategy(definition.playback.strategy);
  const crossfadeMs = Math.max(
    0,
    Math.round(definition.playback.crossfadeSeconds * 1000)
  );

  return {
    visual: definition.visual,
    mood: definition.mood,
    animation: definition.animation,
    play: {
      strategy,
      ...(crossfadeMs > 0 ? { crossfadeMs } : {}),
    },
    stations: definition.stations.map((station) => ({ ...station })),
    reason: definition.reason || definition.summary,
  };
}

function selectMockScene(request: RecommendRequest): MockSceneDefinition {
  const normalizedScene = request.scene?.toLowerCase().trim() ?? null;
  if (normalizedScene) {
    const match = DESCRIPTORS.find(
      (descriptor) =>
        descriptor.slug === normalizedScene ||
        descriptor.visual === normalizedScene
    );
    if (match) {
      return match;
    }
  }

  const normalizedVisual = request.visual?.toLowerCase().trim() ?? null;
  if (normalizedVisual) {
    const match = DESCRIPTORS.find(
      (descriptor) => descriptor.visual === normalizedVisual
    );
    if (match) {
      return match;
    }
  }

  const prompt = `${request.prompt ?? ""} ${request.mood ?? ""}`.toLowerCase();
  if (prompt.trim().length > 0) {
    const scored = DESCRIPTORS.map((descriptor) => {
      const score = descriptor.keywords.reduce((acc, keyword) => {
        return prompt.includes(keyword.toLowerCase()) ? acc + 1 : acc;
      }, 0);
      return { descriptor, score } as const;
    }).sort((a, b) => b.score - a.score);

    if (scored[0] && scored[0].score > 0) {
      return scored[0].descriptor;
    }
  }

  return (
    DESCRIPTORS[Math.floor(Math.random() * DESCRIPTORS.length)] ??
    DESCRIPTORS[0]!
  );
}

const INTENT_MIN_MATCHES = 4;
const INTENT_SUPPLEMENT_LIMIT = 60;
const RELATED_LANGUAGES: Record<string, string[]> = {
  malayalam: ["tamil", "telugu", "kannada"],
  tamil: ["malayalam", "telugu", "kannada"],
  telugu: ["tamil", "malayalam", "kannada"],
  kannada: ["tamil", "malayalam", "telugu"],
  hindi: ["marathi", "punjabi", "gujarati"],
};

async function resolveDescriptor(
  request: RecommendRequest
): Promise<SceneDescriptor> {
  const fallbackDescriptor = () => toSceneDescriptor(selectMockScene(request));
  if (USE_MOCK) {
    return fallbackDescriptor();
  }

  const provider = getProvider();
  const prompt =
    request.prompt ??
    request.mood ??
    request.scene ??
    request.visual ??
    "Curate a transportive radio journey with mood, animation, and stations.";
  try {
    const descriptor = await provider.getSceneDescriptor(prompt, {
      intent: buildProviderIntent(request),
    });

    return {
      ...descriptor,
      play: descriptor.play ?? { strategy: "autoplay_first" },
    };
  } catch (error) {
    console.error("AI provider failed, falling back to mock descriptor", error);
    return fallbackDescriptor();
  }
}

function buildProviderIntent(request: RecommendRequest) {
  return {
    preferredCountries: buildPreferredList(
      request.country ?? null,
      null,
      request.preferredCountries
    ),
    preferredLanguages: buildPreferredList(
      request.language ?? null,
      null,
      request.preferredLanguages
    ),
    preferredTags: normalizeStringList(request.preferredTags ?? []),
    favoriteStationIds: request.favoriteStationIds ?? [],
    recentStationIds: request.recentStationIds ?? [],
  };
}

function buildRankingIntent(request: RecommendRequest): IntentMeta {
  return {
    prompt: request.prompt ?? null,
    mood: request.mood ?? null,
    preferredCountries: buildPreferredList(
      request.country ?? null,
      null,
      request.preferredCountries
    ),
    preferredLanguages: buildPreferredList(
      request.language ?? null,
      null,
      request.preferredLanguages
    ),
    favoriteStationIds: request.favoriteStationIds ?? [],
    recentStationIds: request.recentStationIds ?? [],
    dislikedStationIds: request.dislikedStationIds ?? [],
    currentStationId: request.currentStationId ?? null,
    preferredTags: normalizeStringList(request.preferredTags ?? []),
  };
}

function readSearchList(params: URLSearchParams, key: string): string[] {
  const values = params.getAll(key);
  if (values.length > 0) {
    return normalizeStringList(values);
  }
  return normalizeStringList(params.get(key));
}

function readFormList(formData: FormData, key: string): string[] {
  const values = formData.getAll(key);
  if (values.length === 0) return [];
  return normalizeStringList(values.map((value) => value?.toString() ?? ""));
}

function finalizeRequest(partial: Partial<RecommendRequest>): RecommendRequest {
  return {
    prompt: partial.prompt ?? null,
    mood: partial.mood ?? null,
    visual: partial.visual ?? null,
    scene: partial.scene ?? null,
    sceneId: partial.sceneId ?? null,
    country: partial.country ?? null,
    language: partial.language ?? null,
    preferredCountries: normalizeStringList(partial.preferredCountries ?? []),
    preferredLanguages: normalizeStringList(partial.preferredLanguages ?? []),
    preferredTags: normalizeStringList(partial.preferredTags ?? []),
    favoriteStationIds: normalizeStringList(partial.favoriteStationIds ?? []),
    recentStationIds: normalizeStringList(partial.recentStationIds ?? []),
    dislikedStationIds: normalizeStringList(partial.dislikedStationIds ?? []),
    currentStationId: partial.currentStationId ?? null,
  };
}

function enrichRequestWithIntent(request: RecommendRequest): RecommendRequest {
  if (!request.prompt) {
    return request;
  }

  const intent = extractPromptIntent(request.prompt);
  if (intent.confidence === "none" || intent.confidence === "low") {
    return request;
  }

  const preferredCountries = buildPreferredList(
    request.country ?? null,
    null,
    [...(request.preferredCountries ?? []), ...intent.countries]
  );

  const preferredLanguages = buildPreferredList(
    request.language ?? null,
    null,
    [...(request.preferredLanguages ?? []), ...intent.languages]
  );

  const country = request.country ?? intent.countries[0] ?? null;
  const language = request.language ?? intent.languages[0] ?? null;
  const preferredTags = normalizeStringList([
    ...(request.preferredTags ?? []),
    ...intent.tags,
  ]);

  return {
    ...request,
    country,
    language,
    preferredCountries,
    preferredLanguages,
    preferredTags,
  };
}

async function applyPostProcessing(
  descriptor: SceneDescriptor,
  request: RecommendRequest
): Promise<SceneDescriptor> {
  const intent = buildRankingIntent(request);
  const ranked = rankStations(descriptor.stations, buildRankingIntent(request));
  const intentAdjusted = await ensureIntentCoverage(ranked, intent);
  const withHealth = annotateHealth(intentAdjusted);

  console.info("descriptor-stations", {
    prompt: request.prompt,
    stations: withHealth.map((station) => ({
      uuid: station.uuid,
      name: station.name,
      country: station.country,
      language: station.language,
      tags: station.tagList?.slice(0, 5) ?? [],
    })),
  });

  return {
    ...descriptor,
    stations: withHealth,
  };
}

async function getRecommendation(
  request: RecommendRequest
): Promise<SceneDescriptor> {
  const descriptor = await resolveDescriptor(request);
  return applyPostProcessing(descriptor, request);
}

// Flow-audit F5: the AI gateway bounds only its own call, while intent coverage
// can chain many sequential RadioBrowser pool fetches with no ceiling. Race the
// whole pipeline against a route-level deadline so a recommendation always
// lands. Losing work is left to settle in the background — never aborted.
export const RECOMMEND_ROUTE_DEADLINE_MS = 15_000;

function withRouteDeadline(
  request: RecommendRequest
): Promise<SceneDescriptor> {
  let deadlineId: ReturnType<typeof setTimeout> | undefined;

  const deadline = new Promise<SceneDescriptor>((resolve) => {
    deadlineId = setTimeout(() => {
      console.warn(
        `recommend route missed its ${RECOMMEND_ROUTE_DEADLINE_MS}ms deadline; landing a fallback scene`
      );
      resolve(toSceneDescriptor(selectMockScene(request)));
    }, RECOMMEND_ROUTE_DEADLINE_MS);
  });

  const work = getRecommendation(request).finally(() => {
    if (deadlineId !== undefined) {
      clearTimeout(deadlineId);
    }
  });

  return Promise.race([work, deadline]);
}

function buildResponse(descriptor: SceneDescriptor) {
  const payload: AiRecommendationResponse = { descriptor };
  return json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function hasIntentSignals(intent: IntentMeta): boolean {
  return Boolean(
    (intent.preferredCountries?.length ?? 0) ||
      (intent.preferredLanguages?.length ?? 0) ||
      (intent.preferredTags?.length ?? 0)
  );
}

function stationMatchesIntent(station: Station, intent: IntentMeta): boolean {
  const country = (station.country ?? "").toLowerCase();
  const languageValues = new Set<string>();
  if (station.language) {
    languageValues.add(station.language.toLowerCase());
  }
  if (station.languageCodes) {
    for (const code of station.languageCodes) {
      if (code) languageValues.add(code.toLowerCase());
      const canonical = LANGUAGE_CODE_TO_NAME[code.toLowerCase()];
      if (canonical) {
        languageValues.add(canonical);
      }
    }
  }

  const tags = new Set<string>();
  if (station.tagList) {
    for (const tag of station.tagList) {
      if (tag) tags.add(tag.toLowerCase());
    }
  }
  if (typeof station.tags === "string") {
    station.tags
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
      .forEach((tag) => tags.add(tag));
  }

  const matchesCountry = (intent.preferredCountries ?? []).some((value) =>
    country.includes(value.toLowerCase())
  );
  const matchesLanguage = (intent.preferredLanguages ?? []).some((value) => {
    const normalized = value.toLowerCase();
    return Array.from(languageValues).some((candidate) => {
      if (candidate === normalized) return true;
      if (candidate.length === 2 && LANGUAGE_CODE_TO_NAME[candidate] === normalized)
        return true;
      return normalized.startsWith(candidate) || candidate.startsWith(normalized);
    });
  });
  const matchesTag = (intent.preferredTags ?? []).some((value) =>
    tags.has(value.toLowerCase())
  );

  return matchesCountry || matchesLanguage || matchesTag;
}

function buildRelatedLanguageSet(intent: IntentMeta): Set<string> {
  const related = new Set<string>();
  for (const language of intent.preferredLanguages ?? []) {
    const normalized = language.toLowerCase();
    const siblings = RELATED_LANGUAGES[normalized];
    if (siblings) {
      siblings.forEach((sibling) => related.add(sibling));
    }
  }
  return related;
}

function stationMatchesRelated(
  station: Station,
  intent: IntentMeta,
  relatedLanguages: Set<string>
): boolean {
  if (relatedLanguages.size === 0) return false;
  const languageValues = new Set<string>();
  if (station.language) {
    languageValues.add(station.language.toLowerCase());
  }
  if (station.languageCodes) {
    for (const code of station.languageCodes) {
      if (code) {
        const normalized = code.toLowerCase();
        languageValues.add(normalized);
        const canonical = LANGUAGE_CODE_TO_NAME[normalized];
        if (canonical) languageValues.add(canonical);
      }
    }
  }

  for (const candidate of languageValues) {
    for (const related of relatedLanguages) {
      if (candidate === related) return true;
      if (candidate.startsWith(related) || related.startsWith(candidate)) {
        return true;
      }
    }
  }

  const country = (station.country ?? "").toLowerCase();
  const matchesCountry = (intent.preferredCountries ?? []).some((value) =>
    country.includes(value.toLowerCase())
  );
  return matchesCountry;
}

async function ensureIntentCoverage(
  stations: Station[],
  intent: IntentMeta
): Promise<Station[]> {
  if (!hasIntentSignals(intent) || stations.length === 0) {
    return stations;
  }

  const desiredMatches = Math.min(INTENT_MIN_MATCHES, stations.length);
  const currentMatches = stations.filter((station) =>
    stationMatchesIntent(station, intent)
  );

  console.info("intent-coverage", {
    prompt: intent.prompt,
    preferredCountries: intent.preferredCountries,
    preferredLanguages: intent.preferredLanguages,
    preferredTags: intent.preferredTags,
    currentMatches: currentMatches.length,
    desiredMatches,
    totalStations: stations.length,
  });

  if (currentMatches.length >= desiredMatches) {
    return stations;
  }

  const supplemental = await fetchIntentStations(intent, INTENT_SUPPLEMENT_LIMIT);
  if (supplemental.length === 0) {
    console.info("intent-coverage", {
      prompt: intent.prompt,
      supplementalFetched: 0,
    });
    return stations;
  }

  const existingIds = new Set(stations.map((station) => station.uuid));
  const merged = [...stations];
  for (const station of supplemental) {
    if (!station?.uuid || existingIds.has(station.uuid)) continue;
    merged.push(station);
    existingIds.add(station.uuid);
  }

  const reranked = rankStations(merged, intent);
  const relatedLanguages = shouldUseRelatedFallback(intent)
    ? buildRelatedLanguageSet(intent)
    : new Set<string>();
  const primaryMatches: Station[] = [];
  const relatedMatches: Station[] = [];
  const secondary: Station[] = [];
  const seenPinned = new Set<string>();
  for (const station of reranked) {
    if (stationMatchesIntent(station, intent)) {
      primaryMatches.push(station);
      seenPinned.add(station.uuid);
    } else if (
      relatedLanguages.size > 0 &&
      stationMatchesRelated(station, intent, relatedLanguages)
    ) {
      relatedMatches.push(station);
    } else {
      secondary.push(station);
    }
  }
  const pinned: Station[] = [];
  for (const station of primaryMatches) {
    if (pinned.length >= desiredMatches) break;
    pinned.push(station);
  }
  if (pinned.length < desiredMatches) {
    const needed = desiredMatches - pinned.length;
    pinned.push(...relatedMatches.slice(0, needed));
  }
  const remainder: Station[] = [];
  const used = new Set(pinned.map((station) => station.uuid));
  for (const station of [...primaryMatches.slice(pinned.length), ...relatedMatches, ...secondary]) {
    if (!station?.uuid || used.has(station.uuid)) continue;
    remainder.push(station);
    used.add(station.uuid);
    if (pinned.length + remainder.length >= stations.length) break;
  }
  const finalStations = [...pinned, ...remainder].slice(0, stations.length);

  console.info("intent-coverage", {
    prompt: intent.prompt,
    supplementalFetched: supplemental.length,
    mergedTotal: merged.length,
    pinnedCount: pinned.length,
  });
  return finalStations;
}

async function fetchIntentStations(
  intent: IntentMeta,
  limit: number
): Promise<Station[]> {
  const results: Station[] = [];
  const seen = new Set<string>();

  const pushStations = (list: Station[]) => {
    for (const station of list) {
      if (!station?.uuid || seen.has(station.uuid)) continue;
      seen.add(station.uuid);
      results.push(station);
      if (results.length >= limit) {
        return true;
      }
    }
    return false;
  };

  const fetchers: Array<() => Promise<boolean>> = [];

  for (const language of intent.preferredLanguages?.slice(0, 2) ?? []) {
    fetchers.push(async () => {
      const stations = await fetchStationPool(
        `/json/stations/bylanguage/${encodeURIComponent(language)}?limit=60&hidebroken=true&order=clickcount&reverse=true`
      );
      return pushStations(stations);
    });
  }

  for (const tag of intent.preferredTags?.slice(0, 3) ?? []) {
    fetchers.push(async () => {
      const stations = await fetchStationPool(
        `/json/stations/bytag/${encodeURIComponent(tag)}?limit=60&hidebroken=true&order=clickcount&reverse=true`
      );
      return pushStations(stations);
    });
  }

  for (const country of intent.preferredCountries?.slice(0, 2) ?? []) {
    fetchers.push(async () => {
      const stations = await fetchStationPool(
        `/json/stations/bycountry/${encodeURIComponent(country)}?limit=60&hidebroken=true&order=clickcount&reverse=true`
      );
      return pushStations(stations);
    });
  }

  for (const fetcher of fetchers) {
    try {
      const done = await fetcher();
      if (done) break;
    } catch (error) {
      console.warn("Failed to fetch intent supplement", error);
    }
  }

  return results;
}

async function fetchStationPool(path: string): Promise<Station[]> {
  const raw = await rbFetchJson<unknown>(path);
  const normalized = normalizeStations(Array.isArray(raw) ? raw : []);
  return filterStationCandidates(normalized, { minBitrate: 48 });
}

function shouldUseRelatedFallback(intent: IntentMeta): boolean {
  return (intent.preferredLanguages?.length ?? 0) === 1;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const descriptor = await withRouteDeadline(
    enrichRequestWithIntent(
      finalizeRequest({
        prompt: url.searchParams.get("prompt"),
        mood: url.searchParams.get("mood"),
        visual: url.searchParams.get("visual"),
        scene: url.searchParams.get("scene"),
        sceneId: url.searchParams.get("sceneId"),
      country: url.searchParams.get("country"),
      language: url.searchParams.get("language"),
      preferredCountries: readSearchList(url.searchParams, "preferredCountries"),
      preferredLanguages: readSearchList(url.searchParams, "preferredLanguages"),
      preferredTags: readSearchList(url.searchParams, "preferredTags"),
      favoriteStationIds: readSearchList(url.searchParams, "favoriteStationIds"),
      recentStationIds: readSearchList(url.searchParams, "recentStationIds"),
      dislikedStationIds: readSearchList(url.searchParams, "dislikedStationIds"),
        currentStationId: url.searchParams.get("currentStationId"),
      })
    )
  );

  return buildResponse(descriptor);
}

export async function action({ request }: ActionFunctionArgs) {
  let body: Partial<RecommendRequest> = {};
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const parsed = (await request.json()) as Partial<RecommendRequest>;
      body = parsed ?? {};
    } catch (error) {
      console.error("Failed to parse recommendation body", error);
      body = {};
    }
  } else if (contentType.includes("application/x-www-form-urlencoded")) {
    const formData = await request.formData();
    body = {
      prompt: formData.get("prompt")?.toString() ?? null,
      mood: formData.get("mood")?.toString() ?? null,
      visual: formData.get("visual")?.toString() ?? null,
      scene: formData.get("scene")?.toString() ?? null,
      sceneId: formData.get("sceneId")?.toString() ?? null,
      country: formData.get("country")?.toString() ?? null,
      language: formData.get("language")?.toString() ?? null,
      preferredCountries: readFormList(formData, "preferredCountries"),
      preferredLanguages: readFormList(formData, "preferredLanguages"),
      preferredTags: readFormList(formData, "preferredTags"),
      favoriteStationIds: readFormList(formData, "favoriteStationIds"),
      recentStationIds: readFormList(formData, "recentStationIds"),
      dislikedStationIds: readFormList(formData, "dislikedStationIds"),
      currentStationId: formData.get("currentStationId")?.toString() ?? null,
    };
  }

  const descriptor = await withRouteDeadline(enrichRequestWithIntent(finalizeRequest(body)));
  return buildResponse(descriptor);
}
