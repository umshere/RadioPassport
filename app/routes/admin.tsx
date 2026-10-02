import { execSync } from "node:child_process";
import { createHash, timingSafeEqual } from "node:crypto";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { ruleClassify } from "~/components/keeper/keeperIntent";
import { trimEnv } from "~/services/ai/completeFallback";
import { adminAttempts, counterStoreKind, readCounters } from "~/services/admin/counters.server";
import { classifyKeeperQuestion, jevDecide } from "~/services/keeper/jev.server";
import { isKeeperAskEnabled } from "~/services/keeper/flag.server";

/**
 * /admin: a private console. It answers 404 to everyone except
 *  - a developer machine (localhost, not a Vercel deploy), and
 *  - a browser that opened /admin?key=<ADMIN_KEY> once; that sets a 30-day
 *    httpOnly cookie scoped to /admin and redirects to a clean URL.
 * With no ADMIN_KEY set on the server, the live site answers 404 always.
 * It shows traffic, what is switched on, and lets you test the Keeper's
 * question routing (Jev vs the keyword rules) with a real key.
 */
export const handle = { admin: true };
export const meta = () => [{ title: "Admin · Elsewhere" }, { name: "robots", content: "noindex, nofollow" }];

const COOKIE = "ew_admin";
const digest = (value: string) => createHash("sha256").update(`ew-admin:${value}`).digest();

function sameSecret(a: string, b: string) {
  return timingSafeEqual(digest(a), digest(b));
}

function adminKey() {
  return trimEnv(process.env.ADMIN_KEY);
}

function isLocal(request: Request) {
  const host = new URL(request.url).hostname;
  const local = host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
  return local && !process.env.VERCEL;
}

function cookieValue(request: Request) {
  const match = (request.headers.get("cookie") ?? "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return match?.[1] ?? "";
}

function hasAccess(request: Request) {
  if (isLocal(request)) return true;
  const key = adminKey();
  return Boolean(key && sameSecret(cookieValue(request), digest(key).toString("hex")));
}

function assertAccess(request: Request) {
  if (!hasAccess(request)) throw new Response("Not Found", { status: 404 });
}

function unlockCookie(key: string) {
  return `${COOKIE}=${digest(key).toString("hex")}; Path=/admin; Max-Age=${60 * 60 * 24 * 30}; HttpOnly; Secure; SameSite=Strict`;
}

function callerId(request: Request) {
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
  return digest(`caller:${ip}`).toString("hex").slice(0, 24);
}

type Test = {
  at: string;
  question: string;
  ms: number;
  routed: { intent: string; source: string; confidence: number | null };
  rules: string;
  jev: { intent: string; confidence: number | null } | { error: string } | null;
};
const recent: Test[] = [];

function git(cmd: string) {
  try {
    return execSync(cmd, { cwd: process.cwd(), stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return "";
  }
}

export async function loader({ request }: LoaderFunctionArgs) {
  const given = new URL(request.url).searchParams.get("key");
  const key = adminKey();
  if (given !== null && key && sameSecret(given, key)) {
    return redirect("/admin", { headers: { "Set-Cookie": unlockCookie(key), "Cache-Control": "no-store" } });
  }
  // No access yet: ask for the code. The server has no code set → still a 404.
  if (!hasAccess(request)) {
    if (!key) throw new Response("Not Found", { status: 404 });
    return json({ locked: true as const }, { headers: { "Cache-Control": "no-store" } });
  }
  const asked = Number(new URL(request.url).searchParams.get("days"));
  const rangeDays = RANGES.some((r) => r.days === asked) ? asked : 30;
  const counters = await readCounters(rangeDays);
  const flag = (name: string) => Boolean(trimEnv(process.env[name]));
  return json({
    store: counterStoreKind(),
    rangeDays,
    counters,
    system: {
      commit: git("git rev-parse --short HEAD"),
      subject: git("git log -1 --pretty=%s"),
      node: process.version,
      keeperAsk: isKeeperAskEnabled(),
      jevKey: flag("TYPESAFE_API_KEY"),
      aiProvider: process.env.AI_PROVIDER ?? "(default)",
      providers: {
        heuristics: flag("HEURISTICS_API_KEY"),
        openai: flag("OPENAI_API_KEY"),
        gemini: flag("GEMINI_API_KEY"),
        openrouter: flag("OPENROUTER_API_KEY"),
      },
      redis: flag("KV_REST_API_URL") || flag("UPSTASH_REDIS_REST_URL"),
    },
    recent,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  if (form.get("intent") === "unlock") {
    const key = adminKey();
    if (!key) throw new Response("Not Found", { status: 404 });
    const attempts = await adminAttempts(callerId(request));
    if (attempts.blocked) return json({ gateError: "Too many tries. Wait an hour." }, { status: 429 });
    if (!sameSecret(String(form.get("code") ?? "").trim(), key)) {
      await attempts.fail();
      return json({ gateError: "Not that one." }, { status: 401 });
    }
    return redirect("/admin", { headers: { "Set-Cookie": unlockCookie(key), "Cache-Control": "no-store" } });
  }
  assertAccess(request);
  const question = String(form.get("question") ?? "").trim().slice(0, 200);
  if (!question) return json({ error: "Type a question first." });
  const started = performance.now();
  const routed = await classifyKeeperQuestion(question);
  const ms = Math.round(performance.now() - started);
  const apiKey = trimEnv(process.env.TYPESAFE_API_KEY);
  let jev: Test["jev"] = null;
  if (apiKey) {
    try {
      jev = await jevDecide(question, { apiKey });
    } catch (error) {
      jev = { error: error instanceof Error ? error.message : "failed" };
    }
  }
  recent.unshift({ at: new Date().toISOString(), question, ms, routed, rules: ruleClassify(question), jev });
  recent.length = Math.min(recent.length, 20);
  return json({ ok: true });
}

const RANGES = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 400, label: "Everything" },
];

/** The journey, in the order people live it. */
const STEPS: Array<{ field: string; label: string; plain: string }> = [
  { field: "visit", label: "Opened Elsewhere", plain: "Once per browser per day." },
  { field: "land", label: "Started a station", plain: "Each time a station was tuned and played." },
  { field: "stamp", label: "Earned a passport stamp", plain: "Stayed about a minute, so the Keeper stamped the city." },
  { field: "keeper_open", label: "Opened the Keeper", plain: "Tapped the clerk for his sheet." },
  { field: "keeper_ask", label: "Asked the Keeper something", plain: "Typed a question (home or desk)." },
  { field: "ticket_open", label: "Opened a ticket", plain: "Looked at the ticket for a station." },
  { field: "ticket_share", label: "Sent a ticket", plain: "Shared it through the phone or Mac share menu." },
  { field: "tune_join", label: "A friend arrived from a ticket or link", plain: "Opened a shared link and landed on the station." },
];

const OTHER_ACTIONS: Array<[string, string]> = [
  ["ticket_copy", "Copied a ticket or its link"],
  ["ticket_save", "Saved a ticket image"],
  ["desk_view", "Opened the desk page"],
  ["station_share", "Shared a station"],
];

const PAGE_NAMES: Record<string, string> = {
  home: "Home (the departures hall)",
  desk: "The desk (/listen)",
  about: "About",
  ticket: "A shared ticket page",
  other: "Anything else",
};

const sum = (days: Array<{ counts: Record<string, number> }>, field: string) =>
  days.reduce((total, d) => total + (d.counts[field] ?? 0), 0);

const flagOf = (code: string) =>
  String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));

function countryRows(days: Array<{ counts: Record<string, number> }>) {
  const totals = new Map<string, number>();
  for (const d of days) {
    for (const [field, n] of Object.entries(d.counts)) {
      if (field.startsWith("country:")) totals.set(field.slice(8), (totals.get(field.slice(8)) ?? 0) + n);
    }
  }
  let names: Intl.DisplayNames | null = null;
  try {
    names = new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    names = null;
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([code, n]) => ({ code, n, name: names?.of(code) ?? code }));
}

function Bar({ value, max, tone = "foil" }: { value: number; max: number; tone?: "foil" | "dust" }) {
  const width = max > 0 ? Math.max(value > 0 ? 2 : 0, Math.round((value / max) * 100)) : 0;
  return (
    <span className="adm-bar" data-tone={tone} aria-hidden="true">
      <i style={{ width: `${width}%` }} />
    </span>
  );
}

export default function Admin() {
  const data = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  if ("locked" in data) return <Gate error={result && "gateError" in result ? result.gateError : null} />;
  const days = data.counters;
  const s = data.system;
  const yes = (v: boolean) => (v ? "on" : "off");
  const visits = sum(days, "visit");
  const stepCounts = STEPS.map((step) => ({ ...step, n: sum(days, step.field) }));
  const top = Math.max(1, ...stepCounts.map((step) => step.n));
  const countries = countryRows(days);
  const countryTotal = countries.reduce((t, c) => t + c.n, 0);
  const maxDay = Math.max(1, ...days.map((d) => d.counts.visit ?? 0));
  const pages = Object.keys(PAGE_NAMES).map((k) => ({ k, n: sum(days, `pageview:${k}`) }));
  const maxPage = Math.max(1, ...pages.map((p) => p.n));
  const first = days.find((d) => Object.keys(d.counts).length > 0)?.day;
  const rangeLabel = RANGES.find((r) => r.days === data.rangeDays)?.label ?? `${data.rangeDays} days`;
  const joined = sum(days, "tune_join");

  return (
    <main className="adm">
      <style>{CSS}</style>
      <header className="adm-head">
        <h1>How Elsewhere is doing</h1>
        <nav>
          <a href="https://elsewheremusic.com" target="_blank" rel="noreferrer">Live site ↗</a>
          <a href="https://vercel.com/umsheres-projects/radio-passport" target="_blank" rel="noreferrer">Vercel ↗</a>
        </nav>
      </header>

      <Form method="get" className="adm-range" aria-label="Time range">
        {RANGES.map((r) => (
          <button type="submit" key={r.days} name="days" value={r.days} data-on={r.days === data.rangeDays || undefined}>
            {r.label}
          </button>
        ))}
      </Form>

      {data.store !== "redis" ? (
        <p className="note">
          {data.store === "file"
            ? "These counts are from this machine only. The live site's visitors are on the live /admin."
            : "No store is connected, so nothing is being counted."}
        </p>
      ) : null}

      <section>
        <p className="adm-lead">
          {visits === 0 ? (
            <>No visits counted in the last {rangeLabel.toLowerCase()} yet.{first ? "" : " Counting started when the store was connected, so it begins empty."}</>
          ) : (
            <>
              In the last {rangeLabel.toLowerCase()}, <b>{visits}</b> {visits === 1 ? "visit" : "visits"}
              {countries.length ? <> from <b>{countries.length}</b> {countries.length === 1 ? "country" : "countries"}</> : null}.{" "}
              {sum(days, "stamp") ? <><b>{sum(days, "stamp")}</b> passport {sum(days, "stamp") === 1 ? "stamp" : "stamps"}. </> : null}
              {sum(days, "ticket_share") ? <><b>{sum(days, "ticket_share")}</b> {sum(days, "ticket_share") === 1 ? "ticket" : "tickets"} sent. </> : null}
              {joined ? <><b>{joined}</b> {joined === 1 ? "friend" : "friends"} arrived from a share.</> : null}
            </>
          )}
        </p>
        <p className="note">
          Counting began {first ?? "when the store was connected"}. Everything is anonymous: a count per day, no
          person, no address, no station.
        </p>
      </section>

      <section>
        <h2>The journey</h2>
        <p className="note">What people do, in the order they do it. Each row is a count of that moment.</p>
        <ol className="adm-steps">
          {stepCounts.map((step, i) => (
            <li key={step.field}>
              <div className="adm-step-top">
                <span className="adm-step-n">{i + 1}</span>
                <span className="adm-step-label">{step.label}</span>
                <b>{step.n}</b>
              </div>
              <Bar value={step.n} max={top} />
              <small>
                {step.plain}
                {step.field !== "visit" && visits > 0 ? ` About ${Math.round((step.n / visits) * 100)} per 100 visits.` : ""}
                {step.field === "tune_join" && step.n > 0
                  ? ` ${sum(days, "tune_join:ticket")} from a ticket, ${sum(days, "tune_join:link")} from a plain link.`
                  : ""}
              </small>
            </li>
          ))}
        </ol>
        <details className="adm-more">
          <summary>Other things people did</summary>
          <table>
            <tbody>
              {OTHER_ACTIONS.map(([field, label]) => (
                <tr key={field}><td>{label}</td><td>{sum(days, field)}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
      </section>

      <section>
        <h2>Where visitors are</h2>
        {countries.length === 0 ? (
          <p className="note">
            No countries yet. A country is recorded for each visit from now on, taken from the country the host puts on
            the request. The address itself is never kept.
          </p>
        ) : (
          <ul className="adm-countries">
            {countries.slice(0, 25).map((c) => (
              <li key={c.code}>
                <span className="adm-flag" aria-hidden="true">{flagOf(c.code)}</span>
                <span className="adm-country">{c.name}</span>
                <Bar value={c.n} max={countries[0]!.n} tone="dust" />
                <b>{c.n}</b>
                <small>{Math.round((c.n / countryTotal) * 100)}%</small>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Visits by day</h2>
        <div className="adm-days" role="img" aria-label={`Visits per day, ${rangeLabel}`}>
          {days.map((d) => (
            <i key={d.day} title={`${d.day}: ${d.counts.visit ?? 0}`} style={{ height: `${Math.max(2, ((d.counts.visit ?? 0) / maxDay) * 100)}%` }} />
          ))}
        </div>
        <p className="note">
          {days[0]?.day} to {days[days.length - 1]?.day}, UTC days. Busiest day: {maxDay} {maxDay === 1 ? "visit" : "visits"}.
        </p>
        <h3>Pages viewed</h3>
        <ul className="adm-countries is-pages">
          {pages.map((p) => (
            <li key={p.k}>
              <span className="adm-country">{PAGE_NAMES[p.k]}</span>
              <Bar value={p.n} max={maxPage} tone="dust" />
              <b>{p.n}</b>
            </li>
          ))}
        </ul>
      </section>

      <details className="adm-tools">
        <summary>Tools and system</summary>
        <section>
          <h2>Test the Keeper</h2>
          <p className="note">
            Type a question to see how it is understood: what Jev picks, what the keyword rules pick, and which one
            the Keeper would use. Ask switch: <b>{yes(s.keeperAsk)}</b> · Jev key: <b>{s.jevKey ? "set" : "missing"}</b>.
          </p>
          <Form method="post" className="adm-form">
            <input name="question" placeholder="who is singing this?" maxLength={200} autoComplete="off" />
            <button type="submit">Route it</button>
          </Form>
          {result && "error" in result ? <p className="note">{result.error}</p> : null}
          <table>
            <thead><tr><th>Question</th><th>Used</th><th>Jev</th><th>Rules</th><th>ms</th></tr></thead>
            <tbody>
              {data.recent.length === 0 ? (
                <tr><td colSpan={5}>No tests yet this session.</td></tr>
              ) : (
                data.recent.map((t) => (
                  <tr key={t.at + t.question}>
                    <td>{t.question}</td>
                    <td>{t.routed.intent} <em>({t.routed.source}{t.routed.confidence !== null ? ` ${Math.round(t.routed.confidence * 100)}%` : ""})</em></td>
                    <td>{t.jev === null ? "no key" : "error" in t.jev ? t.jev.error : `${t.jev.intent}${t.jev.confidence !== null ? ` ${Math.round(t.jev.confidence * 100)}%` : ""}`}</td>
                    <td>{t.rules}</td>
                    <td>{t.ms}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
        <section>
          <h2>System</h2>
          <table>
            <tbody>
              <tr><td>Build</td><td>{s.commit} · {s.subject}</td></tr>
              <tr><td>Node</td><td>{s.node}</td></tr>
              <tr><td>Keeper questions</td><td>{yes(s.keeperAsk)}</td></tr>
              <tr><td>Jev (TypeSafe) key</td><td>{s.jevKey ? "set" : "missing"}</td></tr>
              <tr><td>AI provider</td><td>{s.aiProvider}</td></tr>
              {Object.entries(s.providers).map(([name, on]) => (
                <tr key={name}><td>{name} key</td><td>{on ? "set" : "missing"}</td></tr>
              ))}
              <tr><td>Counter store (redis)</td><td>{s.redis ? "connected" : "not set"}</td></tr>
            </tbody>
          </table>
        </section>
        <section>
          <h2>Preview a ticket</h2>
          <Form method="get" className="adm-form" onSubmit={(e) => { e.preventDefault(); const v = (e.currentTarget.elements.namedItem("uuid") as HTMLInputElement).value.trim(); if (v) window.open(`/ticket/${v}.png`, "_blank"); }}>
            <input name="uuid" placeholder="station uuid" autoComplete="off" />
            <button type="submit">Open ticket</button>
          </Form>
        </section>
      </details>
    </main>
  );
}

function Gate({ error }: { error: string | null }) {
  return (
    <main className="adm adm-gate">
      <style>{CSS}</style>
      <Form method="post" className="adm-form">
        <input type="hidden" name="intent" value="unlock" />
        <input
          name="code"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          placeholder="Code"
          aria-label="Admin code"
        />
        <button type="submit">Enter</button>
      </Form>
      {error ? <p className="note" role="alert">{error}</p> : null}
    </main>
  );
}

const CSS = `
.adm-gate{max-width:360px;padding-top:30vh}
.adm-lead{margin:24px 0 6px;font:italic 400 24px/1.35 "Newsreader",serif;max-width:34ch}
.adm-lead b{font-style:normal;color:var(--ew-foil)}
.adm-range{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0 4px}
.adm-range button{min-height:40px;padding:0 14px;border:1px solid var(--ew-foil-line);background:none;color:var(--ew-dust);font:500 11px/1 "Azeret Mono",monospace;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;border-radius:0}
.adm-range button[data-on]{border-color:var(--ew-foil);color:var(--ew-foil)}
.adm-steps{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:14px}
.adm-step-top{display:flex;align-items:baseline;gap:10px}
.adm-step-n{font:500 10px/1 "Azeret Mono",monospace;color:var(--ew-dust);min-width:14px}
.adm-step-label{flex:1}
.adm-step-top b{font:italic 400 24px/1 "Newsreader",serif}
.adm-steps small,.adm-countries small{display:block;color:var(--ew-dust);margin-top:4px}
.adm-bar{display:block;height:6px;background:var(--ew-rule);margin-top:6px}
.adm-bar i{display:block;height:100%;background:var(--ew-foil)}
.adm-bar[data-tone="dust"] i{background:var(--ew-dust)}
.adm-countries{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:10px}
.adm-countries li{display:grid;grid-template-columns:auto minmax(110px,1fr) minmax(60px,2fr) auto auto;align-items:center;gap:10px}
.adm-countries li .adm-bar{margin:0}
.adm-countries.is-pages li{grid-template-columns:minmax(110px,1fr) minmax(60px,2fr) auto}
.adm-countries small{margin:0;min-width:34px;text-align:right}
.adm-flag{font-size:18px}
.adm-days{display:flex;align-items:flex-end;gap:2px;height:96px;margin-top:10px;border-bottom:1px solid var(--ew-rule)}
.adm-days i{flex:1;min-width:1px;background:var(--ew-foil);opacity:.8}
.adm details>summary{cursor:pointer;margin-top:24px;font:500 11px/1.3 "Azeret Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--ew-foil)}
.adm{max-width:960px;margin:0 auto;padding:24px 16px 96px;color:var(--ew-bone);font:400 14px/1.5 "Schibsted Grotesk",sans-serif}
.adm h1{margin:0;font:italic 400 32px/1.1 "Newsreader",serif}
.adm h1 small,.adm h2 small{font:500 10px/1.3 "Azeret Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--ew-dust);margin-left:10px}
.adm h2{margin:32px 0 10px;font:italic 400 24px/1.1 "Newsreader",serif}
.adm h3{margin:20px 0 6px;font:500 11px/1.3 "Azeret Mono",monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--ew-foil)}
.adm-head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:12px}
.adm-head nav{display:flex;gap:16px}
.adm a{color:var(--ew-foil);text-decoration:none;font:500 11px/1 "Azeret Mono",monospace;letter-spacing:.14em;text-transform:uppercase}
.adm table{width:100%;border-collapse:collapse;margin-top:8px}
.adm th{text-align:left;font:500 10px/1.3 "Azeret Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--ew-dust)}
.adm td,.adm th{padding:7px 8px 7px 0;border-bottom:1px solid var(--ew-rule)}
.adm td:first-child{color:var(--ew-dust)}
.adm-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:8px 0 16px}
.adm-tiles div{border:1px solid var(--ew-foil-line);padding:12px}
.adm-tiles b{display:block;font:italic 400 32px/1 "Newsreader",serif}
.adm-tiles span{font:500 10px/1.3 "Azeret Mono",monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--ew-dust)}
.adm .note{color:var(--ew-dust);max-width:70ch}
.adm-form{display:flex;gap:8px;margin:10px 0}
.adm-form input{flex:1;min-height:44px;padding:0 12px;border:1px solid var(--ew-foil-line);background:none;color:var(--ew-bone);font:inherit;border-radius:0}
.adm-form button{min-height:44px;padding:0 16px;border:1px solid var(--ew-foil);background:none;color:var(--ew-foil);font:500 11px/1 "Azeret Mono",monospace;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;border-radius:0}
`;
