import { describe, expect, it, vi, afterEach } from "vitest";
import {
  buildCandidates,
  confidenceFrom,
  interpretWithJev,
} from "~/services/ai/intent/jevInterpret.server";
import { interpretPrompt } from "~/api/ai/interpret";

const env = { TYPESAFE_API_KEY: "k" } as unknown as NodeJS.ProcessEnv;
const jev = (answers: unknown) =>
  (async () => new Response(JSON.stringify({ answers }), { status: 200 })) as unknown as typeof fetch;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("candidates", () => {
  it("come from the vocabulary, typo tolerant, capped", () => {
    const c = buildCandidates("japnese radio in Tokio at dusk");
    expect(c.languages).toContain("Japanese");
    const many = buildCandidates("india france spain japan brazil mexico nigeria germany");
    expect(many.countries.length).toBeLessThanOrEqual(6);
  });
  it("knows the misses from the live eval", () => {
    expect(buildCandidates("turkish evening").countries).toContain("Türkiye");
    expect(buildCandidates("Nigerian afrobeats").tags).toContain("afrobeats");
    expect(buildCandidates("urdu ghazals").tags).toContain("ghazal");
    expect(buildCandidates("I am feeling sad").tags).toContain("melancholy");
  });
  it("finds a city's country", () => {
    expect(buildCandidates("cairo at dusk").countries).toContain("Egypt");
  });
});

describe("interpretWithJev", () => {
  const prompt = "Malayalam radio somewhere it's evening";
  it("maps a successful read", async () => {
    const out = await interpretWithJev(prompt, {
      env,
      fetchImpl: jev({
        action: { choice: "search", confidence: 0.9 },
        hour: { choice: "Dusk", confidence: 0.9 },
        language: { choice: "Malayalam", confidence: 0.9 },
        country: { choice: "none" },
      }),
    });
    expect(out).toMatchObject({ language: "Malayalam", country: null, wantsMix: false, confidence: "high", hour: "Dusk", mood: null });
  });

  it("falls back (null) on timeout without aborting", async () => {
    const slow = (() => new Promise(() => {})) as unknown as typeof fetch;
    expect(await interpretWithJev(prompt, { env, fetchImpl: slow, timeoutMs: 20 })).toBeNull();
  });

  it("null on malformed answers, http errors and no key", async () => {
    expect(await interpretWithJev(prompt, { env, fetchImpl: jev({ action: { choice: "dance" } }) })).toBeNull();
    expect(await interpretWithJev(prompt, { env, fetchImpl: jev(undefined) })).toBeNull();
    const bad = (async () => new Response("x", { status: 500 })) as unknown as typeof fetch;
    expect(await interpretWithJev(prompt, { env, fetchImpl: bad })).toBeNull();
    expect(await interpretWithJev(prompt, { env: {} as NodeJS.ProcessEnv, fetchImpl: jev({}) })).toBeNull();
  });

  it("null on low overall confidence", async () => {
    expect(
      await interpretWithJev(prompt, { env, fetchImpl: jev({ action: { choice: "search", confidence: 0.1 } }) }),
    ).toBeNull();
  });

  it("none answers and invented values yield nulls", async () => {
    const out = await interpretWithJev("surprise me", {
      env,
      fetchImpl: jev({
        action: { choice: "mix_surprise", confidence: 0.8 },
        hour: { choice: "none" },
        country: { choice: "Atlantis", confidence: 0.99 },
        language: { choice: "none" },
        tag: { choice: "none" },
      }),
    });
    expect(out).toMatchObject({ wantsMix: true, country: null, language: null, tags: [], mood: null, hour: null });
  });

  it("maps confidence to named bands", () => {
    expect(confidenceFrom(0.9)).toBe("high");
    expect(confidenceFrom(0.5)).toBe("medium");
    expect(confidenceFrom(0.35)).toBe("low");
  });
});

describe("interpretPrompt with only TYPESAFE_API_KEY", () => {
  it("falls back to the extractor with fallback: true when Jev misses", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "k");
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response("no", { status: 500 })) as unknown as typeof fetch;
    try {
      const res = await interpretPrompt({ prompt: "tamil songs tonight" });
      expect(res.fallback).toBe(true);
      expect(res.intent.language).toBe("Tamil");
    } finally {
      globalThis.fetch = realFetch;
      vi.unstubAllEnvs();
    }
  });
  it("reports fallback: false when Jev answers", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "k");
    const realFetch = globalThis.fetch;
    globalThis.fetch = jev({ action: { choice: "mix_surprise", confidence: 0.9 } });
    try {
      const res = await interpretPrompt({ prompt: "surprise me" });
      expect(res.fallback).toBe(false);
      expect(res.intent.wantsMix).toBe(true);
    } finally {
      globalThis.fetch = realFetch;
      vi.unstubAllEnvs();
    }
  });
});
