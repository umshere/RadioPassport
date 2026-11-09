import { VOICE } from "~/components/keeper/keeperVoice";
import { homeDepartures } from "./homeModel";
import type { HomeShelf, ShelfCard } from "./homeShelves";
import { KEEPER_GROUPS, type KeeperRoute } from "./keeperRoute";

/**
 * The artist trails as one shelf of cards, like every other shelf on Home:
 * one stream given to each artist, Malayalam first. The card's label is the
 * group; its name is the artist (two-stop routes keep the station's name too).
 */
export function buildArtistShelf(routes: readonly KeeperRoute[], now = new Date()): HomeShelf | null {
  const ordered = KEEPER_GROUPS.flatMap((group) => routes.filter((route) => route.group === group));
  const named = ordered.flatMap((route) =>
    route.stops.map((stop) => ({
      group: route.group,
      station: {
        ...stop.station,
        name: route.stops.length > 1 ? `${route.label} · ${stop.name}` : route.label,
      },
    })),
  );
  if (named.length === 0) return null;
  const groupOf = new Map(named.map(({ station, group }) => [station.uuid, group]));
  const cards: ShelfCard[] = homeDepartures(
    named.map(({ station }) => station),
    now,
  ).map((row) => ({ ...row, label: VOICE.homeKeeperGroups[groupOf.get(row.station.uuid)!] }));
  return {
    id: "artists",
    kind: "artists",
    title: VOICE.shelfArtistsTitle,
    why: VOICE.shelfArtistsWhy,
    count: cards.length,
    cards,
  };
}
