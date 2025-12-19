import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("~/utils/radioBrowser", () => ({
  rbFetchJson: vi.fn(),
}));

vi.mock("~/utils/stations", () => ({
  normalizeStations: vi.fn(),
}));

import { GeminiProvider } from "~/services/ai/providers/GeminiProvider";
import { rbFetchJson } from "~/utils/radioBrowser";
import { normalizeStations } from "~/utils/stations";
import type { Station } from "~/types/radio";

const originalEnv = { ...process.env };
const mockedRbFetchJson = vi.mocked(rbFetchJson);
const mockedNormalizeStations = vi.mocked(normalizeStations);

describe("GeminiProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(process.env, originalEnv);
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.GEMINI_MODEL = "gemini-2.0-flash";
    mockedRbFetchJson.mockReset();
    mockedNormalizeStations.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to a supported model when the primary model is unavailable", async () => {
    const stations: Station[] = [
      {
        uuid: "station-one",
        name: "Station One",
        url: "https://example.com/station-one",
        streamUrl: "https://example.com/station-one/stream",
        favicon: "https://example.com/icon.png",
        country: "United States",
        countryCode: "US",
        state: null,
        language: "English",
        tags: null,
        tagList: ["jazz"],
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
        votes: 50,
        highlight: "Smooth jazz from NYC",
        isStreamHealthy: true,
        healthStatus: "good",
        isLikelyUp: true,
        healthScore: 0.9,
      },
    ];

    mockedRbFetchJson.mockResolvedValue([]);
    mockedNormalizeStations.mockReturnValue(stations);

    process.env.GEMINI_MODEL = "non-existent-model";

    const failureBody = JSON.stringify({
      error: {
        code: 404,
        message: "model not found",
        status: "NOT_FOUND",
      },
    });

    const successPayload = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  visual: "atlas",
                  mood: "Smooth Jazz",
                  animation: null,
                  play: {
                    strategy: "autoplay_first",
                    crossfadeMs: 4000,
                  },
                  reason: "High-bitrate jazz station",
                  selectedStationIds: ["station-one"],
                }),
              },
            ],
          },
        },
      ],
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => failureBody,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => successPayload,
        text: async () => JSON.stringify(successPayload),
      });

    const provider = new GeminiProvider(
      process.env.GEMINI_API_KEY!,
      fetchMock as unknown as typeof fetch
    );

    const descriptor = await provider.getSceneDescriptor(
      "smooth jazz from New York"
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain(
      "/v1beta/models/non-existent-model"
    );
    expect(fetchMock.mock.calls[1][0]).toContain(
      "/v1beta/models/gemini-2.5-flash-lite"
    );

    expect(descriptor.visual).toBe("atlas");
    expect(descriptor.mood).toBe("Smooth Jazz");
    expect(descriptor.stations.length).toBeGreaterThanOrEqual(1);
    expect(descriptor.stations[0]?.uuid).toBe("station-one");
  });

  it("tries alternate API versions for the same model before switching", async () => {
    const stations: Station[] = [
      {
        uuid: "station-version",
        name: "Station Version Test",
        url: "https://example.com/station-version",
        streamUrl: "https://example.com/station-version/stream",
        favicon: "https://example.com/icon.png",
        country: "Canada",
        countryCode: "CA",
        state: null,
        language: "English",
        tags: null,
        tagList: ["indie"],
        bitrate: 192,
        codec: "mp3",
        homepage: "https://example.com",
        hls: false,
        lastCheckOk: true,
        lastCheckOkTime: null,
        lastCheckTime: null,
        lastLocalCheckTime: null,
        sslError: false,
        clickCount: 80,
        clickTrend: 5,
        votes: 30,
        highlight: "Indie station",
        isStreamHealthy: true,
        healthStatus: "good",
        isLikelyUp: true,
        healthScore: 0.9,
      },
    ];

    mockedRbFetchJson.mockResolvedValue([]);
    mockedNormalizeStations.mockReturnValue(stations);

    const versionFailure = JSON.stringify({
      error: {
        code: 404,
        message:
          "models/gemini-2.0-flash is not found for API version v1beta, or is not supported for generateContent.",
        status: "NOT_FOUND",
      },
    });

    const successPayload = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  visual: "atlas",
                  mood: "Indie Night",
                  animation: null,
                  play: {
                    strategy: "queue_only",
                    crossfadeMs: 4000,
                  },
                  reason: "Version fallback worked",
                  selectedStationIds: ["station-version"],
                }),
              },
            ],
          },
        },
      ],
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => versionFailure,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => successPayload,
        text: async () => JSON.stringify(successPayload),
      });

    const provider = new GeminiProvider(
      process.env.GEMINI_API_KEY!,
      fetchMock as unknown as typeof fetch
    );

    const descriptor = await provider.getSceneDescriptor("indie night vibes");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain(
      "/v1beta/models/gemini-2.0-flash"
    );
    expect(fetchMock.mock.calls[1][0]).toContain("/v1/models/gemini-2.0-flash");

    const firstBody = JSON.parse(
      (fetchMock.mock.calls[0][1]?.body as string) ?? "{}"
    );
    const secondBody = JSON.parse(
      (fetchMock.mock.calls[1][1]?.body as string) ?? "{}"
    );

    // v1beta supports responseMimeType, v1 does not
    expect(firstBody.generationConfig.responseMimeType).toBe(
      "application/json"
    );
    expect(secondBody.generationConfig.responseMimeType).toBeUndefined();
    expect(descriptor.stations[0]?.uuid).toBe("station-version");
  });

  it("cascades through supported Gemini models when newer variants are unavailable", async () => {
    const stations: Station[] = [
      {
        uuid: "station-two",
        name: "Station Two",
        url: "https://example.com/station-two",
        streamUrl: "https://example.com/station-two/stream",
        favicon: "https://example.com/icon.png",
        country: "United States",
        countryCode: "US",
        state: null,
        language: "English",
        tags: null,
        tagList: ["ambient"],
        bitrate: 256,
        codec: "mp3",
        homepage: "https://example.com",
        hls: false,
        lastCheckOk: true,
        lastCheckOkTime: null,
        lastCheckTime: null,
        lastLocalCheckTime: null,
        sslError: false,
        clickCount: 120,
        clickTrend: 15,
        votes: 45,
        highlight: "Late night ambient textures",
        isStreamHealthy: true,
        healthStatus: "good",
        isLikelyUp: true,
        healthScore: 0.95,
      },
    ];

    mockedRbFetchJson.mockResolvedValue([]);
    mockedNormalizeStations.mockReturnValue(stations);

    delete process.env.GEMINI_MODEL;

    const failureBody = JSON.stringify({
      error: {
        code: 404,
        message: "model not found",
        status: "NOT_FOUND",
      },
    });

    const secondFailureBody = JSON.stringify({
      error: {
        code: 404,
        message: "model not found",
        status: "NOT_FOUND",
      },
    });

    const successPayload = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  visual: "card_stack",
                  mood: "Night Drift",
                  animation: "slow-orbit",
                  play: {
                    strategy: "autoplay_first",
                    crossfadeMs: 4000,
                  },
                  reason: "Ambient fallback selection",
                  selectedStationIds: ["station-two"],
                }),
              },
            ],
          },
        },
      ],
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => failureBody,
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => secondFailureBody,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => successPayload,
        text: async () => JSON.stringify(successPayload),
      });

    const provider = new GeminiProvider(
      process.env.GEMINI_API_KEY!,
      fetchMock as unknown as typeof fetch
    );

    const descriptor = await provider.getSceneDescriptor(
      "sparse ambient drones"
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0][0]).toContain(
      "/v1beta/models/gemini-2.5-flash-lite"
    );
    expect(fetchMock.mock.calls[1][0]).toContain(
      "/v1beta/models/gemini-2.5-flash"
    );
    expect(fetchMock.mock.calls[2][0]).toContain(
      "/v1beta/models/gemini-2.5-pro"
    );
    expect(descriptor.stations[0]?.uuid).toBe("station-two");
  });
});
