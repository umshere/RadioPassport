import { execSync } from "node:child_process";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { ruleClassify } from "~/components/keeper/keeperIntent";
import { trimEnv } from "~/services/ai/completeFallback";
import { counterStoreKind, readCounters } from "~/services/admin/counters.server";
import { classifyKeeperQuestion, jevDecide } from "~/services/keeper/jev.server";
import { isKeeperAskEnabled } from "~/services/keeper/flag.server";

/**
 * /admin — a LOCAL-ONLY console. It answers 404 on the live site (any Vercel
 * deploy) and for any host that is not localhost, so it can never be reached
 * in production. It shows traffic, what is switched on, and lets you test the
 * Keeper's question routing (Jev vs the keyword rules) with a real key.
 */
export const handle = { admin: true };
export const meta = () => [{ title: "Admin (local) · Elsewhere" }, { name: "robots", content: "noindex" }];

function assertLocal(request: Request) {
  const host = new URL(request.url).hostname;
  const local = host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
  if (process.env.VERCEL || !local) throw new Response("Not Found", { status: 404 });
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
  assertLocal(request);
  const counters = await readCounters(14);
  const flag = (name: string) => Boolean(trimEnv(process.env[name]));
  return json({
    store: counterStoreKind(),
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
  assertLocal(request);
  const form = await request.formData();
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

const PAGE_FIELDS = ["pageview:home", "pageview:desk", "pageview:about", "pageview:ticket", "pageview:other"];
const EVENT_FIELDS = [
  "keeper_open",
  "keeper_ask",
  "desk_view",
  "station_share",
  "ticket_open",
  "ticket_share",
  "ticket_copy",
  "ticket_save",
  "tune_join",
  "tune_join:ticket",
  "tune_join:link",
];

const sum = (days: Array<{ counts: Record<string, number> }>, field: string) =>
  days.reduce((total, d) => total + (d.counts[field] ?? 0), 0);

export default function Admin() {
  const data = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const days = data.counters;
  const s = data.system;
  const shortDay = (d: string) => d.slice(5);
  const yes = (v: boolean) => (v ? "on" : "off");

  return (
    <main className="adm">
      <style>{CSS}</style>
      <header className="adm-head">
        <h1>Admin <small>local only · never served on the live site</small></h1>
        <nav>
          <a href="/" target="_blank" rel="noreferrer">Local site ↗</a>
          <a href="https://elsewheremusic.com" target="_blank" rel="noreferrer">Live site ↗</a>
          <a href="https://vercel.com/umsheres-projects/radio-passport" target="_blank" rel="noreferrer">Vercel ↗</a>
        </nav>
      </header>

      <section>
        <h2>Traffic <small>last 14 days, UTC · store: {data.store}</small></h2>
        {data.store !== "redis" ? (
          <p className="note">
            {data.store === "file"
              ? "These are counts from this machine only (a local file). To see the live site's visitors here, add a free Upstash Redis or Vercel KV store to the Vercel project and put its REST URL and token in this machine's .env (see docs/ENVIRONMENT.md)."
              : "No store is connected, so nothing is being counted."}
          </p>
        ) : null}
        <div className="adm-tiles">
          <div><b>{sum(days, "visit")}</b><span>visits (one per browser per day)</span></div>
          <div><b>{PAGE_FIELDS.reduce((t, f) => t + sum(days, f), 0)}</b><span>page views</span></div>
          <div><b>{sum(days, "tune_join")}</b><span>joined from a share</span></div>
          <div><b>{sum(days, "ticket_share")}</b><span>tickets sent</span></div>
        </div>
        <table>
          <thead>
            <tr><th>Day</th><th>Visits</th>{PAGE_FIELDS.map((f) => <th key={f}>{f.split(":")[1]}</th>)}</tr>
          </thead>
          <tbody>
            {[...days].reverse().map((d) => (
              <tr key={d.day}>
                <td>{shortDay(d.day)}</td>
                <td>{d.counts.visit ?? 0}</td>
                {PAGE_FIELDS.map((f) => <td key={f}>{d.counts[f] ?? 0}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        <h3>Things people did</h3>
        <table>
          <tbody>
            {EVENT_FIELDS.map((f) => (
              <tr key={f}><td>{f}</td><td>{sum(days, f)}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Keeper and Jev</h2>
        <p className="note">
          Ask switch: <b>{yes(s.keeperAsk)}</b> · Jev key: <b>{s.jevKey ? "set" : "missing"}</b>. Type a question to
          see how it is routed: what Jev picks, what the keyword rules pick, and what the Keeper would actually use.
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
                  <td>
                    {t.jev === null ? "no key" : "error" in t.jev ? t.jev.error : `${t.jev.intent}${t.jev.confidence !== null ? ` ${Math.round(t.jev.confidence * 100)}%` : ""}`}
                  </td>
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
            <tr><td>Build</td><td>{s.commit} — {s.subject}</td></tr>
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
        <h2>Tickets <small>preview any station&rsquo;s ticket</small></h2>
        <Form method="get" className="adm-form" onSubmit={(e) => { e.preventDefault(); const v = (e.currentTarget.elements.namedItem("uuid") as HTMLInputElement).value.trim(); if (v) window.open(`/ticket/${v}.png`, "_blank"); }}>
          <input name="uuid" placeholder="station uuid" autoComplete="off" />
          <button type="submit">Open ticket</button>
        </Form>
      </section>
    </main>
  );
}

const CSS = `
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
