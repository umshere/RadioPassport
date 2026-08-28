import type { TriviaGraph } from "~/types/trivia";

/**
 * Optional, default-off web evidence for sparse trivia graphs.
 *
 * Hard boundaries:
 * - Server-only module. The API key never crosses to the client, never lands
 *   in logs, and is read from env exactly here.
 * - Gated behind FIRECRAWL_TRIVIA=1 **and** a present FIRECRAWL_API_KEY.
 * - Budget per AI request: one search (≤ EVIDENCE_SEARCH_LIMIT candidates)
 *   plus at most EVIDENCE_SCRAPE_LIMIT scrapes from an exact-host allowlist
 *   over HTTPS, bounded characters per page and in total.
 * - Every failure resolves to an empty list. A missing or erroring Firecrawl
 *   account must degrade to the honest MusicBrainz-only room, never break it.
 */

export type WebEvidence = {
  title: string;
  url: string;
  excerpt: string;
};

const FIRECRAWL_API_BASE = "https://api.firecrawl.dev/v2";

export const EVIDENCE_SEARCH_LIMIT = 5;
export const EVIDENCE_SCRAPE_LIMIT = 2;
export const EVIDENCE_MAX_CHARS_PER_PAGE = 1800;
export const EVIDENCE_MAX_CHARS_TOTAL = 3600;

/** Per-request deadline enforced with Promise.race (never AbortController on
 * shared transports; abandoned promises simply settle into the void). */
export const EVIDENCE_DEADLINE_MS = 9000;

/** Verified MusicBrainz edges at or above this count mean the graph already
 * stands on its own and web evidence stays unspent. */
export const MIN_VERIFIED_EDGES_FOR_EVIDENCE = 3;

/** Deliberately small allowlist. Wikipedia/Wikidata cover the encyclopedia
 * layer; AllMusic and Discogs cover catalog music that has no article yet
 * (regional and new releases). Everything else stays untrusted — an exact
 * host match is required both at search time (includeDomains) and again on
 * every URL that comes back, so a poisoned result cannot slip through. */
const TRUSTED_EVIDENCE_HOSTS = new Set([
  "en.wikipedia.org",
  "www.wikidata.org",
  "www.allmusic.com",
  "www.discogs.com",
]);

const TRUSTED_EVIDENCE_DOMAINS = [...TRUSTED_EVIDENCE_HOSTS];

function flagEnabled(value: string | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" ||
    normalized === "on";
}

export function firecrawlTriviaEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return (
    flagEnabled(env.FIRECRAWL_TRIVIA) &&
    typeof env.FIRECRAWL_API_KEY === "string" &&
    env.FIRECRAWL_API_KEY.trim().length > 0
  );
}

export function verifiedEdgeCount(graph?: TriviaGraph | null): number {
  if (!graph || !Array.isArray(graph.edges)) return 0;
  return graph.edges.filter((edge) => edge?.verified === true).length;
}

export function shouldFetchWebEvidence(input: {
  enabled: boolean;
  graph?: TriviaGraph | null;
}): boolean {
  if (!input.enabled) return false;
  return verifiedEdgeCount(input.graph) < MIN_VERIFIED_EDGES_FOR_EVIDENCE;
}

export function isTrustedEvidenceUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  // Userinfo tricks like https://en.wikipedia.org@evil.test must fail closed.
  if (parsed.username || parsed.password) return false;
  return TRUSTED_EVIDENCE_HOSTS.has(parsed.hostname.toLowerCase());
}

/** Stable identity for one retrieved page: lowercase host, no trailing slash,
 * no fragment. Query strings are kept — they can pick a section. */
export function canonicalEvidenceUrl(value: unknown): string | null {
  if (!isTrustedEvidenceUrl(value)) return null;
  try {
    const parsed = new URL(value);
    parsed.hash = "";
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, "");
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

type RawCandidate = { url: string; title: string };

function collectCandidates(value: unknown): RawCandidate[] {
  const candidates: RawCandidate[] = [];
  const visit = (entry: unknown) => {
    if (!entry || typeof entry !== "object") return;
    if (Array.isArray(entry)) {
      entry.forEach(visit);
      return;
    }
    const record = entry as Record<string, unknown>;
    if (typeof record.url === "string") {
      candidates.push({
        url: record.url,
        title:
          typeof record.title === "string" && record.title.trim()
            ? record.title
            : "",
      });
      return;
    }
    // Live v2 responses group results by category: data.web[], data.news[]…
    Object.values(record).forEach(visit);
  };
  visit(value);
  return candidates;
}

/** Search payloads arrive either as a flat result array (older docs) or as an
 * object keyed by category (`data.web`, …) — both are accepted. */
export function selectScrapeTargets(
  payload: unknown,
  limit: number = EVIDENCE_SCRAPE_LIMIT,
): RawCandidate[] {
  if (!payload || typeof payload !== "object") return [];
  const data = (payload as Record<string, unknown>).data;
  const seen = new Set<string>();
  const targets: RawCandidate[] = [];
  for (const candidate of collectCandidates(data)) {
    if (targets.length >= Math.max(0, limit)) break;
    const canonical = canonicalEvidenceUrl(candidate.url);
    if (!canonical || seen.has(canonical)) continue;
    seen.add(canonical);
    targets.push({ url: canonical, title: candidate.title });
  }
  return targets;
}

function flattenMarkdown(markdown: string): string {
  const text = markdown
    // Drop images entirely, keep the label of links.
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text;
}

export function evidenceFromScrape(
  payload: unknown,
  fallbackTitle = "",
  fallbackUrl = "",
): WebEvidence | null {
  if (!payload || typeof payload !== "object") return null;
  const data = (payload as Record<string, unknown>).data;
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  if (typeof record.markdown !== "string") return null;
  const excerpt = flattenMarkdown(record.markdown).slice(
    0,
    EVIDENCE_MAX_CHARS_PER_PAGE,
  );
  if (!excerpt) return null;
  const metadata =
    record.metadata && typeof record.metadata === "object"
      ? (record.metadata as Record<string, unknown>)
      : {};
  const url =
    (typeof metadata.sourceURL === "string" && metadata.sourceURL) ||
    (typeof metadata.url === "string" && metadata.url) ||
    fallbackUrl;
  const title =
    (typeof metadata.title === "string" && metadata.title.trim()) ||
    (typeof metadata.ogTitle === "string" && metadata.ogTitle.trim()) ||
    fallbackTitle ||
    url;
  return { title, url, excerpt };
}

export function boundEvidence(pages: WebEvidence[]): WebEvidence[] {
  const bounded: WebEvidence[] = [];
  let total = 0;
  for (const page of pages) {
    if (total >= EVIDENCE_MAX_CHARS_TOTAL) break;
    const room = EVIDENCE_MAX_CHARS_TOTAL - total;
    if (page.excerpt.length <= room) {
      bounded.push(page);
      total += page.excerpt.length;
      continue;
    }
    bounded.push({ ...page, excerpt: page.excerpt.slice(0, room) });
    total = EVIDENCE_MAX_CHARS_TOTAL;
  }
  return bounded;
}

async function postJsonWithDeadline(
  path: string,
  body: Record<string, unknown>,
  apiKey: string,
  fetchImpl: typeof fetch,
  deadlineMs: number,
): Promise<unknown | null> {
  const request = (async () => {
    try {
      const response = await fetchImpl(`${FIRECRAWL_API_BASE}${path}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) return null;
      return (await response.json()) as unknown;
    } catch {
      return null;
    }
  })();
  const deadline = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), Math.max(0, deadlineMs));
  });
  return Promise.race([request, deadline]);
}

export async function fetchFirecrawlEvidence(input: {
  query: string;
  apiKey: string;
  fetchImpl?: typeof fetch;
  deadlineMs?: number;
}): Promise<WebEvidence[]> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const deadlineMs = input.deadlineMs ?? EVIDENCE_DEADLINE_MS;
  try {
    const searchPayload = await postJsonWithDeadline(
      "/search",
      {
        query: input.query,
        limit: EVIDENCE_SEARCH_LIMIT,
        // Filter at the source: off-allowlist pages never even come back.
        includeDomains: TRUSTED_EVIDENCE_DOMAINS,
      },
      input.apiKey,
      fetchImpl,
      deadlineMs,
    );
    if (!searchPayload) return [];
    const targets = selectScrapeTargets(searchPayload);
    if (!targets.length) return [];

    const scraped = await Promise.all(
      targets.map(async (target) => {
        const payload = await postJsonWithDeadline(
          "/scrape",
          { url: target.url, formats: ["markdown"] },
          input.apiKey,
          fetchImpl,
          deadlineMs,
        );
        return payload ? evidenceFromScrape(payload, target.title, target.url) : null;
      }),
    );
    const pages: WebEvidence[] = [];
    const seen = new Set<string>();
    for (const page of scraped) {
      if (!page?.excerpt) continue;
      const canonical = canonicalEvidenceUrl(page.url);
      if (canonical && seen.has(canonical)) continue;
      if (canonical) seen.add(canonical);
      pages.push(page);
    }
    return boundEvidence(pages);
  } catch {
    // Any surprise — network, parse, budget — degrades to "no evidence".
    return [];
  }
}
