import { foldName } from "~/components/keeper/keeperAliases";
import { repairMojibake } from "~/utils/repairMojibake";

/**
 * Turn what a stream sends into something a lookup can trust. Pure rules;
 * the server may later let Jev overrule a low-confidence verdict, but the
 * rules alone must already be safe. Isomorphic: the client builds facts with
 * it and the server recomputes from the same input.
 */
export type TitleKind = "track" | "jingle_or_station_id" | "ad" | "news_or_talk" | "junk";

export type CleanedTrack = {
  artist: string | null;
  title: string | null;
  kind: TitleKind;
  confidence: number;
};

const URL_RE = /\b(?:https?:\/\/|www\.)\S+/gi;
const DOMAIN_RE = /\b[\w-]+\.(?:com|net|org|fm|am|ng|co|io|in|uk|de|fr|tv|me|radio|live|online)(?:\.[a-z]{2})?\b/gi;
const BRACKET_NOISE =
  /[(\[]\s*(?:official(?: music| lyric)? (?:video|audio)|lyrics?(?: video)?|audio|video|visuali[sz]er|hd|hq|4k|explicit|clean|radio edit|(?:\d{4} )?remaster(?:ed)?(?: \d{4})?)\s*[)\]]/gi;
const BITRATE = /\b\d{2,3}\s?kbps\b/gi;
const CODEC = /[(\[](?:mp3|aac\+?|ogg|flac)[)\]]/gi;
const EDIT_SUFFIX = /\s[-–—]\s(?:radio|single|album) (?:edit|version|mix)\s*$/i;
const LEADING = /^\s*(?:\d{1,2}[.)]\s+|\[?\d{1,2}:\d{2}\]?\s*)/;

const JINGLE_WORDS = /\b(jingle|station id|ident|sweeper|promo|you(?:'re| are) (?:listening|tuned) to)\b/i;
const AD_WORDS = /\b(advert(?:isement)?|commercial|sponsor(?:ed)?|ad ?break|publicidad|werbung|publicité)\b/i;
const NEWS_WORDS = /\b(news|bulletin|headlines|weather|traffic|talk|interview|podcast|phone-?in|noticias|nachrichten|journal)\b/i;

function letters(text: string) {
  return (text.match(/\p{L}/gu) ?? []).length;
}

export function cleanField(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let text = repairMojibake(raw)
    .replace(/[\u0000-\u001F]/g, " ")
    .normalize("NFC");
  text = text.replace(URL_RE, " ").replace(DOMAIN_RE, " ");
  // "Song | site.com" — keep the longest meaningful segment.
  const segments = text.split(/\s*[|•·]\s*/).map((s) => s.trim()).filter((s) => letters(s) > 0);
  if (segments.length > 1) text = segments.sort((a, b) => b.length - a.length)[0]!;
  text = text
    .replace(BRACKET_NOISE, " ")
    .replace(/[(\[]\s*[)\]]/g, " ")
    .replace(BITRATE, " ")
    .replace(CODEC, " ")
    .replace(EDIT_SUFFIX, "")
    .replace(LEADING, "")
    .replace(/\s+/g, " ")
    .replace(/^["“'‘]+|["”'’]+$/g, "")
    .replace(/[\s\-–—|:~]+$/g, "")
    .trim();
  return text || null;
}

/** Clean the two fields the feed gave and say what kind of line it was. */
export function cleanTrack(
  artistRaw: string | null | undefined,
  titleRaw: string | null | undefined,
  stationName = "",
): CleanedTrack {
  const artist = cleanField(artistRaw);
  const title = cleanField(titleRaw);
  const both = [artist, title].filter(Boolean) as string[];
  const text = both.join(" - ");
  const junk = (confidence: number): CleanedTrack => ({ artist: null, title: null, kind: "junk", confidence });

  if (!text || letters(text) < 2) return junk(0.95);
  const stationFold = foldName(stationName);
  const textFold = foldName(text);
  if (stationFold.length >= 3 && (textFold === stationFold || stationFold.includes(textFold))) {
    return { artist: null, title: null, kind: "jingle_or_station_id", confidence: 0.9 };
  }
  if (JINGLE_WORDS.test(text)) return { artist: null, title: null, kind: "jingle_or_station_id", confidence: 0.85 };
  if (AD_WORDS.test(text)) return { artist: null, title: null, kind: "ad", confidence: 0.85 };
  if (both.length === 1 && NEWS_WORDS.test(text)) {
    return { artist: null, title: null, kind: "news_or_talk", confidence: 0.75 };
  }
  const words = text.split(/\s+/).length;
  if (both.length === 1 && words <= 4 && text === text.toUpperCase() && /[A-Z]/.test(text)) {
    return { artist: null, title: null, kind: "jingle_or_station_id", confidence: 0.6 };
  }
  if (both.length === 2 && letters(artist!) >= 2 && letters(title!) >= 2) {
    return { artist, title, kind: "track", confidence: 0.8 };
  }
  if (both.length === 1 && words <= 10) return { artist, title, kind: "track", confidence: 0.6 };
  return junk(0.6);
}

/** "Artist — Title" as the listener should read it: fields cleaned, empties dropped. */
export function cleanTrackLine(
  track: { artist?: string | null; title?: string | null } | null | undefined,
): string | null {
  if (!track) return null;
  const line = [cleanField(track.artist), cleanField(track.title)].filter(Boolean).join(" — ");
  return line || null;
}
