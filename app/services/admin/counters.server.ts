import { promises as fs } from "node:fs";
import path from "node:path";
import { USAGE_EVENTS, USAGE_PAGES, USAGE_SOURCES } from "~/utils/usage";

/**
 * Anonymous daily counters: event name (+ a source or page bucket) per UTC day.
 * No id, no IP, no text. Where they live:
 *  - Upstash Redis / Vercel KV over REST when KV_REST_API_URL + KV_REST_API_TOKEN
 *    (or UPSTASH_REDIS_REST_URL + _TOKEN) are set: one hash per day, 400-day expiry.
 *  - otherwise, on a dev machine only, a JSON file at .data/counters.json.
 *  - otherwise nothing (production without a store just logs, as before).
 */
export type DayCounts = Record<string, number>;

function store() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function counterStoreKind(): "redis" | "file" | "none" {
  if (store()) return "redis";
  return process.env.VERCEL ? "none" : "file";
}

const dayKey = (date = new Date()) => `ew:counts:${date.toISOString().slice(0, 10)}`;
const FILE = path.join(process.cwd(), ".data", "counters.json");

export function fieldFor(event: string, extra?: { source?: string; page?: string }): string | null {
  if (!(USAGE_EVENTS as readonly string[]).includes(event)) return null;
  if (extra?.page && (USAGE_PAGES as readonly string[]).includes(extra.page)) return `${event}:${extra.page}`;
  if (extra?.source && (USAGE_SOURCES as readonly string[]).includes(extra.source)) return `${event}:${extra.source}`;
  return event;
}

async function pipeline(commands: unknown[][]) {
  const s = store();
  if (!s) return null;
  const response = await fetch(`${s.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${s.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!response.ok) throw new Error(`counter store ${response.status}`);
  return (await response.json()) as Array<{ result?: unknown }>;
}

// The file store is read-modify-write, so writes go one at a time.
let queue: Promise<void> = Promise.resolve();

export async function bump(event: string, extra?: { source?: string; page?: string }) {
  const field = fieldFor(event, extra);
  if (!field) return;
  const run = queue.then(() => write(field));
  queue = run.catch(() => {});
  await run.catch(() => {});
}

async function write(field: string) {
  try {
    if (store()) {
      const key = dayKey();
      await pipeline([["HINCRBY", key, field, 1], ["EXPIRE", key, 60 * 60 * 24 * 400]]);
      return;
    }
    if (process.env.VERCEL) return;
    const all = await readFile();
    const key = dayKey();
    all[key] = all[key] ?? {};
    all[key][field] = (all[key][field] ?? 0) + 1;
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(all));
  } catch {
    // Counting never gets in the way.
  }
}

async function readFile(): Promise<Record<string, DayCounts>> {
  try {
    return JSON.parse(await fs.readFile(FILE, "utf8")) as Record<string, DayCounts>;
  } catch {
    return {};
  }
}

/** The last `days` UTC days, oldest first, each a field→count map. */
export async function readCounters(days = 14): Promise<Array<{ day: string; counts: DayCounts }>> {
  const list: string[] = [];
  for (let i = days - 1; i >= 0; i--) list.push(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10));
  if (store()) {
    const res = await pipeline(list.map((d) => ["HGETALL", `ew:counts:${d}`]));
    return list.map((day, i) => {
      const flat = (res?.[i]?.result as string[] | undefined) ?? [];
      const counts: DayCounts = {};
      for (let k = 0; k + 1 < flat.length; k += 2) counts[String(flat[k])] = Number(flat[k + 1]) || 0;
      return { day, counts };
    });
  }
  const all = await readFile();
  return list.map((day) => ({ day, counts: all[`ew:counts:${day}`] ?? {} }));
}
