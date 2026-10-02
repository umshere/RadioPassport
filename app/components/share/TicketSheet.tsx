import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTicketStore } from "~/state/ticketStore";
import { logUsage } from "~/utils/usage";
import { copyTicketAndLink, copyTicketLink, sendTicket, shareCopy, tuneLink, type ShareableStation } from "./shareStation";
import { ticketImagePath, ticketPlace, type TicketFormat } from "./ticketModel";
import { TICKET_VOICE } from "./ticketVoice";

type Printed = { format: TicketFormat; file: File | null; failed: boolean };

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "station";
}

/** Fetch the printed ticket as a File, ready before the tap that sends it. */
async function printTicket(station: ShareableStation, format: TicketFormat): Promise<File | null> {
  try {
    const res = await fetch(ticketImagePath(station.uuid, format));
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    const ext = blob.type === "image/png" ? "png" : "jpg";
    return new File([blob], `elsewhere-ticket-${slug(station.city || station.name)}.${ext}`, { type: blob.type });
  } catch {
    return null;
  }
}

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * "Your ticket": the listener sees the ticket before it goes anywhere, then
 * sends it (the phone's sheet, with the picture where the phone allows),
 * copies the link, or saves the picture. One sheet for the whole app; any
 * share control opens it through the ticket store.
 */
export function TicketSheet() {
  const station = useTicketStore((state) => state.station);
  const clock = useTicketStore((state) => state.clock);
  const close = useTicketStore((state) => state.close);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || !station) return null;
  return createPortal(<TicketDialog key={station.uuid} station={station} clock={clock} onClose={close} />, document.body);
}

function TicketDialog({
  station,
  clock,
  onClose,
}: {
  station: ShareableStation;
  clock: string | null;
  onClose: () => void;
}) {
  const titleId = useId();
  const leadId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const sendRef = useRef<HTMLButtonElement>(null);
  const [format, setFormat] = useState<TicketFormat>("card");
  const [printed, setPrinted] = useState<Printed | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const place = ticketPlace(station);
  const link = tuneLink(station, typeof window !== "undefined" ? window.location.origin : undefined);
  const src = ticketImagePath(station.uuid, format);

  // Print the chosen shape as soon as it is asked for, so Send has the picture in hand.
  useEffect(() => {
    let alive = true;
    setImageReady(false);
    setPrinted(null);
    void printTicket(station, format).then((file) => {
      if (alive) setPrinted({ format, file, failed: !file });
    });
    return () => {
      alive = false;
    };
  }, [station, format]);

  // Focus moves into the sheet and back to whatever opened it.
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    sendRef.current?.focus({ preventScroll: true });
    return () => opener?.focus?.({ preventScroll: true });
  }, []);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  const file = printed?.format === format ? printed.file : null;

  const onSend = async () => {
    setBusy(true);
    const result = await sendTicket(station, clock, file);
    setBusy(false);
    if (result === "shared") setStatus(TICKET_VOICE.sent);
    else if (result === "copied") setStatus(TICKET_VOICE.copied);
    else if (result === "failed") setStatus(TICKET_VOICE.copyFailed);
  };

  const onCopy = async () => {
    const result = await copyTicketLink(station, clock);
    setStatus(result === "copied" ? TICKET_VOICE.copied : TICKET_VOICE.copyFailed);
  };

  const onCopyBoth = async () => {
    const result = await copyTicketAndLink(station, clock, file);
    setStatus(result === "copied" ? TICKET_VOICE.copiedBoth : TICKET_VOICE.copyFailed);
  };

  const onSave = async () => {
    const saved = file ?? (await printTicket(station, format));
    if (!saved) {
      setStatus(TICKET_VOICE.saveFailed);
      return;
    }
    const href = URL.createObjectURL(saved);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = saved.name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 4000);
    logUsage("ticket_save");
    setStatus(TICKET_VOICE.saved);
  };

  const { text } = shareCopy(station, clock);

  return (
    <div className="ew-ticket-layer">
      <div className="ew-ticket-scrim" aria-hidden="true" onClick={onClose} />
      <section
        ref={dialogRef}
        className="ew-ticket"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={leadId}
        onKeyDown={onKeyDown}
      >
        <header className="ew-ticket-head">
          <h2 id={titleId} className="ew-ticket-title">
            {TICKET_VOICE.sheetTitle}
          </h2>
          <button type="button" className="ew-ticket-close" aria-label={TICKET_VOICE.close} onClick={onClose}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        <p id={leadId} className="ew-ticket-lead">
          {TICKET_VOICE.sheetLead(place)}
        </p>
        <div className="ew-ticket-shapes" role="group" aria-label={TICKET_VOICE.shapeLabel}>
          {(["card", "story"] as const).map((shape) => (
            <button
              key={shape}
              type="button"
              className="ew-ticket-shape"
              aria-pressed={format === shape}
              onClick={() => setFormat(shape)}
            >
              {shape === "card" ? TICKET_VOICE.shapeCard : TICKET_VOICE.shapeStory}
            </button>
          ))}
        </div>
        <figure className="ew-ticket-figure" data-format={format} data-ready={imageReady || undefined}>
          <img
            key={src}
            src={src}
            alt={TICKET_VOICE.alt(station.name, place)}
            onLoad={() => setImageReady(true)}
            onError={() => setImageReady(true)}
          />
          {!imageReady ? (
            <figcaption className="ew-ticket-printing" aria-hidden="true">
              {TICKET_VOICE.printing}
            </figcaption>
          ) : null}
        </figure>
        <p className="ew-ticket-message">
          <span>{text}</span> <span className="ew-ticket-link">{link}</span>
        </p>
        <div className="ew-ticket-actions">
          <button ref={sendRef} type="button" className="ew-ticket-send" onClick={() => void onSend()} disabled={busy}>
            {TICKET_VOICE.send}
          </button>
          <div className="ew-ticket-row">
            <button type="button" className="ew-ticket-act" onClick={() => void onCopyBoth()}>
              {TICKET_VOICE.copyBoth}
            </button>
            <button type="button" className="ew-ticket-act" onClick={() => void onCopy()}>
              {TICKET_VOICE.copy}
            </button>
            <button type="button" className="ew-ticket-act" onClick={() => void onSave()}>
              {TICKET_VOICE.save}
            </button>
          </div>
        </div>
        <p className="ew-ticket-status" role="status" aria-live="polite">
          {status || (printed?.failed && printed.format === format ? TICKET_VOICE.unprinted : "")}
        </p>
      </section>
    </div>
  );
}
