import { Link } from "@remix-run/react";
import { Eyebrow } from "~/components/ui/Eyebrow";
import { useSecretTrail } from "~/state/secretTrail";
export function TrailWhisper({ onOpenBook }: { onOpenBook: () => void }) {
  const stage = useSecretTrail((state) => state.stage);
  if (stage !== "passport" && stage !== "room") return null;
  return <aside className="ew-trail-whisper" aria-live="polite"><i className="ew-trail-whisper-mark" aria-hidden="true" /><div><Eyebrow tone="foil">The misplaced hour</Eyebrow><p>{stage === "passport" ? "The map kept the hour. Your book keeps the stay." : "The mark found its door. Your radio can come with you."}</p></div>{stage === "passport" ? <button type="button" onClick={onOpenBook}>Open Passport →</button> : <Link to="/secret-room" prefetch="intent" viewTransition>Follow it →</Link>}</aside>;
}
