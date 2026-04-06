import {
  ActionIcon,
  Badge,
  Slider,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconPlayerPlayFilled,
  IconPlayerPauseFilled,
  IconPlayerStopFilled,
  IconVolume,
  IconVolumeOff,
  IconPlayerTrackNext,
  IconPlayerTrackPrev,
} from "@tabler/icons-react";
import type { Station } from "~/types/radio";
import { usePlayerStore } from "~/state/playerStore";

type NowPlayingProps = {
  station: Station | null;
  onNext?: () => void;
  onPrevious?: () => void;
};

function getFallbackInitials(name: string | null | undefined): string {
  if (!name) return "FM";
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .trim()
    .toUpperCase();
  return initials || "FM";
}

export function NowPlaying({ station, onNext, onPrevious }: NowPlayingProps) {
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const volume = usePlayerStore((state) => state.volume);
  const togglePlay = usePlayerStore((state) => state.togglePlay);
  const setVolume = usePlayerStore((state) => state.setVolume);
  const stop = usePlayerStore((state) => state.stop);

  if (!station) return null;

  const handleVolumeChange = (value: number) => {
    setVolume(value / 100);
  };

  return (
    <aside
      className="now-playing-panel"
      style={{
        position: "sticky",
        background: "rgba(2,6,23,0.96)",
        borderRadius: "1.35rem",
        border: "1.5px solid rgba(148,163,184,0.32)",
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.4rem",
        boxShadow: "0 35px 80px rgba(3, 7, 18, 0.6)",
        top: "2.75rem",
        maxHeight: "min(640px, 70vh)",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
        <Badge
          size="xs"
          color={isPlaying ? "green" : "gray"}
          variant="filled"
          style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}
        >
          {isPlaying ? "Playing" : "Paused"}
        </Badge>
      </div>

      <div
        style={{
          width: "100%",
          borderRadius: "1.1rem",
          border: "1px solid rgba(255,255,255,0.1)",
          padding: 0,
          overflow: "hidden",
          boxShadow: "0 25px 45px rgba(8, 20, 52, 0.45)",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "180px",
            backgroundImage: station.favicon ? `url(${station.favicon})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(248,250,252,0.96)",
            fontSize: "3rem",
            fontWeight: 700,
            letterSpacing: "0.05em",
          }}
        >
          {!station.favicon && getFallbackInitials(station.name)}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <Text size="lg" fw={600} c="#f8fafc" lineClamp={2}>
          {station.name}
        </Text>
        <Text size="sm" c="gray.5" lineClamp={1}>
          {station.country}, {station.state}
        </Text>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.1rem",
          padding: "1.15rem 0.75rem",
          borderTop: "1px solid rgba(148,163,184,0.22)",
          borderBottom: "1px solid rgba(148,163,184,0.22)",
        }}
      >
        <Tooltip label={onPrevious ? "Previous" : ""} withArrow>
          <ActionIcon
            onClick={onPrevious}
            size="lg"
            radius="xl"
            disabled={!onPrevious}
            className="transform transition-transform duration-150 hover:scale-105 active:scale-95"
          >
            <IconPlayerTrackPrev size={20} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={isPlaying ? "Pause" : "Play"} withArrow>
          <ActionIcon
            onClick={togglePlay}
            size="xl"
            radius="xl"
            className="transform transition-transform duration-150 hover:scale-105 active:scale-95"
          >
            {isPlaying ? <IconPlayerPauseFilled size={24} /> : <IconPlayerPlayFilled size={24} />}
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Stop" withArrow>
          <ActionIcon
            onClick={stop}
            size="lg"
            radius="xl"
            className="transform transition-transform duration-150 hover:scale-105 active:scale-95"
          >
            <IconPlayerStopFilled size={20} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={onNext ? "Next" : ""} withArrow>
          <ActionIcon
            onClick={onNext}
            size="lg"
            radius="xl"
            disabled={!onNext}
            className="transform transition-transform duration-150 hover:scale-105 active:scale-95"
          >
            <IconPlayerTrackNext size={20} />
          </ActionIcon>
        </Tooltip>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <IconVolumeOff size={20} />
        <Slider
          value={volume * 100}
          onChange={handleVolumeChange}
          style={{ flex: 1 }}
          aria-label="Volume control"
        />
        <IconVolume size={20} />
      </div>
    </aside>
  );
}
