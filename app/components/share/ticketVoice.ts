/**
 * The Keeper's lines for the ticket sheet and the ticket page. Same voice as
 * `keeperVoice.ts` (short, warm, passport words as seasoning); kept beside the
 * share code so the ticket can be tuned in one place.
 */
export const TICKET_VOICE = {
  sheetTitle: "Your ticket",
  sheetLead: (place: string) => `One ticket to ${place}. Whoever you send it to lands where you are.`,
  shapeLabel: "Ticket shape",
  shapeCard: "Card",
  shapeStory: "Story",
  printing: "Printing your ticket…",
  unprinted: "The printer’s jammed. The link still works.",
  send: "Send this ticket",
  copy: "Copy link",
  copyBoth: "Copy ticket",
  save: "Save image",
  close: "Close",
  sent: "Sent. The desk will stamp them in when they land.",
  copied: "Link copied. The ticket shows up wherever you paste it.",
  copiedBoth: "Copied: the ticket and its link. Paste it anywhere.",
  copyFailed: "Couldn’t copy from here. Hold the link above to copy it.",
  saved: "Saved. It’s yours to keep.",
  saveFailed: "Couldn’t save the picture from here.",
  alt: (name: string, place: string) => `A boarding pass to ${place}, for ${name}, stamped by Elsewhere.`,
  /** Link-preview description: timeless (previews are cached), never a claim about what is on air. */
  description: (name: string, place: string) => `Come and land in ${place} with me. ${name}, live on Elsewhere.`,
  pageLead: "A friend sent you a ticket",
  pageGo: "Land here",
} as const;
