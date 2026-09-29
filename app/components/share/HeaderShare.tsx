import { useHydrated } from "~/hooks/useHydrated";
import { usePlayerNoticeStore } from "~/state/playerNoticeStore";
import { usePlayerStore } from "~/state/playerStore";
import { VOICE } from "~/components/keeper/keeperVoice";
import { formatClock, localDateAtLongitude } from "~/utils/localTime";
import { shareStation } from "./shareStation";

/**
 * Share is never a hidden feature: while a station is loaded, this square sits
 * in the header on every page. One tap opens the phone's share sheet (or
 * copies the link) for the station you are hearing.
 */
export function HeaderShare() {
  const hydrated = useHydrated();
  const station = usePlayerStore((state) => state.nowPlaying);
  const setNotice = usePlayerNoticeStore((state) => state.setNotice);
  if (!hydrated || !station) return null;
  return (
    <button
      type="button"
      className="ew-site-share"
      aria-label={`${VOICE.share}: ${station.name}`}
      title={VOICE.share}
      onClick={async () => {
        const clock =
          typeof station.longitude === "number"
            ? formatClock(localDateAtLongitude(station.longitude))
            : null;
        const result = await shareStation(station, clock);
        if (result === "copied") setNotice({ kind: "info", message: VOICE.shared, durationMs: 3200 });
      }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" aria-hidden="true">
        <path d="M12 15V4" />
        <path d="M7.5 8.5 12 4l4.5 4.5" />
        <path d="M5 13v6h14v-6" />
      </svg>
    </button>
  );
}
