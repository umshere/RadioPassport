import type { ReactNode } from "react";
import satori from "satori";
import { TICKET_SIZE, type TicketFields, type TicketFormat } from "~/components/share/ticketModel";

/**
 * Draws the ticket: a cream passport-paper boarding pass on the night ink,
 * square edges, a perforated stub with ADMIT ONE and the postmark, the
 * Keeper in the corner. satori lays it out as SVG (text becomes paths, so the
 * image needs no system fonts), resvg rasterises it to PNG.
 */

export type TicketFont = {
  name: "Newsreader" | "Azeret Mono";
  data: ArrayBuffer | Buffer;
  weight: 400 | 500;
  style: "normal" | "italic";
};

export type TicketAssets = {
  fonts: TicketFont[];
  /** The Keeper sprite as a data URI (PNG). Optional: the ticket stands without him. */
  keeper?: string | null;
};

const C = {
  night: "#0C0B09",
  bone: "#E8DFD0",
  foilNight: "#C6A56A",
  paper: "#E6D8B9",
  paperEdge: "#C0AB82",
  ink: "#1F1A12",
  inkSoft: "#5E5343",
  foil: "#8A6E3A",
  lacquer: "#B5302F",
};

const SERIF = "Newsreader";
const MONO = "Azeret Mono";

type Style = Record<string, string | number>;

function Box({ style, children }: { style?: Style; children?: ReactNode }) {
  return <div style={{ display: "flex", ...style }}>{children}</div>;
}

function Label({ children, color = C.foil }: { children: ReactNode; color?: string }) {
  return (
    <Box style={{ fontFamily: MONO, fontWeight: 500, fontSize: 15, letterSpacing: 3.5, textTransform: "uppercase", color }}>
      {children}
    </Box>
  );
}

/** The city at a size that fits: long names step down rather than wrap mid-word. */
function citySize(place: string, big: number) {
  const n = place.length;
  if (n <= 9) return big;
  if (n <= 14) return Math.round(big * 0.8);
  if (n <= 20) return Math.round(big * 0.64);
  return Math.round(big * 0.5);
}

function Route({ fields, big }: { fields: TicketFields; big: number }) {
  return (
    <Box style={{ alignItems: "flex-end", gap: 28 }}>
      <Box style={{ flexDirection: "column", gap: 6, flexShrink: 0 }}>
        <Label>From</Label>
        <Box style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 46, lineHeight: 1.05, color: C.inkSoft }}>Here</Box>
      </Box>
      {/* The flight path: a drawn rule, not a glyph the Latin subset may lack. */}
      <Box style={{ alignItems: "center", paddingBottom: 26, flexShrink: 0 }}>
        <Box style={{ width: 54, height: 2, background: C.foil }} />
        <Box style={{ width: 12, height: 12, borderTop: `2px solid ${C.foil}`, borderRight: `2px solid ${C.foil}`, transform: "rotate(45deg)", marginLeft: -10 }} />
      </Box>
      <Box style={{ flexDirection: "column", gap: 6, flexGrow: 1, flexShrink: 1, minWidth: 0 }}>
        <Label>To</Label>
        <Box
          style={{
            fontFamily: SERIF,
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: citySize(fields.place, big),
            lineHeight: 1.02,
            letterSpacing: -1,
            color: C.ink,
          }}
        >
          {fields.place}
        </Box>
      </Box>
    </Box>
  );
}

function Field({ label, value, sub }: { label: string; value: string; sub?: string | null }) {
  return (
    <Box style={{ flexDirection: "column", gap: 8, minWidth: 0 }}>
      <Label color={C.inkSoft}>{label}</Label>
      <Box style={{ alignItems: "baseline", gap: 10 }}>
        <Box style={{ fontFamily: MONO, fontWeight: 500, fontSize: 28, letterSpacing: 1, textTransform: "uppercase", color: C.ink }}>
          {value}
        </Box>
        {sub ? (
          <Box style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 24, color: C.inkSoft }}>{sub}</Box>
        ) : null}
      </Box>
    </Box>
  );
}

function Fields({ fields, gap }: { fields: TicketFields; gap: number }) {
  return (
    <Box style={{ gap, flexWrap: "wrap", paddingTop: 20, borderTop: `2px solid ${C.ink}` }}>
      {fields.local ? <Field label="Local hour" value={fields.local.clock} sub={fields.local.word} /> : null}
      {fields.spoken ? <Field label="Spoken" value={fields.spoken} /> : null}
      {fields.signal ? <Field label="Signal" value={fields.signal} /> : null}
    </Box>
  );
}

function Postmark({ fields, size }: { fields: TicketFields; size: number }) {
  return (
    <Box
      style={{
        width: size,
        height: size,
        borderRadius: size,
        border: `3px solid ${C.lacquer}`,
        alignItems: "center",
        justifyContent: "center",
        transform: "rotate(-9deg)",
        opacity: 0.92,
      }}
    >
      <Box
        style={{
          width: size - 16,
          height: size - 16,
          borderRadius: size,
          border: `1px solid ${C.lacquer}`,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          color: C.lacquer,
        }}
      >
        <Box style={{ fontFamily: MONO, fontWeight: 500, fontSize: 11, letterSpacing: 2.5 }}>POSTMARKED</Box>
        <Box style={{ fontFamily: MONO, fontWeight: 500, fontSize: Math.round(size / 6.2), letterSpacing: 1 }}>{fields.postmarkDay}</Box>
        <Box style={{ fontFamily: MONO, fontSize: 12, letterSpacing: 2 }}>{fields.postmarkYear}</Box>
      </Box>
    </Box>
  );
}

function Perforation({ vertical, length }: { vertical: boolean; length: number }) {
  const dashes = Math.floor(length / 22);
  return (
    <Box
      style={{
        flexDirection: vertical ? "column" : "row",
        justifyContent: "space-between",
        alignItems: "center",
        ...(vertical ? { width: 2, height: length } : { height: 2, width: length }),
      }}
    >
      {Array.from({ length: dashes }, (_, i) => (
        <Box key={i} style={{ background: C.paperEdge, ...(vertical ? { width: 2, height: 11 } : { height: 2, width: 11 }) }} />
      ))}
    </Box>
  );
}

function Notch({ style }: { style: Style }) {
  return <Box style={{ position: "absolute", width: 36, height: 36, borderRadius: 36, background: C.night, ...style }} />;
}

function Paper({ children, style }: { children: ReactNode; style?: Style }) {
  return (
    <Box
      style={{
        position: "relative",
        background: C.paper,
        backgroundImage: "radial-gradient(ellipse at 14% 12%, rgba(255,247,223,0.7), rgba(230,216,185,0) 60%)",
        border: `1px solid ${C.paperEdge}`,
        ...style,
      }}
    >
      <Box style={{ position: "absolute", top: 10, left: 10, right: 10, bottom: 10, border: `1px solid rgba(31,26,18,0.16)` }} />
      {children}
    </Box>
  );
}

function Head({ fields }: { fields: TicketFields }) {
  return (
    <Box style={{ justifyContent: "space-between", alignItems: "center" }}>
      <Label>Elsewhere · Boarding pass</Label>
      <Label color={C.inkSoft}>{fields.serial}</Label>
    </Box>
  );
}

function Station({ fields, size }: { fields: TicketFields; size: number }) {
  return (
    <Box style={{ flexDirection: "column", gap: 6 }}>
      <Label color={C.inkSoft}>Station</Label>
      <Box style={{ fontFamily: SERIF, fontSize: size, lineHeight: 1.1, color: C.ink }}>{fields.name}</Box>
      {fields.country ? (
        <Box style={{ fontFamily: MONO, fontSize: 16, letterSpacing: 3, textTransform: "uppercase", color: C.inkSoft }}>
          {fields.country}
        </Box>
      ) : null}
    </Box>
  );
}

function Keeper({ src, size }: { src?: string | null; size: number }) {
  if (!src) return null;
  return <img src={src} width={size} height={size} style={{ width: size, height: size }} />;
}

function AdmitOne() {
  return <Box style={{ fontFamily: MONO, fontWeight: 500, fontSize: 20, letterSpacing: 6, color: C.lacquer }}>ADMIT ONE</Box>;
}

function Tagline({ color }: { color: string }) {
  return (
    <Box style={{ alignItems: "baseline", gap: 12, color }}>
      <Box style={{ fontFamily: MONO, fontSize: 16, letterSpacing: 2 }}>elsewheremusic.com —</Box>
      <Box style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 22 }}>You are not here.</Box>
    </Box>
  );
}

function CardTicket({ fields, keeper }: { fields: TicketFields; keeper?: string | null }) {
  const { width, height } = TICKET_SIZE.card;
  const pad = 34;
  const paperH = height - pad * 2;
  const stubW = 292;
  return (
    <Box style={{ width, height, background: C.night, padding: pad }}>
      <Paper style={{ width: width - pad * 2, height: paperH }}>
        <Box style={{ width: width - pad * 2 - stubW - 2, flexShrink: 0, flexDirection: "column", justifyContent: "space-between", padding: "38px 44px 34px" }}>
          <Head fields={fields} />
          <Route fields={fields} big={104} />
          <Station fields={fields} size={34} />
          <Fields fields={fields} gap={48} />
          <Tagline color={C.inkSoft} />
        </Box>
        <Box style={{ position: "relative", alignItems: "center" }}>
          <Notch style={{ top: -19, left: -17 }} />
          <Perforation vertical length={paperH - 40} />
          <Notch style={{ bottom: -19, left: -17 }} />
        </Box>
        <Box style={{ width: stubW, flexShrink: 0, flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "38px 24px 26px" }}>
          <AdmitOne />
          <Postmark fields={fields} size={164} />
          <Keeper src={keeper} size={132} />
        </Box>
      </Paper>
    </Box>
  );
}

function StoryTicket({ fields, keeper }: { fields: TicketFields; keeper?: string | null }) {
  const { width, height } = TICKET_SIZE.story;
  const padX = 64;
  const paperW = width - padX * 2;
  return (
    <Box style={{ width, height, background: C.night, flexDirection: "column", justifyContent: "space-between", padding: `96px ${padX}px 84px` }}>
      <Box style={{ flexDirection: "column", gap: 14 }}>
        <Label color={C.foilNight}>A ticket to elsewhere</Label>
        <Box style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 64, lineHeight: 1.05, color: C.bone }}>
          You are not here.
        </Box>
      </Box>
      <Paper style={{ width: paperW, flexDirection: "column" }}>
        <Box style={{ flexDirection: "column", gap: 40, padding: "44px 48px 40px" }}>
          <Head fields={fields} />
          <Route fields={fields} big={112} />
          <Station fields={fields} size={40} />
          <Fields fields={fields} gap={44} />
        </Box>
        <Box style={{ position: "relative", justifyContent: "center" }}>
          <Notch style={{ left: -19, top: -17 }} />
          <Perforation vertical={false} length={paperW - 40} />
          <Notch style={{ right: -19, top: -17 }} />
        </Box>
        <Box style={{ alignItems: "center", justifyContent: "space-between", padding: "32px 48px 36px" }}>
          <Box style={{ flexDirection: "column", gap: 18 }}>
            <AdmitOne />
            <Box style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: 26, color: C.inkSoft }}>Land here with me.</Box>
          </Box>
          <Postmark fields={fields} size={176} />
          <Keeper src={keeper} size={150} />
        </Box>
      </Paper>
      <Box style={{ justifyContent: "center" }}>
        <Box style={{ fontFamily: MONO, fontSize: 22, letterSpacing: 4, color: C.foilNight }}>ELSEWHEREMUSIC.COM</Box>
      </Box>
    </Box>
  );
}

const ARABIC = "Cairo";

/** Noto families for scripts the bundled Latin fonts cannot draw (station names travel). */
const NOTO: Record<string, string> = {
  "ja-JP": "Noto Sans JP",
  "ko-KR": "Noto Sans KR",
  "zh-CN": "Noto Sans SC",
  "zh-TW": "Noto Sans TC",
  "zh-HK": "Noto Sans HK",
  "th-TH": "Noto Sans Thai",
  "bn-IN": "Noto Sans Bengali",
  "ar-AR": ARABIC,
  "ta-IN": "Noto Sans Tamil",
  "ml-IN": "Noto Sans Malayalam",
  "he-IL": "Noto Sans Hebrew",
  "te-IN": "Noto Sans Telugu",
  devanagari: "Noto Sans Devanagari",
  kannada: "Noto Sans Kannada",
  symbol: "Noto Sans Symbols 2",
  math: "Noto Sans Math",
  unknown: "Noto Sans",
};

/**
 * satori files every script it has no code for under "unknown", which is
 * Latin/Cyrillic/Greek only, so these drew as blobs. Spot them from the text.
 */
const BY_RANGE: Array<[RegExp, string]> = [
  [/[\u0a80-\u0aff]/, "Noto Sans Gujarati"],
  [/[\u0a00-\u0a7f]/, "Noto Sans Gurmukhi"],
  [/[\u0b00-\u0b7f]/, "Noto Sans Oriya"],
  [/[\u0d80-\u0dff]/, "Noto Sans Sinhala"],
  [/[\u1780-\u17ff]/, "Noto Sans Khmer"],
  [/[\u0e80-\u0eff]/, "Noto Sans Lao"],
  [/[\u1000-\u109f]/, "Noto Sans Myanmar"],
  [/[\u10a0-\u10ff\u2d00-\u2d2f]/, "Noto Sans Georgian"],
  [/[\u0530-\u058f]/, "Noto Sans Armenian"],
  [/[\u1200-\u139f]/, "Noto Sans Ethiopic"],
];

const BLANK = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=";

async function withTimeout<T>(work: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([work, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

/**
 * Which Noto family draws this text. satori hands over every script that could
 * own a Han character ("ja-JP|zh-CN|…"); taking the first one drew Japanese
 * forms and left Simplified Chinese characters as empty boxes. Decide from the
 * text itself, then from the country on the ticket, and default Han to
 * Simplified Chinese.
 */
export function pickScriptFamily(code: string, text: string, country = "") {
  for (const [range, family] of BY_RANGE) if (range.test(text)) return family;
  const parts = code.split("|").filter((part) => NOTO[part]);
  const has = (part: string) => parts.includes(part);
  if (parts.length > 1) {
    if (has("ja-JP") && /[\u3040-\u30ff]/.test(text)) return NOTO["ja-JP"]!;
    if (has("ko-KR") && /[\uac00-\ud7af\u1100-\u11ff]/.test(text)) return NOTO["ko-KR"]!;
    const place = country.toLowerCase();
    const byCountry: Array<[RegExp, string]> = [
      [/taiwan/, "zh-TW"],
      [/hong kong|macao|macau/, "zh-HK"],
      [/japan/, "ja-JP"],
      [/korea/, "ko-KR"],
    ];
    for (const [pattern, part] of byCountry) if (pattern.test(place) && has(part)) return NOTO[part]!;
    if (has("zh-CN")) return NOTO["zh-CN"]!;
  }
  return NOTO[parts[0] ?? "unknown"] ?? NOTO.unknown!;
}

/** Fetch just the glyphs a non-Latin station name needs. Failure leaves them blank, never breaks the ticket. */
function scriptFontLoader(country: string) {
  return async (code: string, text: string) => {
    if (code === "emoji") return BLANK;
    const family = pickScriptFamily(code, text, country);
    const load = async () => {
      const css = await fetch(
        `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}&text=${encodeURIComponent(text)}`,
      ).then((res) => (res.ok ? res.text() : ""));
      const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
      if (!url) return [];
      const res = await fetch(url);
      if (!res.ok || (res.headers.get("content-type") ?? "").includes("text/")) return [];
      const data = await res.arrayBuffer();
      return [{ name: family, data, weight: 400 as const, style: "normal" as const }];
    };
    try {
      return (await withTimeout(load(), 4000)) ?? [];
    } catch {
      return [];
    }
  };
}

const ARABIC_SCRIPT = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]/;

/**
 * satori shapes Arabic letters correctly but lays the words out left to right,
 * so a name like "Radio Quran Kareem" came out as "Kareem Quran Radio". Put
 * the words in visual order: each run of Arabic-script words is reversed, and
 * runs of other words (digits, Latin) keep their own order. Hebrew is laid
 * out correctly already and is left alone.
 */
export function arabicVisualOrder(text: string) {
  if (!ARABIC_SCRIPT.test(text)) return text;
  const runs: Array<{ rtl: boolean; words: string[] }> = [];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const rtl = ARABIC_SCRIPT.test(word);
    const last = runs[runs.length - 1];
    if (last && last.rtl === rtl) last.words.push(word);
    else runs.push({ rtl, words: [word] });
  }
  return runs
    .map((run) => (run.rtl ? [...run.words].reverse() : run.words))
    .reverse()
    .map((words) => words.join(" "))
    .join(" ");
}

export async function renderTicketSvg(fields: TicketFields, format: TicketFormat, assets: TicketAssets) {
  const { width, height } = TICKET_SIZE[format];
  fields = { ...fields, name: arabicVisualOrder(fields.name), place: arabicVisualOrder(fields.place) };
  const node =
    format === "story" ? <StoryTicket fields={fields} keeper={assets.keeper} /> : <CardTicket fields={fields} keeper={assets.keeper} />;
  return satori(node, {
    width,
    height,
    fonts: assets.fonts,
    loadAdditionalAsset: scriptFontLoader(`${fields.place} ${fields.country ?? ""}`),
  });
}

export async function renderTicketPng(fields: TicketFields, format: TicketFormat, assets: TicketAssets) {
  const svg = await renderTicketSvg(fields, format, assets);
  const { Resvg } = await import("@resvg/resvg-js");
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: TICKET_SIZE[format].width },
    font: { loadSystemFonts: false },
  }).render().asPng();
  return png;
}
