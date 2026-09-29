import { useHydrated } from "~/hooks/useHydrated";
import { usePlayerStore } from "~/state/playerStore";
import { VOICE } from "~/components/keeper/keeperVoice";
import { formatClock, localDateAtLongitude } from "~/utils/localTime";
import { shareStation } from "./shareStation";
import { TicketSheet } from "./TicketSheet";

/**
 * Share is never a hidden feature: while a station is loaded, this square sits
 * in the header on every page. One tap opens the ticket sheet for the station
 * you are hearing. The header is on every page, so it also hosts the one
 * ticket sheet (portalled to <body>) that every other share control opens.
 */
export function HeaderShare() {
  const hydrated = useHydrated();
  const station = usePlayerStore((state) => state.nowPlaying);
  if (!hydrated) return null;
  return (
    <>
      {station ? (
        <button
          type="button"
          className="ew-site-share"
          aria-label={`${VOICE.share}: ${station.name}`}
          aria-haspopup="dialog"
          title={VOICE.share}
          onClick={() => {
            const clock =
              typeof station.longitude === "number"
                ? formatClock(localDateAtLongitude(station.longitude))
                : null;
            void shareStation(station, clock);
          }}
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" aria-hidden="true">
            <path d="M12 15V4" />
            <path d="M7.5 8.5 12 4l4.5 4.5" />
            <path d="M5 13v6h14v-6" />
          </svg>
        </button>
      ) : null}
      <TicketSheet />
    </>
  );
}
