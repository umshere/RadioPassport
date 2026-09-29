import type { TicketAssets, TicketFont } from "./renderTicket.server";

/**
 * The ticket's fonts (Newsreader, Azeret Mono: both SIL OFL, Latin + Latin-ext
 * subsets) and the Keeper sprite live in /public and are fetched from our own
 * origin once per warm function. Nothing is bundled into the server build, so
 * the function stays small.
 */
export const TICKET_FONT_FILES: Array<Omit<TicketFont, "data"> & { file: string }> = [
  { name: "Newsreader", weight: 400, style: "italic", file: "Newsreader-400-italic" },
  { name: "Newsreader", weight: 500, style: "italic", file: "Newsreader-500-italic" },
  { name: "Newsreader", weight: 400, style: "normal", file: "Newsreader-400" },
  { name: "Azeret Mono", weight: 400, style: "normal", file: "AzeretMono-400" },
  { name: "Azeret Mono", weight: 500, style: "normal", file: "AzeretMono-500" },
].flatMap((font) =>
  ["latin", "latin-ext"].map((subset) => ({
    name: font.name as TicketFont["name"],
    weight: font.weight as TicketFont["weight"],
    style: font.style as TicketFont["style"],
    file: `/fonts/ticket/${font.file}-${subset}.woff`,
  })),
);

export const TICKET_KEEPER_FILE = "/keeper/ticket-keeper.png";

let cache: { origin: string; assets: Promise<TicketAssets> } | null = null;

async function read(origin: string, path: string, fetcher: typeof fetch) {
  const res = await fetcher(new URL(path, origin));
  if (!res.ok) throw new Error(`ticket asset ${path}: ${res.status}`);
  return res.arrayBuffer();
}

export function toDataUri(bytes: ArrayBuffer | Uint8Array, type = "image/png") {
  return `data:${type};base64,${Buffer.from(bytes as ArrayBuffer).toString("base64")}`;
}

export function loadTicketAssets(origin: string, fetcher: typeof fetch = fetch): Promise<TicketAssets> {
  if (cache && cache.origin === origin) return cache.assets;
  const assets = (async () => {
    const [fonts, keeper] = await Promise.all([
      Promise.all(
        TICKET_FONT_FILES.map(async ({ file, ...font }) => ({ ...font, data: await read(origin, file, fetcher) })),
      ),
      read(origin, TICKET_KEEPER_FILE, fetcher)
        .then((bytes) => toDataUri(bytes))
        .catch(() => null),
    ]);
    return { fonts, keeper };
  })();
  cache = { origin, assets };
  // A failed load is not cached: the next request tries again.
  assets.catch(() => {
    if (cache?.assets === assets) cache = null;
  });
  return assets;
}
