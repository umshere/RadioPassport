import { useState } from "react";
import type { Station } from "~/types/radio";
import { VOICE } from "~/components/keeper/keeperVoice";
import { ARTIST_PHOTOS } from "./artistPhotos";
import { KEEPER_GROUPS, type KeeperRoute } from "./keeperRoute";

/**
 * Artists in chip order: Malayalam first, then the rest by group. Listening
 * themes (old melodies, 90s hits, film songs) have no face, so they are not
 * chips.
 */
export function artistChips(routes: readonly KeeperRoute[]): KeeperRoute[] {
  return KEEPER_GROUPS.flatMap((group) =>
    routes.filter((route) => route.group === group && !route.id.startsWith("malayalam-")),
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
 * Artists as round photo chips in one sideways row, like playlists: tap a face
 * to tune the stream given to them. No paragraph, just faces and names.
 */
export function HomeArtistChips({
  routes,
  playingUuid,
  onPlay,
}: {
  routes: readonly KeeperRoute[];
  playingUuid: string | null;
  onPlay: (station: Station) => void;
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
          return (
            <button
              type="button"
              role="listitem"
              key={route.id}
              className="ew-artist"
              aria-pressed={playing}
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
