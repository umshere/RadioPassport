import { Link } from "@remix-run/react";
import { useEffect, useState } from "react";
import { VOICE } from "~/components/keeper/keeperVoice";

const DISMISS_KEY = "elsewhere-how-dismissed";

const STEPS = [
  { title: VOICE.howLandTitle, body: VOICE.howLandBody },
  { title: VOICE.howListenTitle, body: VOICE.howListenBody },
  { title: VOICE.howSendTitle, body: VOICE.howSendBody },
] as const;

/**
 * "How it works", for someone who has not stamped anything yet. Three plain
 * steps and a way in to the full guide. It goes away for good once dismissed
 * (or once there is a stamp in the passport).
 */
export function HomeHow({ show }: { show: boolean }) {
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);
  if (!show || dismissed) return null;
  return (
    <section className="ew-home-how" aria-labelledby="ew-home-how-title">
      <header className="ew-home-how-head">
        <h2 id="ew-home-how-title" className="ew-home-how-title">{VOICE.howTitle}</h2>
        <button
          type="button"
          className="ew-home-how-close"
          aria-label={VOICE.howDismiss}
          onClick={() => {
            setDismissed(true);
            try {
              window.localStorage.setItem(DISMISS_KEY, "1");
            } catch {
              // Private mode: it will simply show again next visit.
            }
          }}
        >
          ×
        </button>
      </header>
      <ol className="ew-home-how-steps">
        {STEPS.map((step, i) => (
          <li key={step.title} className="ew-home-how-step">
            <span className="ew-home-how-no" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
            <b>{step.title}</b>
            <span>{step.body}</span>
          </li>
        ))}
      </ol>
      <Link to="/about" prefetch="intent" className="ew-home-how-more">
        {VOICE.howMore} <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
