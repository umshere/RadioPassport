/**
 * Extractor vs Jev on tests/fixtures/interpretEval.json.
 *   TYPESAFE_API_KEY=… npx vite-node --config vitest.config.ts scripts/eval-interpret.ts
 * Without a key it prints the extractor column only and says so; it never
 * fabricates Jev numbers. `--mock` runs Jev against a perfect-oracle stub
 * (wiring check only, not an accuracy measure).
 */
import { readFileSync } from "node:fs";
import { intentFromExtractor } from "~/api/ai/interpret";
import { interpretWithJev } from "~/services/ai/intent/jevInterpret.server";
import { solarHourFromPrompt } from "~/services/ai/intent/promptIntent";
import type { InterpretedIntent } from "~/types/ai";

type Case = {
  prompt: string;
  country: string | null;
  language: string | null;
  tag: string | string[] | null;
  hour: string | null;
  mix: boolean;
};
const cases: Case[] = JSON.parse(
  readFileSync(new URL("../tests/fixtures/interpretEval.json", import.meta.url), "utf8"),
);
const eq = (a: string | null | undefined, b: string | null) =>
  (a ?? null)?.toLowerCase() === b?.toLowerCase();
const FIELDS = ["country", "language", "tag", "hour", "mix"] as const;
type Field = (typeof FIELDS)[number];

function score(c: Case, i: InterpretedIntent, hourOf: string | null): Record<Field, boolean> {
  return {
    country: eq(i.country, c.country),
    language: eq(i.language, c.language),
    tag: Array.isArray(c.tag)
      ? c.tag.some((t) => eq(i.tags[0], t))
      : c.tag === null
        ? !i.tags[0]
        : !!i.tags[0] && i.tags[0].toLowerCase().includes(c.tag.toLowerCase()),
    hour: eq(hourOf, c.hour),
    mix: i.wantsMix === c.mix,
  };
}
const pct = (n: number, d: number) => `${((100 * n) / d).toFixed(0)}%`;
function pctile(xs: number[], p: number) {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0;
}

const key = process.env.TYPESAFE_API_KEY?.trim();
const mock = process.argv.includes("--mock");
const results = { extractor: [] as Record<Field, boolean>[], jev: [] as Record<Field, boolean>[] };
const latencies: number[] = [];
let jevMisses = 0;
const failures: string[] = [];

for (const c of cases) {
  results.extractor.push(score(c, intentFromExtractor(c.prompt), solarHourFromPrompt(c.prompt)));
  if (!key && !mock) continue;
  const fetchImpl = mock
    ? ((async (_u: unknown, init: { body: string }) => {
        const q = JSON.parse(init.body).questions;
        const pickIn = (name: string, want: string | string[] | null) =>
          q[name] && want && (Array.isArray(want) ? want[0] : want) && (Array.isArray(want) ? want[0] : want)! in q[name].criteria
            ? { choice: Array.isArray(want) ? want[0] : want, confidence: 0.9 }
            : { choice: "none", confidence: 0.9 };
        return new Response(
          JSON.stringify({
            answers: {
              action: { choice: c.mix ? "mix_surprise" : "search", confidence: 0.9 },
              hour: { choice: c.hour ?? "none", confidence: 0.9 },
              country: pickIn("country", c.country),
              language: pickIn("language", c.language),
              tag: pickIn("tag", c.tag),
            },
          }),
        );
      }) as unknown as typeof fetch)
    : undefined;
  const t0 = performance.now();
  const jev = await interpretWithJev(c.prompt, {
    env: { TYPESAFE_API_KEY: key ?? "mock" } as unknown as NodeJS.ProcessEnv,
    fetchImpl,
    timeoutMs: 10_000,
  });
  latencies.push(performance.now() - t0);
  if (!jev) {
    jevMisses++;
    results.jev.push(score(c, intentFromExtractor(c.prompt), solarHourFromPrompt(c.prompt)));
    continue;
  }
  // Jev's hour is not on InterpretedIntent; mood carries it when no tag was chosen.
  const hourOf = jev.mood && ["Dawn", "Midday", "Dusk", "Night"].includes(jev.mood)
    ? jev.mood
    : solarHourFromPrompt(c.prompt);
  const s = score(c, jev, hourOf);
  results.jev.push(s);
  const bad = FIELDS.filter((f) => !s[f]);
  if (bad.length) failures.push(`${c.prompt}  →  ${bad.join(",")}`);
}

function report(name: string, rows: Record<Field, boolean>[]) {
  if (!rows.length) return;
  const per = FIELDS.map((f) => `${f} ${pct(rows.filter((r) => r[f]).length, rows.length)}`);
  const all = rows.filter((r) => FIELDS.every((f) => r[f])).length;
  console.log(`${name.padEnd(10)} ${per.join("  ")}  | all-fields ${pct(all, rows.length)}`);
}
console.log(`${cases.length} prompts${mock ? " (MOCK oracle: wiring only)" : ""}`);
report("extractor", results.extractor);
if (key || mock) {
  report("jev", results.jev);
  console.log(
    `jev latency p50 ${pctile(latencies, 0.5).toFixed(0)}ms  p95 ${pctile(latencies, 0.95).toFixed(0)}ms  fallbacks ${jevMisses}/${cases.length}`,
  );
  if (failures.length) console.log("still failing:\n  " + failures.join("\n  "));
} else {
  console.log("TYPESAFE_API_KEY not set: Jev column skipped (use --mock for wiring only).");
}
