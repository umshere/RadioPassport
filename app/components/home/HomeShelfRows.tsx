import { useState } from "react";
import { VOICE } from "~/components/keeper/keeperVoice";
import { keeperAnchor } from "~/components/keeper/keeperRoamModel";
import type { Trip } from "~/state/tripsStore";
import { CardRow, type CardActions } from "./HomeCard";
import type { HomeShelf, ShelfCard, TourStop } from "./homeShelves";

/** The pick the keeper may point at on this shelf, if any. */
function stopFor(stops: TourStop[], shelfId: string) {
  return stops.find((stop) => stop.shelfId === shelfId) ?? null;
}

/** One shelf: a title, an honest "why", a count, and a row of cards. */
export function HomeShelfRow({
  shelf,
  stops,
  actions,
}: {
  shelf: HomeShelf;
  stops: TourStop[];
  actions: CardActions;
}) {
  const stop = stopFor(stops, shelf.id);
  const titleId = `ew-shelf-${shelf.id}`;
  return (
    <section className="ew-shelf" data-kind={shelf.kind} aria-labelledby={titleId} {...keeperAnchor(`shelf-${shelf.id}`)}>
      <header className="ew-shelf-head">
        <div className="ew-shelf-words">
          <h2 id={titleId} className="ew-shelf-title">
            {shelf.title}
          </h2>
          <p className="ew-shelf-why">{shelf.why}</p>
        </div>
        <span className="ew-shelf-count">{VOICE.shelfCount(shelf.count)}</span>
      </header>
      <CardRow
        cards={shelf.cards}
        label={shelf.title}
        pickUuid={stop?.card.station.uuid ?? null}
        pickAnchorName={stop?.anchor ?? null}
        actions={actions}
      />
    </section>
  );
}

export type YoursTab = "saved" | "recent" | `trip:${string}`;

/**
 * Your stations: the hearts, the stations you boarded lately, and any trips
 * you made. All of it lives in this browser; none of it needs setting up.
 */
export function HomeYours({
  tab,
  onTab,
  saved,
  recent,
  trips,
  tripCards,
  onCreateTrip,
  onDeleteTrip,
  stops,
  actions,
  onFind,
}: {
  tab: YoursTab;
  onTab: (tab: YoursTab) => void;
  saved: ShelfCard[];
  recent: ShelfCard[];
  trips: Trip[];
  tripCards: (trip: Trip) => ShelfCard[];
  onCreateTrip: (name: string) => string | null;
  onDeleteTrip: (id: string) => void;
  stops: TourStop[];
  actions: CardActions;
  /** The empty state's way back to the live board. */
  onFind: () => void;
}) {
  const [naming, setNaming] = useState(false);
  const [draft, setDraft] = useState("");
  const trip = tab.startsWith("trip:") ? trips.find((item) => `trip:${item.id}` === tab) ?? null : null;
  const current: YoursTab = trip ? tab : tab === "recent" ? "recent" : "saved";
  const cards = trip ? tripCards(trip) : current === "recent" ? recent : saved;
  const empty = trip
    ? VOICE.yoursTripEmpty(trip.name)
    : current === "recent"
      ? VOICE.yoursRecentEmpty
      : VOICE.yoursSavedEmpty;
  const stop = stopFor(stops, "yours");
  const tabs: Array<{ id: YoursTab; label: string; count: number }> = [
    { id: "saved", label: VOICE.yoursSaved, count: saved.length },
    { id: "recent", label: VOICE.yoursRecent, count: recent.length },
    ...trips.map((item) => ({ id: `trip:${item.id}` as YoursTab, label: item.name, count: item.stations.length })),
  ];

  if (!saved.length && !recent.length && !trips.length) {
    return (
      <section className="ew-yours is-empty" aria-labelledby="ew-yours-title" {...keeperAnchor("shelf-yours")}>
        <header className="ew-yours-head">
          <h2 id="ew-yours-title" className="ew-shelf-title">
            {VOICE.yoursTitle}
          </h2>
          <p className="ew-yours-empty-line">{VOICE.yoursSavedEmpty}</p>
          <button type="button" className="ew-yours-tab ew-yours-find" onClick={onFind}>
            {VOICE.yoursFind} <span aria-hidden="true">→</span>
          </button>
        </header>
      </section>
    );
  }

  return (
    <section className="ew-yours" aria-labelledby="ew-yours-title" {...keeperAnchor("shelf-yours")}>
      <header className="ew-yours-head">
        <h2 id="ew-yours-title" className="ew-shelf-title">
          {VOICE.yoursTitle}
        </h2>
        <div className="ew-yours-tabbar">
          <div className="ew-yours-tabs" role="group" aria-label={VOICE.yoursTitle}>
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                id={`ew-yours-tab-${item.id}`}
                aria-pressed={current === item.id}
                aria-controls="ew-yours-panel"
                className="ew-yours-tab"
                onClick={() => onTab(item.id)}
              >
                {item.label}
                {item.count ? <small>{item.count}</small> : null}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="ew-yours-tab is-new"
            aria-expanded={naming}
            onClick={() => setNaming((value) => !value)}
          >
            {VOICE.yoursNewTrip}
          </button>
        </div>
      </header>
      {naming ? (
        <form
          className="ew-yours-new"
          onSubmit={(event) => {
            event.preventDefault();
            const id = onCreateTrip(draft);
            if (!id) return;
            setDraft("");
            setNaming(false);
            onTab(`trip:${id}`);
          }}
        >
          <label htmlFor="ew-yours-trip-name">{VOICE.yoursTripName}</label>
          <input
            id="ew-yours-trip-name"
            value={draft}
            maxLength={40}
            autoFocus
            placeholder={VOICE.yoursTripPlaceholder}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" className="ew-home-action" disabled={!draft.trim()}>
            {VOICE.yoursTripCreate}
          </button>
          <p>{VOICE.yoursTripHint}</p>
        </form>
      ) : null}
      <div id="ew-yours-panel" className="ew-yours-panel">
        {cards.length ? (
          <CardRow
            cards={cards}
            label={tabs.find((item) => item.id === current)?.label ?? VOICE.yoursTitle}
            pickUuid={current === "saved" ? stop?.card.station.uuid ?? null : null}
            pickAnchorName={current === "saved" ? stop?.anchor ?? null : null}
            actions={actions}
          />
        ) : (
          <p className="ew-yours-empty">{empty}</p>
        )}
        {trip ? (
          <button type="button" className="ew-yours-remove" onClick={() => onDeleteTrip(trip.id)}>
            {VOICE.yoursTripRemove}
          </button>
        ) : null}
      </div>
    </section>
  );
}
