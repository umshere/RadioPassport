import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { BRAND } from "~/constants/brand";
import { HOME_NO_STORE, loadHomeBoard } from "~/services/home/homeBoard.server";
import { homeShelfData } from "~/services/home/homeShelves.server";
import { readRedesignFlag, redesignHeaders } from "~/services/redesign.server";
import { HomeLegacy } from "~/pages/HomeLegacy";
import { HomeRedesign } from "~/pages/HomeRedesign";

const LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://elsewheremusic.com/#site",
      name: "Elsewhere",
      url: "https://elsewheremusic.com/",
      description: "Live radio from someone else's now. Land in a city, stay long enough to be stamped.",
      inLanguage: "en",
    },
    {
      "@type": "WebApplication",
      name: "Elsewhere",
      url: "https://elsewheremusic.com/",
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Any (web browser)",
      description:
        "Live radio from cities that are awake without you. Pick a place on the globe, listen to a real local station and collect passport stamps.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      isPartOf: { "@id": "https://elsewheremusic.com/#site" },
    },
  ],
};

export const meta = () => [
  { title: "Elsewhere — Live radio from someone else's now" },
  {
    name: "description",
    content:
      "Live radio from cities that are awake without you. Pick a place on the globe, listen to a real local station, and stay long enough to be stamped.",
  },
  { tagName: "link", rel: "canonical", href: "https://elsewheremusic.com/" },
  { "script:ld+json": LD },
  { property: "og:title", content: "Elsewhere — You are not here." },
  {
    property: "og:description",
    content:
      "Live radio from cities that are awake without you. Land somewhere, stay long enough to be stamped.",
  },
  { property: "og:url", content: "https://elsewheremusic.com/" },
];

/**
 * Home ↔ theater crossings reuse the board: skip the 240-row refetch unless
 * the intent (search string) actually changed. Document loads always run.
 */
export function shouldRevalidate({
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}: {
  currentUrl: URL;
  nextUrl: URL;
  defaultShouldRevalidate: boolean;
}) {
  if (!defaultShouldRevalidate) return false;
  return currentUrl.search !== nextUrl.search;
}

export async function loader({ request }: LoaderFunctionArgs) {
  // boardSeed is per request, so the board deals a fresh window on every load
  // while the catalog itself comes from the short server-side cache.
  const boardSeed = Date.now();
  const flag = readRedesignFlag(request);
  const board = await loadHomeBoard();
  // The redesign's label shelves join the offline station labels to the live
  // pool here, on the server: no model call per visitor, and the labels never
  // ship whole. The old home does not need them.
  const shelfData = flag.on ? homeShelfData(board.stations) : null;
  return json(
    {
      ...board,
      boardSeed,
      redesign: flag.on,
      shelves: shelfData?.shelves ?? [],
      labels: shelfData?.labels ?? {},
    },
    { headers: redesignHeaders(flag, HOME_NO_STORE) },
  );
}

export default function IndexRoute() {
  const { redesign } = useLoaderData<typeof loader>();
  return redesign ? <HomeRedesign /> : <HomeLegacy />;
}
