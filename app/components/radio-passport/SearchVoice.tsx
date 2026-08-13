import { useEffect, useRef, useState } from "react";

type VoiceStatus = "idle" | "listening" | "error" | "unsupported";

export function SearchVoice({
  onTranscript,
  disabled,
}: {
  onTranscript: (transcript: string) => void;
  disabled?: boolean;
}) {
  const recognitionRef = useRef<{
    start: () => void;
    stop: () => void;
  } | null>(null);
  const [status, setStatus] = useState<VoiceStatus>("idle");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const browserWindow = window as typeof window & {
      SpeechRecognition?: new () => {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        start: () => void;
        stop: () => void;
        onresult: ((event: { results?: Array<Array<{ transcript?: string }>>; resultIndex?: number }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        start: () => void;
        stop: () => void;
        onresult: ((event: { results?: Array<Array<{ transcript?: string }>>; resultIndex?: number }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
      };
    };
    const Ctor =
      browserWindow.SpeechRecognition || browserWindow.webkitSpeechRecognition;
    if (!Ctor) {
      setStatus("unsupported");
      return;
    }
    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript =
        event.results?.[event.resultIndex ?? 0]?.[0]?.transcript?.trim();
      setStatus("idle");
      if (transcript) onTranscript(transcript);
    };
    recognition.onerror = () => setStatus("error");
    recognition.onend = () =>
      setStatus((current) => (current === "listening" ? "idle" : current));
    recognitionRef.current = recognition;
    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognitionRef.current = null;
    };
  }, [onTranscript]);

  if (status === "unsupported") return null;

  return (
    <button
      type="button"
      className={`rp-mic ${status === "listening" ? "is-live" : ""}`}
      disabled={disabled}
      onClick={() => {
        const recognition = recognitionRef.current;
        if (!recognition || disabled) return;
        try {
          if (status === "listening") {
            recognition.stop();
            setStatus("idle");
          } else {
            recognition.start();
            setStatus("listening");
          }
        } catch {
          setStatus("error");
        }
      }}
      aria-label={status === "listening" ? "Stop listening" : "Speak a destination"}
    >
      {status === "listening" ? "●" : "🎙️"}
    </button>
  );
}
