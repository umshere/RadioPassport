import { Link, useRouteLoaderData } from "@remix-run/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { snapRest } from "./sheetSnap";
import { FlipBoard } from "~/components/radio-passport/FlipBoard";
import { Button } from "~/components/ui/Button";
import { useKeeperStore } from "~/state/keeperStore";
import { usePlayerStore } from "~/state/playerStore";
import { Keeper } from "./Keeper";
import { KeeperCounter } from "./KeeperCounter";
import { readKeeperFact } from "./keeperFactClient";
import { planMurmurs } from "./keeperMurmur";
import { VOICE } from "./keeperVoice";
import type { KeeperFacts } from "./keeperFacts";
import { skyHour } from "~/components/desk/deskModel";
import type { KeeperView } from "./useKeeper";

/** Root loader data: the one public flag the keeper reads. */
export function useKeeperAskEnabled(): boolean {
  const data = useRouteLoaderData("root") as { keeperAskEnabled?: boolean } | undefined;
  return Boolean(data?.keeperAskEnabled);
}

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/** Where the dock (or band) begins, as px from the viewport bottom. */
function dockFloor(): number {
  const dock = document.querySelector<HTMLElement>(".rp-dock");
  if (!dock) return 0;
  return Math.max(0, window.innerHeight - dock.getBoundingClientRect().top);
}

/**
 * The keeper's counter: a bottom sheet over the page on the phone that stops
 * at the top of the dock (the transport stays in reach), a quiet side panel on
 * desktop. It is as tall as what he is saying; drag the header up for all the
 * room, down to put it away. Dialog semantics: focus moves in and is trapped,
 * Esc closes, focus returns to the keeper.
 */
export function KeeperSheet({ view }: { view: KeeperView & { facts: KeeperFacts } }) {
  const { facts } = view;
  const askEnabled = useKeeperAskEnabled();
  const closeSheet = useKeeperStore((state) => state.closeSheet);
  const factLog = useKeeperStore((state) => state.factLog);
  const nowStation = usePlayerStore((state) => state.nowPlaying);
  const stationId = nowStation?.uuid ?? null;
  const entries = stationId && factLog.stationId === stationId ? factLog.entries : [];
  const sheetRef = useRef<HTMLElement>(null);
  const [floor, setFloor] = useState(0);
  const [rest, setRest] = useState<"open" | "tall">("open");
  const [dragY, setDragY] = useState<number | null>(null);
  const drag = useRef<{ startY: number; startT: number; moved: boolean } | null>(null);
  const paused = view.hasStation && !view.present;

  // The sheet stands on the dock, never over it.
  useLayoutEffect(() => {
    const update = () => setFloor(dockFloor());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Opened with nothing read yet? Read up on the place and the country now,
  // so the topic moves have something to say at once.
  useEffect(() => {
    if (!askEnabled || !stationId) return;
    const held = useKeeperStore.getState().factLog;
    if (held.stationId === stationId && held.entries.length >= 2) return;
    for (const step of planMurmurs(facts)) {
      if (step.type === "fact") void readKeeperFact(stationId, step.kind, step.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [askEnabled, stationId]);

  const close = useCallback(() => {
    closeSheet();
  }, [closeSheet]);

  // Focus in, trap, Esc, focus back to the keeper.
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const previous = document.activeElement as HTMLElement | null;
    const first =
      // Not the input: focusing a text field would raise the phone keyboard
      // the moment the sheet opens.
      sheet.querySelector<HTMLElement>(".ew-keeper-close") ?? sheet.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const items = Array.from(sheet.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (node) => node.offsetParent !== null,
      );
      const head = items[0];
      const tail = items[items.length - 1];
      if (!head || !tail) return;
      const active = document.activeElement;
      if (event.shiftKey && (active === head || !sheet.contains(active))) {
        event.preventDefault();
        tail.focus();
      } else if (!event.shiftKey && (active === tail || !sheet.contains(active))) {
        event.preventDefault();
        head.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.requestAnimationFrame(() => {
        // Only a real close hands focus back (a dev StrictMode re-run of
        // this effect must not pull focus out of an open sheet).
        if (useKeeperStore.getState().sheetOpen) return;
        const keeper = document.querySelector<HTMLElement>(".ew-keeper-float button");
        (keeper ?? previous)?.focus?.({ preventScroll: true });
      });
    };
  }, [close]);

  const place = facts.city || facts.station.country;
  const when = paused ? VOICE.headerPaused : facts.hour ? facts.hour.clock : VOICE.hourUnknownShort;
  const where = [place, when].filter(Boolean).join(" · ");
  const title = `${VOICE.keeperTitle} · ${where}`;

  return (
    <div className="ew-keeper-layer" style={{ ["--keeper-floor" as string]: `${floor}px` }}>
      <div className="ew-keeper-scrim" aria-hidden="true" onClick={close} />
      <section
        ref={sheetRef}
        className="ew-keeper-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ew-keeper-title"
        aria-describedby="ew-keeper-line"
        data-state={view.state}
        data-rest={rest}
        style={
          dragY !== null
            ? { transform: `translateY(${dragY}px)`, transition: "none", animation: "none" }
            : undefined
        }
        // A field in focus means a keyboard: give the counter all the room.
        onFocus={(event) => {
          if (event.target instanceof HTMLInputElement) setRest("tall");
        }}
      >
        <header
          className="ew-keeper-top"
          data-hour={skyHour(facts.hour?.solar)}
          onPointerDown={(event) => {
            if ((event.target as HTMLElement).closest("a, button, input")) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            drag.current = { startY: event.clientY, startT: performance.now(), moved: false };
          }}
          onPointerMove={(event) => {
            const start = drag.current;
            if (!start) return;
            const travel = event.clientY - start.startY;
            if (Math.abs(travel) > 4) start.moved = true;
            setDragY(Math.max(0, travel));
          }}
          onPointerUp={(event) => {
            const start = drag.current;
            drag.current = null;
            setDragY(null);
            if (!start?.moved) return;
            const travel = event.clientY - start.startY;
            const velocity = travel / Math.max(1, performance.now() - start.startT);
            const next = snapRest(travel, velocity, rest);
            if (next === "closed") close();
            else setRest(next);
          }}
          onPointerCancel={() => {
            drag.current = null;
            setDragY(null);
          }}
        >
          <i className="ew-keeper-grip-bar" aria-hidden="true" />
          <Keeper state={view.state} mood={view.mood} size="sheet" />
          <h2 id="ew-keeper-title" className="ew-keeper-eyebrow">
            <span className="sr-only">{title}</span>
            <span aria-hidden="true">{VOICE.keeperTitle}</span>
            {where ? <FlipBoard text={where} className="is-meta" /> : null}
          </h2>
          {/* SPA link: the audio bridge in root keeps playing. */}
          <Link to="/listen" className="ew-keeper-door" onClick={close}>
            {VOICE.deskDoor}
          </Link>
          <Button variant="text" className="ew-keeper-close" onClick={close}>
            Close
          </Button>
        </header>
        <KeeperCounter
          facts={facts}
          askEnabled={askEnabled}
          surface="sheet"
          plate={view.plate}
          paused={paused}
          entries={entries}
          onLeave={close}
          idPrefix="ew-keeper"
        />
      </section>
    </div>
  );
}
