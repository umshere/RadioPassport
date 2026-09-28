import { Button } from "~/components/ui/Button";
import { Row } from "~/components/ui/Row";
import { StationRow } from "~/components/radio-passport/StationRow";
import type {
  CoverEmptyAction,
  CoverEmptyState,
} from "~/components/radio-passport/productFlow";
import type { Station } from "~/types/radio";

const SKELETON_ROWS = 6;

/** Six rows in the shape of what is coming: art tile, name, place. */
function StationSkeleton() {
  return (
    <>
      {Array.from({ length: SKELETON_ROWS }, (_, slot) => (
        <Row key={`pending-${slot}`} pending aria-hidden="true">
          <span className="rp-art ew-skel" />
          <span className="ew-skel-lines">
            <i style={{ width: `${68 - (slot % 3) * 10}%` }} />
            <i style={{ width: `${40 - (slot % 2) * 8}%` }} />
          </span>
        </Row>
      ))}
    </>
  );
}

/** What to say — and offer — when the board has nothing to show. */
function StationBoardEmpty({
  empty,
  onAction,
}: {
  empty: CoverEmptyState;
  onAction: (action: CoverEmptyAction) => void;
}) {
  return (
    <div className="py-8" role="status">
      <p className="text-sm text-dust">{empty.message}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {empty.actions.map((action) => (
          <Button
            key={action.id}
            variant={action.id === "atlas" ? "atlas" : "chip"}
            onClick={() => onAction(action)}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

/**
 * The live board: rows, or a skeleton while the first answer travels, or the
 * empty state. A refetch never flashes over rows already on screen — `loading`
 * only swaps in the skeleton when there is nothing to show yet, and aria-busy
 * carries the pending state otherwise.
 */
export function StationBoard({
  rows,
  loading,
  playingUuid,
  favoriteIds,
  onPlay,
  onFavorite,
  empty,
  onEmptyAction,
}: {
  rows: Station[];
  loading: boolean;
  /** uuid of the station that is on air right now, if any. */
  playingUuid: string | null;
  favoriteIds: string[];
  onPlay: (station: Station) => void;
  onFavorite: (station: Station) => void;
  /** Shown when the live list is empty and nothing is loading. */
  empty: CoverEmptyState | null;
  onEmptyAction: (action: CoverEmptyAction) => void;
}) {
  return (
    <>
      <div className="rp-station-list" aria-busy={loading}>
        {loading && rows.length === 0 ? (
          <StationSkeleton />
        ) : (
          rows.map((station, index) => (
            <StationRow
              key={station.uuid}
              station={station}
              active={playingUuid === station.uuid}
              favorite={favoriteIds.includes(station.uuid)}
              beat={index * 70}
              onPlay={() => onPlay(station)}
              onFavorite={() => onFavorite(station)}
            />
          ))
        )}
      </div>
      {empty && !loading ? (
        <StationBoardEmpty empty={empty} onAction={onEmptyAction} />
      ) : null}
    </>
  );
}
