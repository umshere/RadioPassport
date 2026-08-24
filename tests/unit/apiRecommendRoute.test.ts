import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/utils/radioBrowser", () => ({
  rbFetchJson: vi.fn(),
}));

vi.mock("~/utils/stations", () => ({
  normalizeStations: vi.fn(),
}));

import type { Station } from "~/types/radio";
import { RECOMMEND_ROUTE_DEADLINE_MS } from "~/api/ai/recommend";
import { rbFetchJson } from "~/utils/radioBrowser";
import { normalizeStations } from "~/utils/stations";

const originalEnv = { ...process.env };
const originalFetch = global.fetch;
const mockedRbFetchJson = vi.mocked(rbFetchJson);
const mockedNormalizeStations = vi.mocked(normalizeStations);

describe("POST /api/ai/recommend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(process.env, originalEnv);
    process.env.AI_PROVIDER = "gemini";
    process.env.USE_MOCK = "false";
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.GEMINI_MODEL = "non-existent-model";
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OLLAMA_URL;
    mockedRbFetchJson.mockReset();
    mockedNormalizeStations.mockReset();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("responds with AI curation after cascading Gemini fallbacks", async () => {
    const stations: Station[] = [
      {
        uuid: "station-route-1",
        name: "Route Station One",
        url: "https://example.com/station-route-1",
        streamUrl: "https://example.com/station-route-1/stream",
        favicon: "https://example.com/icon.png",
        country: "Portugal",
        countryCode: "PT",
        state: null,
        language: "Portuguese",
        tags: null,
        tagList: ["fado"],
        bitrate: 192,
        codec: "mp3",
        homepage: "https://example.com",
        hls: false,
        lastCheckOk: true,
        lastCheckOkTime: null,
        lastCheckTime: null,
        lastLocalCheckTime: null,
        sslError: false,
        clickCount: 100,
        clickTrend: 10,
        votes: 80,
        highlight: "Traditional Fado broadcasts",
        isStreamHealthy: true,
        healthStatus: "good",
        isLikelyUp: true,
        healthScore: 0.9,
      },
    ];

    mockedRbFetchJson.mockResolvedValue([]);
    mockedNormalizeStations.mockReturnValue(stations);

    const successPayload = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  visual: "atlas",
                  mood: "Late night Lisbon",
                  animation: null,
                  play: {
                    strategy: "queue_only",
                    crossfadeMs: 4000,
                  },
                  reason: "Fallback success",
                  selectedStationIds: ["station-route-1"],
                }),
              },
            ],
          },
        },
      ],
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
          ? input.toString()
          : input.url;
      if (!url.includes("generativelanguage.googleapis.com")) {
        throw new Error(`Unexpected fetch request: ${url}`);
      }

      if (url.includes("non-existent-model")) {
        return new Response(
          JSON.stringify({
            error: {
              code: 404,
              message: "model not found",
              status: "NOT_FOUND",
            },
          }),
          {
            status: 404,
            headers: { "content-type": "application/json" },
          }
        );
      }

      if (url.includes("/v1beta/models/gemini-2.0-flash")) {
        return new Response(
          JSON.stringify({
            error: {
              code: 404,
              message:
                "models/gemini-2.0-flash is not found for API version v1beta",
              status: "NOT_FOUND",
            },
          }),
          {
            status: 404,
            headers: { "content-type": "application/json" },
          }
        );
      }

      if (url.includes("/v1/models/gemini-2.0-flash")) {
        return new Response(JSON.stringify(successPayload), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }

      return new Response(JSON.stringify(successPayload), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });

    global.fetch = fetchMock as unknown as typeof fetch;

    vi.resetModules();
    const { action } = await import("~/routes/api.ai.recommend");
    const { resetProviderCache } = await import("~/services/ai/providers");
    resetProviderCache();

    const request = new Request("http://localhost/api/ai/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "play Fado classics from Lisbon",
        visual: "atlas",
      }),
    });

    const response = await action({
      request,
      context: {},
      params: {},
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.descriptor.visual).toBe("atlas");
    expect(payload.descriptor.stations[0]?.uuid).toBe("station-route-1");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]?.toString()).toContain(
      "/v1beta/models/non-existent-model"
    );
    expect(fetchMock.mock.calls[1]?.[0]?.toString()).toContain(
      "/v1beta/models/gemini-2.5-flash"
    );
  });
});

describe("/api/ai/recommend route deadline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(process.env, originalEnv);
    process.env.USE_MOCK = "true";
    mockedRbFetchJson.mockReset();
    mockedNormalizeStations.mockReset();
    mockedNormalizeStations.mockImplementation(() => []);
  });

  afterEach(() => {
    vi.useRealTimers();
    global.fetch = originalFetch;
  });

  async function importRoute() {
    vi.resetModules();
    const { action } = await import("~/routes/api.ai.recommend");
    return action;
  }

  function buildRequest(body: Record<string, unknown>): Request {
    return new Request("http://localhost/api/ai/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("answers from the pipeline itself when work beats the deadline", async () => {
    mockedRbFetchJson.mockResolvedValue([]);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const action = await importRoute();
    const response = await action({
      request: buildRequest({ prompt: "arctic ambient aurora night" }),
      context: {},
      params: {},
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.descriptor.stations.length).toBeGreaterThan(0);
    expect(payload.descriptor.play?.strategy).toBe("autoplay_first");
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("lands a usable scene within the deadline when station pools hang", async () => {
    // F5 production shape: intent-coverage supplements chain RadioBrowser pool
    // fetches with no ceiling. The descriptor resolves fast, rbFetchJson never
    // does, so only the route deadline can still answer.
    mockedRbFetchJson.mockImplementation(() => new Promise<never>(() => {}));
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const action = await importRoute();

    vi.useFakeTimers();
    const pending = action({
      request: buildRequest({
        prompt: "arctic ambient aurora night",
        language: "tamil",
      }),
      context: {},
      params: {},
    }) as Promise<Response>;
    await vi.advanceTimersByTimeAsync(RECOMMEND_ROUTE_DEADLINE_MS + 1_000);
    const response = await pending;

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.descriptor.stations.length).toBeGreaterThan(0);
    expect(payload.descriptor.play?.strategy).toBe("autoplay_first");
    expect(
      payload.descriptor.stations.map((station: Station) => station.uuid)
    ).toContain("aurora-horizon-1");
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });
});
