import type { Station } from "~/types/radio";
import { VOICE } from "~/components/keeper/keeperVoice";
import { logUsage } from "~/utils/usage";
import { useTicketStore } from "~/state/ticketStore";
import { ticketPagePath, ticketPlace } from "./ticketModel";

export const TUNE_PARAM = "tune";
/** Marks an arrival that came through a ticket page, for the tune_join count only. */
export const TUNE_FROM_PARAM = "from";

export const SITE_ORIGIN = "https://elsewheremusic.com";

export type ShareableStation = Pick<Station, "uuid" | "name" | "city" | "country"> &
  Partial<Pick<Station, "state" | "longitude">>;

/**
 * The link a friend gets: the station's ticket page. It carries a real link
 * preview (the ticket image) and hands the friend on to `/?tune=<uuid>`, which
 * keeps working forever for links already out in the world.
 */
export function tuneLink(station: Pick<Station, "uuid">, origin = SITE_ORIGIN) {
  return `${origin}${ticketPagePath(station.uuid)}`;
}

/** Where the ticket page hands a friend on to: the arrival card on home. */
export function tuneLandingPath(uuid: string, from?: "ticket") {
  const query = new URLSearchParams({ [TUNE_PARAM]: uuid });
  if (from) query.set(TUNE_FROM_PARAM, from);
  return `/?${query.toString()}`;
}

export function shareCopy(
  station: Pick<Station, "name" | "city" | "country"> & Partial<Pick<Station, "state">>,
  clock?: string | null,
) {
  const place = ticketPlace(station);
  return {
    title: `${station.name} · ${place}`,
    text: VOICE.shareText(place, clock),
  };
}

export type ShareResult = "shared" | "copied" | "cancelled" | "failed" | "opened";

function currentOrigin() {
  return typeof window !== "undefined" && window.location?.origin ? window.location.origin : undefined;
}

/** The phone's share sheet can take the ticket itself as a picture. */
export function canShareFile(file: File | null | undefined) {
  if (!file || typeof navigator === "undefined") return false;
  if (typeof navigator.share !== "function" || typeof navigator.canShare !== "function") return false;
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

/**
 * A phone or tablet (touch first). A Mac's share menu has "Copy" in it, and
 * with a picture attached Copy takes the picture alone and drops the link, so
 * on a computer the ticket goes as a link and the picture stays on Save image.
 */
function touchFirst() {
  try {
    return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

/**
 * Every share control's entry point: open the ticket sheet, where the listener
 * sees the ticket before it goes anywhere. Nothing is sent from here.
 */
export async function shareStation(station: ShareableStation, clock?: string | null): Promise<ShareResult> {
  useTicketStore.getState().open(station, clock ?? null);
  logUsage("ticket_open");
  return "opened";
}

/**
 * Send the ticket: the share sheet with the ticket picture attached where the
 * phone allows files, else the sheet with the link, else the clipboard. The
 * picture must already be in hand (a File): fetching it after the tap would
 * spend the tap, and Safari refuses a share sheet that is not a direct answer
 * to one.
 */
export async function sendTicket(
  station: ShareableStation,
  clock?: string | null,
  file?: File | null,
): Promise<ShareResult> {
  const url = tuneLink(station, currentOrigin());
  const { title, text } = shareCopy(station, clock);
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      if (touchFirst() && canShareFile(file)) {
        // Some share targets drop `url` when files ride along, so the link travels in the text.
        await navigator.share({ files: [file!], title, text: `${text} ${url}` });
      } else {
        await navigator.share({ title, text, url });
      }
      logUsage("ticket_share");
      return "shared";
    } catch (error) {
      // The listener closed the share sheet: nothing to do, nothing failed.
      if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    }
  }
  return copyTicketLink(station, clock, { withText: true });
}

/** Copy the ticket link (optionally with the keeper's line in front of it). */
export async function copyTicketLink(
  station: ShareableStation,
  clock?: string | null,
  { withText = false }: { withText?: boolean } = {},
): Promise<ShareResult> {
  const url = tuneLink(station, currentOrigin());
  const { text } = shareCopy(station, clock);
  try {
    await navigator.clipboard.writeText(withText ? `${text} ${url}` : url);
    logUsage("ticket_copy");
    return "copied";
  } catch {
    return "failed";
  }
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * One copy, one paste: the ticket picture and the link ride the clipboard
 * together (picture, plain text, and a rich link). Which part shows is up to
 * the app you paste into; a chat box that takes pictures shows the picture and
 * usually the text with it. Without picture support, or without the picture
 * yet, it falls back to the link and the line, never to nothing.
 */
export async function copyTicketAndLink(
  station: ShareableStation,
  clock?: string | null,
  file?: File | null,
): Promise<ShareResult> {
  const url = tuneLink(station, currentOrigin());
  const { text } = shareCopy(station, clock);
  const plain = `${text} ${url}`;
  const canRich =
    file?.type === "image/png" &&
    typeof navigator !== "undefined" &&
    typeof ClipboardItem !== "undefined" &&
    typeof navigator.clipboard?.write === "function";
  if (canRich) {
    try {
      const html = `<p>${escapeHtml(text)} <a href="${escapeHtml(url)}">${escapeHtml(url)}</a></p>`;
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": file!,
          "text/plain": new Blob([plain], { type: "text/plain" }),
          "text/html": new Blob([html], { type: "text/html" }),
        }),
      ]);
      logUsage("ticket_copy");
      return "copied";
    } catch {
      // Fall through to the link alone.
    }
  }
  return copyTicketLink(station, clock, { withText: true });
}
