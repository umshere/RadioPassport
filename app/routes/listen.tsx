import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { allStationShelfLabels } from "~/services/catalog/stationLabels.server";
import { readRedesignFlag, redesignHeaders } from "~/services/redesign.server";
import { BRAND } from "~/constants/brand";
import { ListenLegacy } from "~/pages/ListenLegacy";
import { ListenRedesign } from "~/pages/ListenRedesign";

export const meta = () => [
  { name: "robots", content: "noindex, follow" },
  { title: `The desk · ${BRAND.name}` },
  {
    name: "description",
    content: "The keeper’s desk: the hour, the place and the sound of the station you are inside.",
  },
  { property: "og:title", content: `The desk · ${BRAND.name}` },
  {
    property: "og:description",
    content: "The keeper’s desk: the hour, the place and the sound of the station you are inside.",
  },
  { property: "og:url", content: "https://elsewheremusic.com/listen" },
];

/**
 * The redesign preview: `?redesign=1` shows the new desk (and sticks, see
 * redesign.server.ts); otherwise the old desk. The shelf labels (worked out
 * offline by Jev) are only read for the new desk, and only as plain words so
 * the labels file with its confidences stays on the server.
 */
export const loader = ({ request }: LoaderFunctionArgs) => {
  const flag = readRedesignFlag(request);
  return json(
    { redesign: flag.on, shelfLabels: flag.on ? allStationShelfLabels() : {} },
    { headers: redesignHeaders(flag, { "Cache-Control": "private, no-store" }) },
  );
};

export default function DeskRoute() {
  const { redesign } = useLoaderData<typeof loader>();
  return redesign ? <ListenRedesign /> : <ListenLegacy />;
}
