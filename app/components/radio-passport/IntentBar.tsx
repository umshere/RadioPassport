import { SearchVoice } from "./SearchVoice";

export function IntentBar({
  value,
  onChange,
  onSubmit,
  onSurprise,
  loading,
  surpriseLoading,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onSurprise: () => void;
  loading?: boolean;
  surpriseLoading?: boolean;
}) {
  return (
    <form
      className="rp-intent"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(value);
      }}
    >
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Lisbon at dusk, Malayalam night…"
        aria-label="Ask for a place, language, mood, or station"
      />
      <SearchVoice
        disabled={loading}
        onTranscript={(transcript) => {
          onChange(transcript);
          onSubmit(transcript);
        }}
      />
      <button
        type="button"
        className="rp-surprise"
        onClick={onSurprise}
        disabled={surpriseLoading}
      >
        {surpriseLoading ? "Tuning" : "Surprise"}
      </button>
    </form>
  );
}
