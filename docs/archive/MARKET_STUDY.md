# Elsewhere — market study (public sources)

**Not a Nielsen deck.** No panel, no paid Statista extract, no Sensor Tower downloads. A category read mapped onto what Elsewhere actually is: a taste object on top of a public catalog, with a hard rule that **hearing radio stays free**.

- **Product:** [elsewheremusic.com](https://elsewheremusic.com)
- **Paid object (not built):** Correspondent — $6/mo or $60/yr. Never named Premium. Never a stream paywall.
- **Catalog:** Radio Browser (live, public).
- **Dated:** 2026-08-30. Fetched from primary pages and public reports in this session (Grok 4.6). Sources at the end.

---

## 0. Can Grok 4.6 do this?

**Yes, with a ceiling.** This session could open public company IR, Wikipedia, Pew, PwC, IFPI, Radio Browser, NTS, SomaFM, Last.fm, Are.na, Bandcamp, Mixcloud, Kinfolk. It could not buy Nielsen Audio, Edison full PDFs, App Annie, or a syndicated “internet radio market” workbook.

A DeepSeek-backed search API was **not** wired here (`DEEPSEEK_API_KEY` missing). DuckDuckGo HTML worked once, then challenged. Direct `curl` of known URLs did the work. That is enough for a real category read. It is not enough to pretend we measured share of ear.

Treat every syndicated TAM as a **range with an agenda**, not a fact.

---

## 1. What market this is (and is not)

Elsewhere is **not** Spotify with a globe.

| If you think it is… | You will size the wrong ocean |
|---|---|
| On-demand music subscription | Spotify: 777M MAU, 300M Premium, €4.8B Q2 2026 revenue ([Spotify Q2 2026](https://newsroom.spotify.com/2026-08-04/spotify-q2-2026-earnings/)) |
| Car-bundled live audio | SiriusXM: ~33M paid, ~150M platform listeners, $8.56B 2025 revenue and **falling** ([SiriusXM IR](https://investor.siriusxm.com/)) |
| US broadcast advertising | iHeart “9 of 10 Americans every month”; terrestrial radio still ~80%+ weekly in the US ([iHeart](https://www.iheartmedia.com/), [Pew](https://www.pewresearch.org/journalism/fact-sheet/audio-and-podcasting/)) |
| A directory of streams | TuneIn / Radio Garden / Radio Browser |

**What it is:** live radio dressed as a fashion cover of a city that is awake without you. The catalog is public. The object you might pay for is the **desk** (mix, filed dispatch, probe-ahead, synced passport) — a taste object, closer to NTS Supporters, Last.fm Pro, Are.na Premium, SomaFM donations, and Kinfolk than to Spotify Premium.

Hard rule that changes the TAM: **never charge to hear the radio.** Public streams stay public. That kills the usual internet-radio playbook (ads on the stream, sports rights, geoblocked “premium stations”). TuneIn already lives in that playbook and is being bought for it.

---

## 2. Three oceans, only one is ours

### A. Radio as mass medium (too big, wrong buyer)

- **Pew / Nielsen via RAB (US):** weekly terrestrial (AM/FM) listenership was 92% of Americans 12+ in 2009, 89% in 2019, 83% in 2020, **82% in 2022**. The mass ear is still radio. It is also old, in-car, and sold as GRPs. ([Pew Audio and Podcasting Fact Sheet](https://www.pewresearch.org/journalism/fact-sheet/audio-and-podcasting/), citing Nielsen Audio RADAR via RAB.)
- **Edison Infinite Dial 2025:** **79%** of Americans 12+ listen to online audio monthly — about **228 million** people. Podcasting: 70% have ever listened; 55% monthly. ([Edison / SSRS Infinite Dial 2025](https://www.edisonresearch.com/the-infinite-dial-2025/).)
- **PwC Global E&M Outlook:** radio advertising ~**$29.5B in 2022**, ~**$31B by 2027**. Music streaming subscriptions **$21.4B (2022) → $27.6B (2027)**. ([PwC Outlook 2026–2030](https://www.pwc.com/gx/en/industries/tmt/media/outlook.html).)
- **Mordor (vendor TAM, treat as ceiling):** “nearly 4 billion monthly radio listeners worldwide” and **$42B** radio advertising; internet-radio **software/services** sized at **$3.22B (2025) → $3.62B (2026) → $6.47B (2031)**, 12.33% CAGR. North America 47.2% of that revenue. ([Mordor internet radio](https://www.mordorintelligence.com/industry-reports/internet-radio-market).)

Other shops on the same phrase “internet radio market” spit **$2.8B to $10.8B** for 2025. That spread is the tell: these reports mix aggregators, smart-speaker firmware, ad tech, and podcasting. Do not fundraise off a single CAGR.

**Implication:** radio is not dead. Radio advertising is a slow, large, incumbent business. Elsewhere does not sell spots. Using $30–42B as TAM would be a lie.

### B. Internet radio as a utility (adjacent, crowded)

This is TuneIn, iHeartRadio app, Radio Garden, myTuner, Simple Radio, Radio.net, plus every car OEM’s tuner.

**Live public catalog (this session, Radio Browser `de1`):**

| Metric | 2026-08-30 |
|---|---|
| Stations | **58,504** |
| Marked broken | 5,340 (~9%) |
| Countries | 241 |
| Languages | 659 |
| Tags | 12,079 |
| Clicks last day | **177,618** |

That is demand for the **raw directory**: ~65 million clicks/year on one open API, before any cover, stamp, or desk. Broken-stream rate is the product problem (CORS, mixed content, dead mounts) — Elsewhere already retries then skips; Correspondent’s probe-ahead is the paid version of that honesty.

**Radio Garden** (closest object in the world): Dutch non-profit research project, globe UX, **~8,000 stations at 2016 launch** (went viral), **>40,000 stations in 2024**. Native apps 2018. Banned in Turkey since 2022. ([Wikipedia: Radio Garden](https://en.wikipedia.org/wiki/Radio_Garden).) They proved the globe is the interface. They did not productize a cover, a 60-second stamp, or a paid desk. Competing with them on station count is a trap; they are a window on the same public ocean.

**TuneIn:** founded 2002 as RadioTime. **30M MAU by June 2012** (old; do not treat as current). Premium = ad-free + sports rights (NFL, MLB). Closed most new station submissions around 2018. UK geoblock after a 2019 High Court loss to labels. **Stingray to acquire TuneIn for $175 million (announced November 2025).** ([Wikipedia: TuneIn](https://en.wikipedia.org/wiki/TuneIn).)

$175M for a rights-and-distribution aggregator is the **utility** price. It is not the taste-object price. TuneIn’s legal history is a warning: if you rebroadcast foreign stations into a licensed territory as a product, labels will treat you as a service, not a link. Elsewhere’s stance — public streams stay public, no invented ICY, no AI on the audio path — is also a **legal posture**. Do not become a second TuneIn.

**SiriusXM** is live audio people *already pay for*: 33M subscribers, $2.16B Q2 2026 revenue, $239M net income — and full-year revenue down three years running ($8.95B → $8.70B → $8.56B). Pandora still ~40M actives. This is bundled into cars. Churn is the story. Not a model to copy; proof that **paid live audio exists** and that scale without taste is a grind.

**iHeartMedia:** US broadcast incumbent, 2025 net income **$471.9M**, assets **$5.13B**, ~9,550 employees, homepage claim “9 out of 10 Americans every month.” Digital is a sidecar on a radio company. ([Wikipedia: iHeartMedia](https://en.wikipedia.org/wiki/IHeartMedia), [iHeart](https://www.iheartmedia.com/).)

### C. Taste objects (the actual SAM)

People who pay a few dollars a month **not to hear more audio**, but to keep a relationship with a room.

| Object | Price | What you buy | Scale we can see |
|---|---|---|---|
| **NTS Supporters** | from **£3.99/mo** | timestamps, archive, Discord, supporter radio | Independent London station; “Don’t Assume”; events + shop. ([NTS Supporters](https://www.nts.live/supporters)) |
| **SomaFM** | **$4.20/mo or $50/yr** (ask) | keep commercial-free channels on | Donation radio since 2000; they compare themselves to $13–30 satellite/internet music. ([SomaFM support](https://www.somafm.com/support/)) |
| **Last.fm Pro** | **$4.99/mo or $49.99/yr** | scrobble tools, ad-free, badge — **taste graph**, not the music | 500M+ scrobbles claimed on the subscribe page. Independent again in 2026. ([Last.fm subscribe](https://www.last.fm/subscribe)) |
| **Are.na Premium** | **$7/mo or $70/yr** (Supporter $120/yr) | unlimited blocks, search — a research object | **20,516 paying**, **41,828 MAU**, **$125,085 MRR** as of fetch day. Implied ARPU **~$6.10**. Goal $135k MRR by end of 2026. ([Are.na about](https://www.are.na/about)) |
| **Mixcloud Premium** | **$7.99/mo** (Pro for uploaders $11.25/mo annual) | offline / unlimited listening of mixes | Raised $11.5M in 2018; 3M actives was a 2012 figure. ([Mixcloud Plus](https://www.mixcloud.com/plus/), Wikipedia) |
| **Kinfolk** | **$40/yr digital, $80/yr premium print** | slow magazine as object | Portland “slow lifestyle.” ([Kinfolk subscribe](https://www.kinfolk.com/subscribe/)) |
| **Letterboxd** | logging free; Pro/Patron paid | diary of films | **>30 million members (July 2026)**. Tiny majority owner. Video store launched Dec 2025. The log is free; the object is identity. ([Wikipedia: Letterboxd](https://en.wikipedia.org/wiki/Letterboxd)) |
| **Bandcamp** | take-rate, not sub | owning the record | **$1.79B** paid to artists/labels lifetime; **$225M** in the past year. ([Bandcamp about](https://bandcamp.com/about)) |
| **Worldwide FM** | freeform station | Gilles Peterson’s room | **>400k monthly listeners (2020)**. Almost paused in 2022; didn’t. (Wikipedia) |

**Are.na is the cleanest money analog.** Same price band as Correspondent. A small, stubborn independent with ~20k paying and ~$1.5M ARR. That is a real company. It is not a Series C. Plan for that shape.

**Last.fm is the cleanest product analog on the graph side.** They never sold the audio. They sold *your* listening as an object. Elsewhere’s theater graph (MusicBrainz + cited web, never invented ICY) is that instinct applied to **someone else’s now**.

**NTS / SomaFM / The Lot / dublab** are rooms. They program. Elsewhere does not program; it **lands** you in a public station and files a cover. Different job. Same buyer: people who want a night, not a shuffle.

---

## 3. TAM / SAM / SOM (honest)

Use **bands**. If a slide needs one number, it is lying.

### TAM — people who already listen to live or online radio *and* will use a web/app tuner

Not Spotify’s 777M. Not $30B of radio ads.

**Working TAM (users):** hundreds of millions of weekly radio listeners globally; **~228M Americans** already in “online audio monthly” (Edison 2025). Mordor’s **$3.2–3.6B (2025–26)** “internet radio market” is the vendor envelope for aggregators + players + related ads — use as **order of magnitude for the utility layer**, not as Elsewhere revenue.

**Working TAM (revenue Elsewhere could theoretically touch if it sold ads on streams):** do not. That contradicts the hard rule and puts you in TuneIn’s lawsuit weather.

### SAM — people who want *place, hour, language, or taste* from live radio, and will pay a small independent for a desk

Three overlapping pockets:

1. **World-radio roamers** — Radio Garden’s viral proof (2016) that a globe is enough to go mainstream-for-a-weekend. Recurring use is the diaspora, the night-shift, the person who wants Kochi at dusk, Lisbon, Malayalam, a city they left.
2. **Room people** — NTS / Lot / dublab / Worldwide listeners. They already pay £4 or buy a ticket. They will not pay Spotify more; they will pay a room.
3. **Taste-object people** — Letterboxd / Are.na / Last.fm / Kinfolk. They collect stamps, logs, issues. Passport after 60s is this instinct.

**Working SAM (revenue):** if 50k–200k people worldwide will pay **$60/yr** for a radio-adjacent taste object (Are.na is 20k; NTS is smaller; Last.fm Pro is unknown but long-lived), that is **$3–12M ARR** for the *whole category of paid desks*, not for Elsewhere alone. Split with NTS, SomaFM, Mixcloud, whoever else. **SAM for Correspondent is a low-single-digit million ARR category until proven otherwise.**

### SOM — what Elsewhere can take in 24 months without a sports deal

Assume launch works and the globe/theater is the frame.

| Year-2 case | Qualified users (stamped) | Checkout start | Paid (at 1.5–4% of qualified) | ARR at $60 |
|---|---|---|---|---|
| Kill line (already in roadmap) | 200 | <1.5% | ~0–3 | ~$0 — stop |
| Thin | 5,000 | 2% | 100 | **$6k** |
| Honest independent | 25,000 | 3% | 750 | **$45k** |
| Are.na-shaped | 80,000 | 4% | 3,200 | **$192k** |
| Stretch (do not put on a pitch) | 200,000 | 5% | 10,000 | **$600k** |

Roadmap kill: **≥200 qualified users and checkout start <1.5%, or AI COGS >35% of MRR.** Keep both. $6/mo is in the proven band (NTS £3.99, Soma $4.20, Last.fm $4.99, Are.na $7). Annual $60 is Soma’s $50 with a magazine spine.

**1,000 true fans × $60 = $60k ARR.** That pays a desk. It does not pay a headcount of ten.

---

## 4. Competitive map

```
                    PROGRAMMED ROOM              PUBLIC CATALOG
                   (they pick the night)        (the world is on)
  TASTE OBJECT     NTS, The Lot, dublab,        **Elsewhere**
  (cover, stamp,   Worldwide FM, Kinfolk        Radio Garden (globe only)
   letter, book)                                Last.fm (graph, no live place)

  UTILITY          iHeart app, Sirius app       TuneIn, myTuner, Simple Radio,
  (search, list,                                Radio Browser frontends
   car, sports)
```

**Do not fight TuneIn on sports, cars, or station count.** They are becoming a Stingray distribution pipe for $175M.

**Do not fight Radio Garden on the globe.** They taught the world that control. Elsewhere’s globe is real Radio Browser cities — keep it true — but the **viral frame is `/listen`**, not the globe ([SESSION_HANDOFF](./SESSION_HANDOFF.md)). Radio Garden has no theater letter, no 60s stamp, no filed graph.

**Do not fight NTS on programming.** They are a station. We land in stations.

**Do not fight Spotify.** If someone wants a song, they already have it. If they want *a city that is awake without them*, Spotify cannot sell that without lying.

**Incumbent risk:** iHeart + TuneIn + Audacy partnerships mean the utility layer will keep bundling US brands. Diaspora and non-US FM (Tamil, Malayalam, Lisbon dusk) are poorly served by those bundles. That is the seam.

---

## 5. Buyer

Not “audio users.” A person who will stay sixty seconds.

**Primary (launch):**
- Diaspora and language-first listeners (the product already takes *tamil*, *Malayalam night*, a city name). Radio Browser has **659 languages**. TuneIn closed submissions; the long tail lives on the open catalog.
- Night people — the cover is dusk, hour, stamp. Edison’s online-audio mass is real; the subset who want a *place* is the SAM.
- Taste collectors — Letterboxd/Are.na temperament. Passport is the loop. Theater is the share object (*Someone else's now*).

**Secondary (Correspondent):**
- The same person after the free mix quota and template dispatch feel thin.
- They are buying **unlimited mix, filed dispatch, probe-ahead, cloud book** — the desk — not audio.

**Not the buyer:**
- US drive-time GRP buyers.
- Sports-audio Premium.
- Anyone who must hear a specific track now.

---

## 6. Pricing verdict

**$6 / $60 is correctly placed.** It sits on top of NTS, SomaFM, Last.fm, Are.na. It is below Mixcloud Premium and Kinfolk print. It is a tenth of Sirius.

Do **not** raise it to “feel premium.” The word Premium is banned for a reason: it implies the stream is the lock. The stream is the commons.

Do **not** add a second tier in year one. Are.na has Premium + Supporter; they have 20k paying and a public expense pie. Earn that.

**COGS:** Flash/Gemini dispatch + trivia is the variable cost. Kill if AI COGS >35% of MRR. Theater already has a free MusicBrainz path (`source=free`) and an AI path that must not touch audio. Keep the free path fat so unpaid listening never depends on a model bill.

---

## 7. What the numbers say to do (and not do)

1. **Launch the cover, not the directory.** Radio Garden already is the directory-globe. Campaign *Someone else's now* is right; `/listen` is the frame.
2. **Stay on the public catalog.** 58k stations, 241 countries, 177k clicks/day on Radio Browser. Broken streams are the reliability war (roadmap §3). Probe-ahead is the paid feature that respects the hard rule.
3. **Do not turn on billing in launch week** (already the rule). Need stamped users before a checkout rate means anything.
4. **Size the company like Are.na, not like Spotify.** 20k paying at ~$6 ARPU is a win condition, not a failure to IPO.
5. **Legal:** TuneIn’s UK judgment is the ghost. Aggregate, don’t re-license. No invented titles. No AI on the audio path. Geoblocking other people’s streams is their problem; don’t build a product that requires it.
6. **Diaspora is the unfair seam.** Language + hour + city is a job US aggregators do badly once sports and talk are the money.
7. **Share analog is Letterboxd, not TikTok.** 30M members from a diary. Stamps and theater stills, not a feed (roadmap: no social feed this quarter).

---

## 8. Source table

Fetched 2026-08-30 unless noted.

| Claim | Source |
|---|---|
| Radio Browser 58,504 stations, 241 countries, 659 languages, 177,618 clicks/day | `https://de1.api.radio-browser.info/json/stats` |
| Spotify 300M Premium, 777M MAU, €4.8B Q2 2026 revenue, 33.4% GM, €655M OI | [Spotify newsroom Q2 2026](https://newsroom.spotify.com/2026-08-04/spotify-q2-2026-earnings/) |
| SiriusXM ~33M paid, ~150M listeners, $8.56B FY2025, $2.16B Q2’26 revenue | [investor.siriusxm.com](https://investor.siriusxm.com/) |
| Internet radio vendor TAM $3.22B (2025) / $3.62B (2026) / $6.47B (2031), 12.33% CAGR; $42B radio ads claim | [Mordor](https://www.mordorintelligence.com/industry-reports/internet-radio-market) |
| Radio ads $29.5B (2022) → $31B (2027); music subs $21.4B → $27.6B | [PwC E&M Outlook](https://www.pwc.com/gx/en/industries/tmt/media/outlook.html) |
| 752M paid music-subscription users end-2024; recorded music +9.5% | [IFPI industry data](https://www.ifpi.org/our-industry/industry-data/) |
| US weekly AM/FM 82% in 2022 (from 92% in 2009); online audio 75% monthly early 2023 | [Pew](https://www.pewresearch.org/journalism/fact-sheet/audio-and-podcasting/) citing Nielsen/RAB and Edison 2023 |
| US online audio 79% monthly, ~228M, Infinite Dial 2025; podcast 70% ever / 55% monthly | [Edison Infinite Dial 2025](https://www.edisonresearch.com/the-infinite-dial-2025/) |
| Radio Garden 8k stations (2016), >40k (2024), viral launch, Turkey ban 2022 | [Wikipedia: Radio Garden](https://en.wikipedia.org/wiki/Radio_Garden) |
| TuneIn 30M MAU (2012); Stingray deal **$175M** (Nov 2025); UK geoblock; closed submissions ~2018 | [Wikipedia: TuneIn](https://en.wikipedia.org/wiki/TuneIn) |
| iHeart “9 of 10 Americans”; 2025 net income $471.9M | [iHeart](https://www.iheartmedia.com/), [Wikipedia: iHeartMedia](https://en.wikipedia.org/wiki/IHeartMedia) |
| NTS Supporters from £3.99/mo | [nts.live/supporters](https://www.nts.live/supporters) |
| SomaFM $4.20/mo or $50/yr ask | [somafm.com/support](https://www.somafm.com/support/) |
| Last.fm Pro $4.99 / $49.99 | [last.fm/subscribe](https://www.last.fm/subscribe) |
| Are.na $7 / $70; 20,516 paying; $125,085 MRR; 41,828 MAU | [are.na/about](https://www.are.na/about) |
| Mixcloud Premium $7.99/mo | [mixcloud.com/plus](https://www.mixcloud.com/plus/) |
| Kinfolk $40 digital / $80 premium | [kinfolk.com/subscribe](https://www.kinfolk.com/subscribe/) |
| Letterboxd >30M members (Jul 2026) | [Wikipedia: Letterboxd](https://en.wikipedia.org/wiki/Letterboxd) |
| Bandcamp $1.79B to artists; $225M past year | [bandcamp.com/about](https://bandcamp.com/about) |
| Correspondent $6 / $60, kill tests | [ROADMAP.md](./ROADMAP.md), [SESSION_HANDOFF.md](./SESSION_HANDOFF.md) |

**Still dark (would need a paid panel or a live product):** Elsewhere unique visitors, stamp conversion, mix-quota exhaustion, checkout start, diaspora mix vs city mix, Radio Garden current MAU, TuneIn current MAU, NTS supporter count, Last.fm Pro count.

When billing is flagged on, the first study that matters is **stamped users → checkout start → paid**, not another TAM slide.

---

## 9. One paragraph for a human

Radio still has the mass ear (US weekly AM/FM ~82% as of the last Pew/Nielsen public series; 228M Americans in monthly online audio). The money in that ocean is ads and cars. Elsewhere is not in that ocean. The public catalog is huge and slightly broken (58k stations, ~9% flagged dead). Radio Garden already is the globe; TuneIn is being sold for $175M as a rights pipe. The job that is still open is a **taste object on live place**: a cover, a stamp, a desk. People already pay $4–7/mo for that shape (NTS, Soma, Last.fm, Are.na). Correspondent at $6/60 sits on that shelf. Hearing radio stays free. If 3,000 people pay, it is a real independent. If 200 people stamp and nobody starts checkout, kill it.
