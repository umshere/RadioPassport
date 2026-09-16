import { Link } from "@remix-run/react";
import { useEffect, useState } from "react";
import { solarHourAtLongitude, type SolarHour } from "~/utils/localTime";
import { useSecretTrail } from "~/state/secretTrail";
const HOURS: SolarHour[] = ["Dawn", "Midday", "Dusk", "Night"];

export function SecretTrail({ stationId, city, longitude }: { stationId: string; city: string; longitude: number | null | undefined }) {
  const hydrated = useSecretTrail((state) => state.hydrated); const hydrate = useSecretTrail((state) => state.hydrate);
  const stage = useSecretTrail((state) => state.stage); const origin = useSecretTrail((state) => state.stationId);
  const begin = useSecretTrail((state) => state.begin); const answerHour = useSecretTrail((state) => state.answerHour); const [wrong, setWrong] = useState(false);
  useEffect(() => hydrate(), [hydrate]); useEffect(() => setWrong(false), [stationId, stage]);
  if (typeof longitude !== "number" || !hydrated) return null;
  const active = stage !== "idle" && origin === stationId; const elsewhereNow = stage !== "idle" && origin !== stationId;
  return <div className="ew-secret-trail"><button type="button" className="ew-secret-mark" aria-label={active ? "The misplaced hour mark and its clue" : "A misplaced hour mark"} aria-expanded={active} onClick={() => { if (!active) begin(stationId, solarHourAtLongitude(longitude)); }}><i aria-hidden="true" /></button>{active ? <section className="ew-secret-clue" aria-live="polite"><p className="rp-eyebrow text-foil">A misplaced hour</p>{stage === "hour" ? <><p>The signal has an hour of its own. Look at {city}'s clock. What part of the day is it there?</p><div className="ew-secret-answers">{HOURS.map((hour) => <button type="button" key={hour} onClick={() => setWrong(!answerHour(hour))}>{hour}</button>)}</div>{wrong ? <p className="ew-secret-hint">Not quite. The local clock is above the letter.</p> : null}</> : stage === "atlas" ? <><p>One hour belongs to more than one land. Find its neighbors on the map.</p><Link to="/?atlas=1" prefetch="intent" viewTransition>Open Atlas →</Link></> : stage === "passport" ? <><p>The hour has traveled. Your book is waiting on the cover.</p><Link to="/" prefetch="intent" viewTransition>Return to the cover →</Link></> : <><p>You landed. You wandered. You looked back. There is one more room.</p><Link to="/secret-room" prefetch="intent" viewTransition>Follow the mark →</Link></>}</section> : elsewhereNow ? <span className="ew-secret-return">The mark remembers another signal.</span> : null}</div>;
}
