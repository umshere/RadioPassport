import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { tidyStationName } from "~/components/keeper/keeperFacts";
import { VOICE } from "~/components/keeper/keeperVoice";
import { keeperAnchor } from "~/components/keeper/keeperRoamModel";
import { tripHas, useTripsStore } from "~/state/tripsStore";
import type { Station } from "~/types/radio";
import { Heart, StationMark } from "./HomeDepartures";
import { cardPlace, type ShelfCard } from "./homeShelves";

export type CardActions = {
  playingUuid: string | null;
  favoriteIds: string[];
  /** The anchor the keeper is standing on right now (his pick lights up). */
  keeperAt: string | null;
  onPlay: (station: Station) => void;
  onFavorite: (station: Station) => void;
  onTrip: (station: Station, from: HTMLElement) => void;
};

function PlusGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** The heart and the trip button, shared by cards and board rows. */
export function KeepButtons({
  station,
  kept,
  onFavorite,
  onTrip,
  className,
}: {
  station: Station;
  kept: boolean;
  onFavorite: (station: Station) => void;
  onTrip: (station: Station, from: HTMLElement) => void;
  className: string;
}) {
  const name = tidyStationName(station.name);
  return (
    <>
      <button
        type="button"
        className={className}
        aria-pressed={kept}
        aria-label={kept ? `Let go of ${name}` : `Keep ${name}`}
        onClick={() => onFavorite(station)}
      >
        <Heart on={kept} />
      </button>
      <button
        type="button"
        className={`${className} is-trip`}
        aria-haspopup="dialog"
        aria-label={`${VOICE.tripAdd}: ${name}`}
        title={VOICE.tripAdd}
        onClick={(event) => onTrip(station, event.currentTarget)}
      >
        <PlusGlyph />
      </button>
    </>
  );
}

/**
 * One station on a shelf: its mark, its local time tinted by the hour there,
 * its name, its place and one label of its own. Tap to board; the heart and
 * the + sit apart so a tap never does two things.
 */
export function StationCard({
  card,
  anchor,
  actions,
}: {
  card: ShelfCard;
  /** Set when the keeper may point at this card. */
  anchor?: string | null;
  actions: CardActions;
}) {
  const { station, clock, solar, label } = card;
  const name = tidyStationName(station.name);
  const place = cardPlace(station);
  const live = actions.playingUuid === station.uuid;
  const kept = actions.favoriteIds.includes(station.uuid);
  const picked = Boolean(anchor && actions.keeperAt === anchor);
  return (
    <li
      className="ew-card"
      data-hour={solar?.toLowerCase() ?? "unknown"}
      data-live={live || undefined}
      data-pick={picked || undefined}
      {...(anchor ? keeperAnchor(anchor) : {})}
    >
      <button
        type="button"
        className="ew-card-board"
        aria-current={live || undefined}
        onClick={() => actions.onPlay(station)}
        aria-label={`${VOICE.board}: ${name}, ${place}${clock ? `, ${clock} there` : ""}${label ? `, ${label}` : ""}`}
      >
        <span className="ew-card-top">
          <StationMark station={station} name={name} />
          <span className="ew-card-time" aria-hidden="true">
            <b>{clock ?? "--:--"}</b>
            {solar ? <i>{solar}</i> : null}
          </span>
        </span>
        <b className="ew-card-name">{name}</b>
        <small className="ew-card-place">{place}</small>
        {label ? <span className="ew-card-label">{label}</span> : <span className="ew-card-label is-blank" aria-hidden="true" />}
        <span className="ew-card-go" aria-hidden="true">
          {live ? VOICE.deskLive : `${VOICE.board} →`}
        </span>
      </button>
      <div className="ew-card-tools">
        <KeepButtons
          station={station}
          kept={kept}
          onFavorite={actions.onFavorite}
          onTrip={actions.onTrip}
          className="ew-card-tool"
        />
      </div>
    </li>
  );
}

/** A horizontal row of cards: scrolls sideways, keeps its own focus order. */
export function CardRow({
  cards,
  label,
  pickUuid,
  pickAnchorName,
  actions,
}: {
  cards: ShelfCard[];
  label: string;
  pickUuid?: string | null;
  pickAnchorName?: string | null;
  actions: CardActions;
}) {
  return (
    <ol className="ew-card-row" aria-label={label}>
      {cards.map((card) => (
        <StationCard
          key={card.station.uuid}
          card={card}
          anchor={pickUuid === card.station.uuid ? pickAnchorName : null}
          actions={actions}
        />
      ))}
    </ol>
  );
}

/**
 * Add a station to a trip: a small panel by the + it came from. Lists the
 * trips (tap to add or take out) and makes a new one in place. Escape or a
 * tap outside closes it.
 */
export function TripPicker({
  station,
  from,
  onClose,
}: {
  station: Station;
  from: HTMLElement;
  onClose: () => void;
}) {
  const trips = useTripsStore((state) => state.trips);
  const createTrip = useTripsStore((state) => state.createTrip);
  const toggleStation = useTripsStore((state) => state.toggleStation);
  const [draft, setDraft] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<CSSProperties>({ visibility: "hidden" });
  const name = tidyStationName(station.name);

  useEffect(() => {
    const place = () => {
      const rect = from.getBoundingClientRect();
      const width = Math.min(280, window.innerWidth - 32);
      const left = Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16));
      const panel = panelRef.current?.offsetHeight ?? 220;
      const below = rect.bottom + 6;
      const top = below + panel > window.innerHeight - 16 ? Math.max(16, rect.top - panel - 6) : below;
      setBox({ left, top, width });
    };
    place();
    const close = (event: Event) => {
      if (panelRef.current?.contains(event.target as Node) || from.contains(event.target as Node)) return;
      onClose();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        from.focus();
      }
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", onClose, { capture: true, passive: true });
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    panelRef.current?.querySelector<HTMLElement>("button, input")?.focus();
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", onClose, { capture: true });
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", key);
    };
  }, [from, onClose]);

  const make = () => {
    const id = createTrip(draft);
    if (!id) return;
    toggleStation(id, station);
    setDraft("");
  };

  return createPortal(
    <div
      ref={panelRef}
      className="ew-trip-picker"
      role="dialog"
      aria-label={`${VOICE.tripAdd}: ${name}`}
      style={box}
    >
      <p className="ew-trip-picker-title">{VOICE.tripAdd}</p>
      {trips.length ? (
        <ul className="ew-trip-picker-list">
          {trips.map((trip) => {
            const has = tripHas(trip, station.uuid);
            return (
              <li key={trip.id}>
                <button
                  type="button"
                  className="ew-trip-picker-item"
                  aria-pressed={has}
                  onClick={() => toggleStation(trip.id, station)}
                >
                  <span aria-hidden="true">{has ? "✓" : "+"}</span>
                  {trip.name}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      <form
        className="ew-trip-picker-new"
        onSubmit={(event) => {
          event.preventDefault();
          make();
        }}
      >
        <label className="sr-only" htmlFor="ew-trip-picker-name">
          {VOICE.tripMenuNew}
        </label>
        <input
          id="ew-trip-picker-name"
          value={draft}
          maxLength={40}
          placeholder={VOICE.tripMenuNew}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" disabled={!draft.trim()}>
          {VOICE.tripMenuCreate}
        </button>
      </form>
    </div>,
    document.body,
  );
}
