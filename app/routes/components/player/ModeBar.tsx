import { useEffect, useMemo, useRef, useState } from "react";
import { Text, Button, ActionIcon, Tooltip } from "@mantine/core";
import { IconMapPin, IconArrowLeft, IconMicrophone, IconMicrophoneOff } from "@tabler/icons-react";
import type { AiDescriptorState, VoiceCommandPayload } from "~/types/ai";
import type { ListeningMode } from "~/types/radio";

const KEYWORD_GROUPS: Array<{ id: string; tokens: string[] }> = [
  { id: "chill", tokens: ["chill", "relax", "calm", "lofi", "ambient", "downtempo"] },
  { id: "upbeat", tokens: ["upbeat", "dance", "energetic", "party", "club", "house"] },
  { id: "jazz", tokens: ["jazz", "blues", "swing", "sax", "bebop"] },
  { id: "rock", tokens: ["rock", "guitar", "metal", "punk", "indie"] },
  { id: "classical", tokens: ["classical", "orchestra", "symphony", "piano", "violin"] },
  { id: "hip-hop", tokens: ["hip hop", "hip-hop", "rap", "beats", "trap"] },
  { id: "world", tokens: ["world", "global", "international", "latin", "afro"] },
  { id: "news", tokens: ["news", "talk", "spoken", "journal", "update"] },
];

const FILLER_WORDS = new Set([
  "play",
  "some",
  "music",
  "radio",
  "station",
  "please",
  "for",
  "me",
  "a",
  "the",
  "and",
  "with",
  "give",
  "something",
  "like",
  "sound",
]);

function extractMoodFromTranscript(transcript: string): string | null {
  const normalized = transcript.toLowerCase();
  for (const group of KEYWORD_GROUPS) {
    if (group.tokens.some((token) => normalized.includes(token))) {
      return group.id;
    }
  }

  const words = normalized.split(/[^a-z0-9]+/).filter(Boolean);
  const filtered = words.filter((word) => !FILLER_WORDS.has(word));
  const selection = filtered.slice(0, 2).join(" ").trim();
  return selection || null;
}

const truncate = (value: string, limit = 96) =>
  value.length > limit ? `${value.slice(0, limit - 1)}…` : value;

type ModeBarProps = {
  listeningMode: ListeningMode;
  onQuickRetune: () => void;
  onBackToWorld: () => void;
  descriptorState: AiDescriptorState;
  onVoiceDescriptor: (payload: VoiceCommandPayload) => void | Promise<void>;
};

export function ModeBar({
  listeningMode,
  onQuickRetune,
  onBackToWorld,
  descriptorState,
  onVoiceDescriptor,
}: ModeBarProps) {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);
  const isWorldMode = listeningMode === "world";

  useEffect(() => {
    if (descriptorState.status === "success") {
      setVoiceError(null);
    }
  }, [descriptorState.status]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setIsSupported(false);
      setVoiceError("Speech input is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      setIsListening(false);
      const result = event.results?.[event.resultIndex ?? 0];
      const transcript = result?.[0]?.transcript?.trim();
      if (!transcript) {
        setVoiceError("We couldn't catch that. Try again?");
        return;
      }

      setLastTranscript(transcript);
      const mood = extractMoodFromTranscript(transcript);
      if (!mood) {
        setVoiceError("Couldn't detect a mood or genre. Try another phrase.");
        return;
      }

      setVoiceError(null);
      void onVoiceDescriptor({ mood, transcript });
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      const errorMessage =
        event.error === "no-speech"
          ? "No speech detected. Try again."
          : event.error === "not-allowed"
            ? "Microphone access was blocked."
            : "Speech recognition error. Try again.";
      setVoiceError(errorMessage);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsSupported(true);

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognitionRef.current = null;
    };
  }, [onVoiceDescriptor]);

  useEffect(() => {
    if (!descriptorState.transcript) return;
    setLastTranscript(descriptorState.transcript);
  }, [descriptorState.transcript]);

  useEffect(() => {
    if (isWorldMode || !isListening || !recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch (error) {
      // Ignore stop errors caused by browsers that auto-stop the session.
    }
    setIsListening(false);
  }, [isListening, isWorldMode]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch (error) {
        // Swallow cleanup errors when the session was already closed.
      }
    };
  }, []);

  const descriptorHelperText = useMemo(() => {
    if (!isWorldMode) return "";
    if (voiceError) return voiceError;
    if (!isSupported)
      return "Speech input is not supported in this browser.";
    if (descriptorState.status === "loading") {
      if (descriptorState.mood) {
        return `Refreshing AI vibe for “${descriptorState.mood}”…`;
      }
      if (descriptorState.transcript) {
        return `Heard “${descriptorState.transcript}”. Updating the vibe…`;
      }
      return "Refreshing AI descriptor…";
    }
    if (descriptorState.status === "error" && descriptorState.error)
      return `AI error: ${descriptorState.error}`;
    if (descriptorState.descriptorSummary)
      return `AI vibe • ${descriptorState.descriptorSummary}`;
    if (lastTranscript)
      return `Heard “${lastTranscript}”. Updating the vibe soon.`;
    return "Use the mic to ask for a new mood or genre.";
  }, [
    descriptorState.descriptorSummary,
    descriptorState.error,
    descriptorState.status,
    isSupported,
    isWorldMode,
    lastTranscript,
    voiceError,
  ]);

  const tooltipLabel = isWorldMode
    ? isListening
      ? "Listening…"
      : descriptorHelperText
    : "Voice input is available for curated picks";

  const announcement = truncate(descriptorHelperText);

  const handleVoiceToggle = () => {
    if (!isWorldMode) return;
    if (!isSupported || !recognitionRef.current) {
      setVoiceError("Speech input is not supported in this browser.");
      return;
    }

    try {
      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
        return;
      }

      setVoiceError(null);
      setLastTranscript(null);
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      if (error instanceof DOMException && error.name === "InvalidStateError") {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      setVoiceError("Unable to start speech recognition.");
    }
  };

  const MicIcon = isSupported ? IconMicrophone : IconMicrophoneOff;

  return (
    <div className="flex items-center justify-between gap-4 border-t border-white/8 bg-white/3 px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5">
          <Text size="xs" c="rgba(244,237,224,0.5)" fw={500} style={{ letterSpacing: "0.5px" }}>
            MODE
          </Text>
          <Text size="xs" c="#fefae0" fw={600}>
            {listeningMode === "world" ? "Curated Picks" : "Stay Local"}
          </Text>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip label="Change region" position="top" withArrow>
            <Button
              radius="md"
              size="xs"
              variant="light"
              leftSection={<IconMapPin size={14} />}
              onClick={onQuickRetune}
              style={{
                color: "#0f172a",
                background: "rgba(254,250,226,0.92)",
                border: "1px solid rgba(199,158,73,0.3)",
                fontWeight: 600,
                fontSize: "0.7rem",
                height: "28px",
                padding: "0 10px",
              }}
            >
              Quick retune
            </Button>
          </Tooltip>

          {isWorldMode && (
            <Tooltip label={tooltipLabel} position="top" withArrow>
              <ActionIcon
                size="sm"
                variant={isListening ? "filled" : "subtle"}
                color={isListening ? "yellow" : undefined}
                onClick={handleVoiceToggle}
                aria-pressed={isListening}
                aria-label={
                  isSupported
                    ? "Use voice input to refresh the world descriptor"
                    : "Speech input is not supported"
                }
                style={{ color: isListening ? "#0f172a" : "#e2e8f0" }}
              >
                <MicIcon size={16} />
              </ActionIcon>
            </Tooltip>
          )}
        </div>

        {isWorldMode && (
          <div className="hidden min-w-[160px] max-w-[240px] flex-1 sm:block">
            <Text
              size="xs"
              c="rgba(244,237,224,0.55)"
              style={{ lineHeight: 1.35 }}
            >
              {announcement}
            </Text>
          </div>
        )}
      </div>

      <Tooltip label="Back to world view" position="top" withArrow>
        <ActionIcon
          size="sm"
          variant="subtle"
          onClick={onBackToWorld}
          style={{ color: "#94a3b8" }}
          aria-label="Back to world view"
        >
          <IconArrowLeft size={16} />
        </ActionIcon>
      </Tooltip>

      {isWorldMode && (
        <div className="sr-only" aria-live="polite">
          {announcement}
        </div>
      )}
    </div>
  );
}
