import { useState } from "react";
import { FlipBoard } from "~/components/radio-passport/FlipBoard";
import { shortCountry, stationLocation } from "~/components/radio-passport/StationRow";
import type {
  CoverEmptyAction,
  CoverEmptyState,
} from "~/components/radio-passport/productFlow";
import { tidyStationName } from "~/components/keeper/keeperFacts";
import { VOICE } from "~/components/keeper/keeperVoice";
import { postmarkDate } from "~/components/desk/deskModel";
import type { PassportStamp } from "~/state/journeyStore";
import type { Station } from "~/types/radio";
import { flapLine, type HomeDeparture, type HomePhase } from "./homeModel";

const SKELETON_ROWS = 6;

/**
 * The station's own logo when it has one that loads; otherwise its first
 * letter on the hour's tint, so every row keeps the same square.
 */
function StationMark({ station, name }: { station: Station; name: string }) {
  const [failed, setFailed] = useState(false);
  const src = station.favicon?.trim().replace(/^http:\/\//i, "https://");
  const letter = (name.match(/[\p{L}\p{N}]/u)?.[0] ?? "·").toUpperCase();
  return (
    <span className="ew-board-mark" data-logo={src && !failed ? "" : undefined} aria-hidden="true">
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      ) : (
        <b>{letter}</b>
      )}
    </span>
  );
}

function Heart({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter">
      <path d="M12 20 4.2 12.2a4.6 4.6 0 0 1 6.5-6.5L12 7l1.3-1.3a4.6 4.6 0 0 1 6.5 6.5z" />
    </svg>
  );
}

/**
 * The departures board, inline: every row is a city on the air right now, its
 * local time on split flaps, tinted by its hour. Tap a row to board it; the
 * heart keeps it. Under the board, the last three stamps as postcards (only
 * once there are stamps); they open the passport.
 */
export function HomeDepartures({
  phase,
  heading,
  countLabel,
  rows,
  loading,
  playingUuid,
  favoriteIds,
  onPlay,
  onFavorite,
  empty,
  onEmptyAction,
  onShuffle,
  shuffleKey,
  canMore,
  onMore,
  stamps,
  onOpenPassport,
  notice,
}: {
  phase: HomePhase;
  heading: string;
  countLabel: string;
  rows: HomeDeparture[];
  loading: boolean;
  playingUuid: string | null;
  favoriteIds: string[];
  onPlay: (station: Station) => void;
  onFavorite: (station: Station) => void;
  empty: CoverEmptyState | null;
  onEmptyAction: (action: CoverEmptyAction) => void;
  onShuffle: () => void;
  shuffleKey: number;
  canMore: boolean;
  onMore: () => void;
  stamps: PassportStamp[];
  onOpenPassport: () => void;
  /** A retry line for a failed mix, when there is one. */
  notice?: React.ReactNode;
}) {
  const showEmpty = phase === "empty" && empty && !loading;
  const canShuffle = phase === "arrive" || phase === "aboard";
  return (
    <>
      <section
        className="ew-home-board"
        id="live-board"
        data-phase={phase}
        aria-labelledby="ew-home-board-title"
      >
        <header className="ew-home-board-head">
          <h2 id="ew-home-board-title" className="ew-home-board-title">
            {phase === "aboard" || phase === "seek" ? (
              <i className="ew-home-live" aria-hidden="true" />
            ) : null}
            <FlipBoard text={flapLine(heading, 30)} className="is-heading" />
            <span className="sr-only">{heading}</span>
          </h2>
          {/* While seeking the heading already flaps the count: the status
              still speaks it, once, without printing it twice. */}
          <span
            className={`ew-home-board-count${phase === "seek" ? " sr-only" : ""}`}
            role="status"
            aria-live="polite"
          >
            {countLabel}
          </span>
          {canShuffle ? (
            <button
              type="button"
              className="ew-home-fresh"
              onClick={onShuffle}
              aria-label="Show fresh stations"
              title={VOICE.homeFresh}
            >
              <svg
                key={shuffleKey}
                className="ew-home-fresh-icon"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                <path d="M20 12a8 8 0 1 1-2.34-5.66" />
                <path d="M20 3v4h-4" />
              </svg>
              <span>{VOICE.homeFresh}</span>
            </button>
          ) : null}
        </header>
        {notice}

        {showEmpty ? (
          <div className="ew-home-empty" role="status">
            <ol className="ew-board">
              <li className="ew-home-dep">
                <span className="ew-board-row is-empty" data-hour="unknown">
                  <span className="ew-board-time" aria-hidden="true">
                    <FlipBoard text="--:--" className="is-board" />
                  </span>
                  <span className="ew-board-dest">
                    <FlipBoard text={VOICE.homeNoDepartures} className="is-board" />
                  </span>
                </span>
              </li>
            </ol>
            <p className="ew-home-empty-line">{empty.message}</p>
            <div className="ew-home-empty-actions">
              {empty.actions.map((action) => (
                <button
                  type="button"
                  key={action.id}
                  className="ew-home-action"
                  onClick={() => onEmptyAction(action)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        ) : loading && rows.length === 0 ? (
          <ol className="ew-board" aria-busy="true">
            {Array.from({ length: SKELETON_ROWS }, (_, slot) => (
              <li key={`pending-${slot}`} className="ew-home-dep" aria-hidden="true">
                <span className="ew-board-row is-pending">
                  <span className="ew-skel-lines">
                    <i style={{ width: `${68 - (slot % 3) * 10}%` }} />
                    <i style={{ width: `${40 - (slot % 2) * 8}%` }} />
                  </span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <ol className="ew-board" aria-busy={loading || undefined}>
            {rows.map(({ station, clock, solar }) => {
              const where = stationLocation(station);
              const name = tidyStationName(station.name);
              const country = shortCountry(station.country || "");
              // City and country once each; never the country twice.
              const place = country && country !== shortCountry(where) ? `${where} · ${country}` : where;
              const live = playingUuid === station.uuid;
              const kept = favoriteIds.includes(station.uuid);
              return (
                <li key={station.uuid} className="ew-home-dep" data-live={live || undefined}>
                  <button
                    type="button"
                    className="ew-board-row"
                    data-hour={solar?.toLowerCase() ?? "unknown"}
                    aria-current={live || undefined}
                    onClick={() => onPlay(station)}
                    aria-label={`${VOICE.board}: ${name}, ${where}${clock ? `, ${clock} there` : ""}`}
                  >
                    <span className="ew-board-time" aria-hidden="true">
                      <FlipBoard text={clock ?? "--:--"} className="is-board" />
                      {solar ? <i className="ew-board-hour">{solar}</i> : null}
                    </span>
                    <StationMark station={station} name={name} />
                    <span className="ew-board-dest">
                      <b>{name}</b>
                      <small>{place}</small>
                    </span>
                    <span className="ew-board-go" aria-hidden="true">
                      {live ? VOICE.deskLive : `${VOICE.board} →`}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="ew-home-heart"
                    aria-pressed={kept}
                    aria-label={kept ? `Let go of ${name}` : `Keep ${name}`}
                    onClick={() => onFavorite(station)}
                  >
                    <Heart on={kept} />
                  </button>
                </li>
              );
            })}
          </ol>
        )}

        {canMore ? (
          <button type="button" className="ew-home-more" onClick={onMore}>
            {VOICE.homeMore} <span aria-hidden="true">↓</span>
          </button>
        ) : null}
      </section>

      {stamps.length ? (
        <section className="ew-home-stamps" aria-labelledby="ew-home-stamps-title">
          <header className="ew-home-board-head">
            <h2 id="ew-home-stamps-title" className="ew-desk-card-title">
              {VOICE.homeRecent}
            </h2>
          </header>
          <ol className="ew-home-stamps-list">
            {stamps.slice(0, 3).map((stamp) => (
              <li key={stamp.id}>
                <button
                  type="button"
                  className="ew-postcard ew-home-stamp"
                  onClick={onOpenPassport}
                  aria-label={`${stamp.city}: ${VOICE.homeRecentOpen}`}
                >
                  <span className="ew-postmark" aria-hidden="true">
                    <b>{stamp.countryCode || "EW"}</b>
                    <i>{postmarkDate(new Date(stamp.stampedAt))}</i>
                  </span>
                  <span className="ew-postcard-topic">{stamp.country || VOICE.stampedHere}</span>
                  <span className="ew-home-stamp-city">{stamp.city}</span>
                  <span className="ew-home-stamp-station">{tidyStationName(stamp.stationName)}</span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </>
  );
}
