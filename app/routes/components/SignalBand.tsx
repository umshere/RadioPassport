import { IconBroadcast } from "@tabler/icons-react";
import { PretextMeasuredText } from "~/components/PretextMeasuredText";
import type { Country, Station } from "~/types/radio";

type SignalBandProps = {
  topCountries: Country[];
  nowPlaying: Station | null;
  recentStations: Station[];
};

const SIGNAL_NOTE_FONT =
  '600 12px "General Sans", "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif';

type SignalNote = {
  id: string;
  label: string;
  tone: "gold" | "ivory" | "muted";
  text: string;
};

function buildSignalNotes(
  topCountries: Country[],
  nowPlaying: Station | null,
  recentStations: Station[]
): SignalNote[] {
  const notes: SignalNote[] = [];

  if (nowPlaying) {
    notes.push({
      id: `live-${nowPlaying.uuid}`,
      label: `${nowPlaying.country} live`,
      tone: "gold",
      text: `${nowPlaying.name} is on air now. Pretext keeps the note readable even as live metadata and AI context change shape.`,
    });
  }

  for (const station of recentStations.slice(0, 3)) {
    notes.push({
      id: `recent-${station.uuid}`,
      label: `${station.country} stamp`,
      tone: "ivory",
      text: `${station.name} left a recent stamp in ${station.country}. Signal notes can stay expressive instead of collapsing into one-line utility text.`,
    });
  }

  for (const country of topCountries.slice(0, 4)) {
    notes.push({
      id: `country-${country.iso_3166_1}`,
      label: `${country.name} atlas`,
      tone: "muted",
      text: `${country.stationcount.toLocaleString()} stations from ${country.name}, ready for richer field notes, labels, and AI summaries in the listening flow.`,
    });
  }

  if (notes.length === 0) {
    notes.push({
      id: "fallback-1",
      label: "Signal atlas",
      tone: "gold",
      text: "Radio Passport stages radio discovery like an editorial travel object, with text measured deliberately instead of improvised after layout.",
    });
  }

  return notes;
}

function noteToneClasses(tone: SignalNote["tone"]) {
  switch (tone) {
    case "gold":
      return "border-[rgba(245,177,45,0.28)] bg-[rgba(18,14,7,0.56)]";
    case "ivory":
      return "border-white/10 bg-[rgba(10,14,20,0.38)]";
    default:
      return "border-white/8 bg-[rgba(9,13,20,0.32)]";
  }
}

export function SignalBand({
  topCountries,
  nowPlaying,
  recentStations,
}: SignalBandProps) {
  const notes = buildSignalNotes(topCountries, nowPlaying, recentStations).slice(0, 4);

  return (
    <section className="relative overflow-hidden pt-4">
      <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--rp-muted-2)]">
        <IconBroadcast size={12} className="text-[var(--rp-gold)]" />
        Signal Notes
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {notes.map((note) => (
          <article
            key={note.id}
            className={`rounded-[1.4rem] border px-4 py-3 shadow-[0_10px_24px_rgba(0,0,0,0.16)] backdrop-blur-md ${noteToneClasses(note.tone)}`}
          >
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--rp-muted-2)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--rp-gold)]" />
              {note.label}
            </div>
            <div className="mt-2">
              <PretextMeasuredText
                text={note.text}
                font={SIGNAL_NOTE_FONT}
                lineHeight={18}
                collapsedLines={3}
                lineClassName="text-[12px] font-semibold text-[var(--rp-muted)]"
                fallbackClassName="text-[12px] font-semibold text-[var(--rp-muted)]"
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
