import { Button } from "~/components/ui/Button";
import { VOICE } from "~/components/keeper/keeperVoice";
import { shareStation, type ShareableStation } from "./shareStation";

/** "Send a friend a ticket": opens the ticket sheet, where the ticket is seen before it is sent. */
export function ShareButton({
  station,
  clock,
  className,
}: {
  station: ShareableStation;
  clock?: string | null;
  className?: string;
}) {
  return (
    <Button
      variant="text"
      className={className}
      aria-haspopup="dialog"
      onClick={() => void shareStation(station, clock)}
    >
      {VOICE.share} <span aria-hidden="true">↗</span>
    </Button>
  );
}
