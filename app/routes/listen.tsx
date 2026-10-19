import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { allStationShelfLabels } from "~/services/catalog/stationLabels.server";
import { BRAND } from "~/constants/brand";
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

/** Shelf labels (worked out offline by Jev) go out as plain words only, so the
 *  labels file with its confidences stays on the server. */
export const loader = (_args: LoaderFunctionArgs) =>
  json({ shelfLabels: allStationShelfLabels() }, { headers: { "Cache-Control": "private, no-store" } });

export default function DeskRoute() {
  return <ListenRedesign />;
}
