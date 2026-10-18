#!/usr/bin/env node
// Offline station labelling with TypeSafe Jev. Run ONCE, commit the JSON; the
// app never calls Jev for labels at request time.
//
//   TYPESAFE_API_KEY=... node scripts/label-stations.mjs --limit 200
//   node scripts/label-stations.mjs --limit 3 --dry-run     (no network)
//
// Flags: --limit N (default 500) --concurrency N (default 4) --dry-run
//        --out PATH (default app/data/stationLabels.json) --stats PATH
// Resumes: stations already in the output file are skipped. The key comes from
// the environment only and is never printed.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const vocab = JSON.parse(readFileSync(resolve(root, "app/data/stationLabelVocab.json"), "utf8"));

const JEV_URL = "https://api.typesafe.ai/v1/systemone";
const JEV_MODEL = "jev-latest";
const RB_MIRRORS = [
  "https://de1.api.radio-browser.info",
  "https://nl1.api.radio-browser.info",
  "https://at1.api.radio-browser.info",
  "https://all.api.radio-browser.info",
];
const LABEL_SLOTS = 3;

function parseArgs(argv) {
  const args = { limit: 500, concurrency: 4, dryRun: false, out: "app/data/stationLabels.json", stats: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--limit") args.limit = Number(argv[++i]);
    else if (a === "--concurrency") args.concurrency = Number(argv[++i]);
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--stats") args.stats = argv[++i];
    else throw new Error(`unknown flag ${a}`);
  }
  if (!Number.isInteger(args.limit) || args.limit < 1) throw new Error("--limit must be a positive integer");
  if (!Number.isInteger(args.concurrency) || args.concurrency < 1) throw new Error("--concurrency must be a positive integer");
  return args;
}

export function homepageDomain(url) {
  if (!url) return null;
  try {
    return new URL(/^https?:/i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

export function stationState(raw) {
  return {
    name: String(raw.name ?? "").trim(),
    tags: String(raw.tags ?? "").trim() || null,
    language: String(raw.language ?? "").trim() || null,
    country: String(raw.country ?? "").trim() || null,
    homepage_domain: homepageDomain(raw.homepage),
  };
}

const STATE_NOTE =
  "A radio station as it describes itself in a public directory: its name, the free-text tags its listeners and owners typed (messy, any language), its language, country and website domain. Judge only how the station presents itself, not what is on air right now.";

export function buildRequestBody(raw) {
  const labelOptions = Object.fromEntries(
    vocab.labels.map((l) => [l, l === "none" ? "No further label fits the station's own name and tags" : null]),
  );
  const labelQuestion = (n) => ({
    type: "choice",
    instructions:
      `Using the station's name and tags (translate them if needed), pick the readable label that best describes ` +
      (n === 1
        ? "this station. This is the most defining label."
        : `this station as its number ${n} most defining label, after the obvious first one. Pick none if fewer than ${n} labels truly fit.`) +
      " Only use what the station says about itself; do not guess beyond it.",
    criteria: labelOptions,
  });
  const questions = {
    format: {
      type: "choice",
      instructions:
        "Judging by how the station presents itself (name and tags), what kind of station is it? A station is mostly_music only if the name or tags indicate music; news, talk, sport or radio-show words mean mostly_talk_or_news.",
      criteria: vocab.formats,
    },
    family: {
      type: "choice",
      instructions:
        "Which one music family best matches what this station presents itself as playing? Use none if it is a talk station or nothing about music is stated.",
      criteria: vocab.families,
    },
  };
  for (let n = 1; n <= LABEL_SLOTS; n++) questions[`label${n}`] = labelQuestion(n);
  return { model: JEV_MODEL, state: { note: STATE_NOTE, station: stationState(raw) }, questions };
}

async function fetchPool(limit) {
  const path = `/json/stations/search?limit=${limit}&hidebroken=true&order=clickcount&reverse=true&has_geo_info=true`;
  let lastError = "no mirror tried";
  for (const base of RB_MIRRORS) {
    try {
      const res = await fetch(base + path, { headers: { "User-Agent": "radio-passport/1.0 (offline labelling)" }, signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const list = await res.json();
      if (Array.isArray(list) && list.length) return list;
      throw new Error("empty list");
    } catch (e) {
      lastError = `${base}: ${e instanceof Error ? e.message : e}`;
    }
  }
  throw new Error(`Radio Browser unreachable (${lastError})`);
}

function pickAnswer(a) {
  if (!a || typeof a.choice !== "string") return null;
  return {
    choice: a.choice,
    confidence: typeof a.confidence === "number" ? a.confidence : null,
    probabilities: a.probabilities ?? null,
  };
}

async function callJev(body, apiKey) {
  const started = Date.now();
  let res;
  try {
    res = await fetch(JEV_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    // Network level (DNS, reset, timeout): worth retrying. Message omitted on purpose.
    throw Object.assign(new Error("jev network error"), { network: true });
  }
  const latencyMs = Date.now() - started;
  // Status only: never echo the body or headers.
  if (!res.ok) throw Object.assign(new Error(`jev ${res.status}`), { status: res.status });
  return { payload: await res.json(), latencyMs };
}

async function callWithRetry(body, apiKey) {
  let attempt = 0;
  for (;;) {
    try {
      return await callJev(body, apiKey);
    } catch (e) {
      const status = e.status;
      const retryable = e.network === true || status === 429 || (typeof status === "number" && status >= 500);
      if (!retryable || attempt >= 3) throw e;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt++));
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outPath = resolve(root, args.out);
  const apiKey = (process.env.TYPESAFE_API_KEY ?? "").trim();

  if (args.dryRun) {
    // No network at all: a fixed sample station stands in for the pool.
    const sample = { stationuuid: "dry-run", name: "Radio Balera 80", tags: "anni 80,balera,italiana", language: "italian", country: "Italy", homepage: "https://www.example.it/radio" };
    console.log(JSON.stringify({ POST: JEV_URL, note: "dry run, sample station, no network", body: buildRequestBody(sample) }, null, 2));
    return;
  }
  if (!apiKey) throw new Error("TYPESAFE_API_KEY is not set in the environment");

  const existing = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf8")) : null;
  const file = existing && existing.stations ? existing : { generatedAt: null, model: null, vocabulary: vocab.labels, stations: {} };
  const pool = (await fetchPool(args.limit)).slice(0, args.limit);
  const todo = pool.filter((s) => s.stationuuid && s.name && !file.stations[s.stationuuid]);
  console.error(`pool ${pool.length}, already labelled ${pool.length - todo.length}, to do ${todo.length}`);

  const stats = { requests: 0, failures: [], latencies: [], usage: [] };
  let next = 0;
  const save = () => {
    file.generatedAt = new Date().toISOString();
    writeFileSync(outPath, JSON.stringify(file, null, 1) + "\n");
  };
  const worker = async () => {
    while (next < todo.length) {
      const raw = todo[next++];
      stats.requests++;
      try {
        const { payload, latencyMs } = await callWithRetry(buildRequestBody(raw), apiKey);
        stats.latencies.push(latencyMs);
        if (payload.usage) stats.usage.push(payload.usage);
        if (payload.model) file.model = payload.model;
        const answers = payload.answers ?? {};
        const entry = { name: raw.name, tags: raw.tags || null, country: raw.country || null };
        for (const q of ["format", "family", "label1", "label2", "label3"]) entry[q] = pickAnswer(answers[q]);
        if (!entry.format || !entry.family) throw new Error("missing answers");
        file.stations[raw.stationuuid] = entry;
      } catch (e) {
        stats.failures.push({ uuid: raw.stationuuid, error: e instanceof Error ? e.message : String(e) });
      }
      if (stats.requests % 20 === 0) save();
    }
  };
  await Promise.all(Array.from({ length: args.concurrency }, worker));
  save();

  const sorted = [...stats.latencies].sort((a, b) => a - b);
  const pct = (p) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? null;
  const summary = {
    requests: stats.requests,
    ok: stats.latencies.length,
    failures: stats.failures,
    latencyMs: { p50: pct(0.5), p95: pct(0.95), max: sorted[sorted.length - 1] ?? null },
    usage: stats.usage,
  };
  if (args.stats) writeFileSync(resolve(root, args.stats), JSON.stringify(summary, null, 1));
  console.error(JSON.stringify({ ...summary, usage: `${stats.usage.length} usage objects` }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
