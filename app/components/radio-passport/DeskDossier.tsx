import { useEffect, useRef, useState } from "react";
import { Eyebrow } from "~/components/ui/Eyebrow";
import {
  meridianDomain,
  meridianKind,
  type MeridianKind,
  type TheaterFact,
  type TheaterLink,
} from "./productFlow";
import { safeExternalUrl } from "./stationInsights";
import { theaterWellAria, type TheaterPhase } from "./theaterLock";

/**
 * The desk's dossier: what we know about the station and, when the stream
 * sends a title, what the desk found about it. Plain rows and links — no
 * animation, no graph. It rests in the drop-up sheet on the phone and stands
 * beside the folio on desktop.
 */

function MeridianIcon({ kind }: { kind: MeridianKind }) {
  if (kind === "youtube") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <rect x="1.25" y="3.25" width="13.5" height="9.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path d="M6.6 6.15v3.7L10.4 8z" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "wiki") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path d="M2.2 4.2 5 12.1h.1L8 5.4l2.9 6.7h.1L13.8 4.2" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="5.1" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="8" cy="8" r="1.15" fill="currentColor" />
    </svg>
  );
}

/** A caption that clamps to a few lines and opens with "more". */
function Letter({ text, signed }: { text: string; signed?: boolean }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [needed, setNeeded] = useState(false);
  useEffect(() => {
    setOpen(false);
    setNeeded(false);
  }, [text]);
  useEffect(() => {
    const node = ref.current;
    if (!node || open) return;
    const check = () => {
      if (node.scrollHeight > node.clientHeight + 1) setNeeded(true);
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(node);
    return () => observer.disconnect();
  }, [open, text]);
  return (
    <div className={`ew-letter${open ? " is-open" : ""}`}>
      <p ref={ref} className="ew-caption">
        {text}
      </p>
      {signed && !open ? <span className="ew-letter-sign">— night desk</span> : null}
      {needed ? (
        <button
          type="button"
          className="ew-letter-more"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "less" : "more"}
        </button>
      ) : null}
    </div>
  );
}

export function DeskDossier({
  phase,
  caption,
  deskSigned,
  facts,
  links,
  hasTitle,
  catalog,
  stationName,
  showWaiting = true,
}: {
  phase: TheaterPhase;
  caption: string | null;
  deskSigned?: boolean;
  facts: TheaterFact[];
  links?: TheaterLink[];
  /** The stream really sent a title. */
  hasTitle: boolean;
  catalog: { land?: string | null; city?: string | null; spoken?: string | null };
  stationName?: string | null;
  /** The desk page says what is on air elsewhere; it hides the waiting line. */
  showWaiting?: boolean;
}) {
  const aria = theaterWellAria(phase);
  const rows = (
    [
      ["Land", catalog.land],
      ["City", catalog.city],
      ["Spoken", catalog.spoken],
    ] as const
  )
    .map(([label, value]) => [label, value?.trim() ?? ""] as const)
    .filter(([, value]) => value);
  const meridians = (links ?? [])
    .map((link) => {
      const url = safeExternalUrl(link.url);
      if (!url) return null;
      return {
        label: link.label.trim(),
        url,
        kind: meridianKind(url, link.label.trim()),
        host: meridianDomain(url),
      };
    })
    .filter((link): link is NonNullable<typeof link> => Boolean(link));
  const waiting =
    phase === "locking" && hasTitle
      ? "Reading the live title"
      : hasTitle
        ? null
        : "No title on the air yet";
  return (
    <div
      className="ew-desk-dossier"
      data-phase={phase}
      role={aria ? "status" : undefined}
      aria-live={aria ? "polite" : undefined}
      aria-label={aria}
    >
      {waiting && showWaiting ? <Eyebrow tone="dust" className="ew-desk-waiting">{waiting}</Eyebrow> : null}
      {caption ? <Letter text={caption} signed={deskSigned} /> : null}
      {rows.length > 0 ? (
        <dl className="ew-desk-known">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {phase === "filed" && facts.length > 0 ? (
        <section className="ew-desk-found">
          <Eyebrow tone="foil">The desk found</Eyebrow>
          <ol>
            {facts.map((item) => (
              <li key={`${item.label}:${item.value}`}>
                <span className="ew-desk-found-value">{item.value}</span>
                <span className="ew-desk-found-label">{item.label}</span>
              </li>
            ))}
          </ol>
          <p className="ew-desk-source">MusicBrainz · verified relations</p>
        </section>
      ) : null}
      {meridians.length > 0 ? (
        <section className="ew-desk-links">
          <Eyebrow tone="foil">Read it elsewhere</Eyebrow>
          <p className="ew-meridians">
            {meridians.map((link) => (
              <a key={`${link.label}:${link.url}`} href={link.url} target="_blank" rel="noopener noreferrer">
                <MeridianIcon kind={link.kind} />
                {link.label}
                {link.host ? <em className="ew-meridian-host">{link.host}</em> : null}
              </a>
            ))}
          </p>
        </section>
      ) : null}
      {stationName ? <span className="sr-only">Dossier for {stationName}</span> : null}
    </div>
  );
}
