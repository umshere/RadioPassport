import { Button } from "~/components/ui/Button";
import { usePlayerNoticeStore } from "~/state/playerNoticeStore";
import type { Station } from "~/types/radio";
import { VOICE } from "~/components/keeper/keeperVoice";
import { shareStation } from "./shareStation";

/** "Send this station to a friend": the share sheet, or a copied link. */
export function ShareButton({
  station,
  clock,
  className,
}: {
  station: Pick<Station, "uuid" | "name" | "city" | "country">;
  clock?: string | null;
  className?: string;
}) {
  const setNotice = usePlayerNoticeStore((state) => state.setNotice);
  return (
    <Button
      variant="text"
      className={className}
      onClick={async () => {
        const result = await shareStation(station, clock);
        if (result === "copied") {
          setNotice({ kind: "info", message: VOICE.shared, durationMs: 3200 });
        } else if (result === "failed") {
          // A closed share sheet says nothing; only a real failure is worth a word.
          if (typeof navigator === "undefined" || !navigator.share) {
            setNotice({ kind: "info", message: "Couldn’t copy the link from here.", durationMs: 3200 });
          }
        }
      }}
    >
      {VOICE.share} <span aria-hidden="true">↗</span>
    </Button>
  );
}
