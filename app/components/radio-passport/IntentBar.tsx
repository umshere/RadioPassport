import { SearchVoice } from "./SearchVoice";
import { Button } from "~/components/ui/Button";

export function IntentBar({
  value,
  onChange,
  onSubmit,
  onSurprise,
  loading,
  surpriseLoading,
  statusLabel,
  statusSpoken,
  statusTone = "idle",
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onSurprise: () => void;
  loading?: boolean;
  surpriseLoading?: boolean;
  statusLabel?: string;
  statusSpoken?: string;
  statusTone?: "idle" | "searching" | "ready" | "empty";
}) {
  return (
    <form
      className={`rp-intent ${statusTone !== "idle" ? `is-${statusTone}` : ""}`}
      aria-busy={loading || undefined}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(value);
      }}
    >
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Lisbon at dusk…"
        aria-label="Ask for a place, language, mood, or station"
        aria-describedby="intent-status"
      />
      <span
        id="intent-status"
        className={`rp-intent-status is-${statusTone}`}
        role="status"
        aria-live="polite"
      >
        {statusLabel || ""}
        <span className="sr-only">{statusSpoken}</span>
      </span>
      {value.trim() ? (
        <button
          type="button"
          className="rp-intent-clear"
          onClick={() => onChange("")}
          aria-label="Clear the search"
        >
          ×
        </button>
      ) : null}
      <SearchVoice
        disabled={loading}
        onTranscript={(transcript) => {
          onChange(transcript);
          onSubmit(transcript);
        }}
      />
      <Button
        variant="mono"
        onClick={onSurprise}
        disabled={surpriseLoading}
        busy={surpriseLoading}
      >
        {surpriseLoading ? "Tuning" : "Surprise"}
      </Button>
    </form>
  );
}
