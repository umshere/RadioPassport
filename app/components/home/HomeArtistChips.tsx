import { useState } from "react";
import type { Station } from "~/types/radio";
import { VOICE } from "~/components/keeper/keeperVoice";
import { keeperAnchor } from "~/components/keeper/keeperRoamModel";
import { ARTIST_PHOTOS } from "./artistPhotos";
import { KEEPER_GROUPS, type KeeperRoute } from "./keeperRoute";

/**
 * Artists in chip order: global names first, the best known leading (see FAME), then regional ones by group. Listening
 * themes (old melodies, 90s hits, film songs) have no face, so they are not
 * chips.
 */
const FAME: readonly string[] = [
  "beatles", "michael-jackson", "queen", "elvis", "bob-marley", "pink-floyd",
  "led-zeppelin", "coldplay", "radiohead", "khruangbin",
];

function fameRank(id: string): number {
  const at = FAME.indexOf(id);
  return at === -1 ? FAME.length : at;
}

export function artistChips(routes: readonly KeeperRoute[]): KeeperRoute[] {
  return KEEPER_GROUPS.flatMap((group) =>
    routes
      .filter((route) => route.group === group && !route.id.startsWith("malayalam-"))
      .sort((a, b) => fameRank(a.id) - fameRank(b.id)),
  );
}

function Face({ id, label }: { id: string; label: string }) {
  const photo = ARTIST_PHOTOS[id];
  const [failed, setFailed] = useState(false);
  if (photo && !failed) {
    return (
      <img
        src={photo.src}
        alt=""
        width={64}
        height={64}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }
  return <b aria-hidden="true">{(label.match(/[\p{L}\p{N}]/u)?.[0] ?? "·").toUpperCase()}</b>;
}

/**
 * Artists as square photo chips in one sideways row, like playlists: tap a face
 * to tune the stream given to them. No paragraph, just faces and names.
 */
export function HomeArtistChips({
  routes,
  playingUuid,
  onPlay,
  pickUuid = null,
  pickAnchorName = null,
  keeperAt = null,
}: {
  routes: readonly KeeperRoute[];
  playingUuid: string | null;
  onPlay: (station: Station) => void;
  /** The chip the keeper may point at, and the anchor he stands on for it. */
  pickUuid?: string | null;
  pickAnchorName?: string | null;
  keeperAt?: string | null;
}) {
  const chips = artistChips(routes);
  if (chips.length === 0) return null;
  return (
    <section className="ew-artists" aria-label={VOICE.shelfArtistsTitle}>
      <h2 className="ew-artists-title">{VOICE.shelfArtistsTitle}</h2>
      <div className="ew-artists-row" role="list">
        {chips.map((route) => {
          const station = route.stops[0]!.station;
          const playing = route.stops.some((stop) => stop.station.uuid === playingUuid);
          const isPick = Boolean(pickAnchorName && station.uuid === pickUuid);
          return (
            <button
              type="button"
              role="listitem"
              key={route.id}
              className="ew-artist"
              aria-pressed={playing}
              data-pick={isPick && keeperAt === pickAnchorName ? "" : undefined}
              {...(isPick && pickAnchorName ? keeperAnchor(pickAnchorName) : {})}
              aria-label={VOICE.homeKeeperRouteTune(route.label)}
              onClick={() => onPlay(station)}
            >
              <span className="ew-artist-face" data-playing={playing || undefined}>
                <Face id={route.id} label={route.label} />
              </span>
              <span className="ew-artist-name">{route.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
