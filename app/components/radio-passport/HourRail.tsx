import type { SolarHour } from "~/utils/localTime";

const HOURS: SolarHour[] = ["Dawn", "Midday", "Dusk", "Night"];

function HourIcon({ hour }: { hour: SolarHour }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    "aria-hidden": true,
    className: "ew-hour-icon",
  } as const;
  switch (hour) {
    case "Dawn":
      return (
        <svg {...common}>
          <path d="M4 17h16" />
          <path d="M8.5 17a3.5 3.5 0 0 1 7 0" />
          <path d="M12 10.5V7" />
          <path d="M10.8 8.2 12 7l1.2 1.2" />
          <path d="M7.6 12.6 6 11" />
          <path d="M16.4 12.6 18 11" />
        </svg>
      );
    case "Midday":
      return (
        <svg {...common}>
          <circle cx="12" cy="11" r="3.2" />
          <path d="M12 4.5v1.8" />
          <path d="M12 15.7v1.3" />
          <path d="M5.5 11h1.8" />
          <path d="M16.7 11h1.8" />
          <path d="M7.4 6.4l1.3 1.3" />
          <path d="M15.3 14.3l1.3 1.3" />
          <path d="M16.6 6.4l-1.3 1.3" />
          <path d="M8.7 14.3l-1.3 1.3" />
          <path d="M5 20h14" />
        </svg>
      );
    case "Dusk":
      return (
        <svg {...common}>
          <path d="M4 17h16" />
          <path d="M8.5 17a3.5 3.5 0 0 1 7 0" />
          <path d="M12 10.5V8" />
          <path d="M7.6 12.6 6 11" />
          <path d="M16.4 12.6 18 11" />
          <path d="M6.2 15.2 4.8 16" />
          <path d="M17.8 15.2l1.4.8" />
        </svg>
      );
    case "Night":
      return (
        <svg {...common}>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      );
  }
}

/**
 * The horizon as one pill rail: four icon stops, one glowing cursor.
 * Behavior is the old hour chips exactly (toggle + clear intent); only the
 * face changed. Icons are aria-hidden so each button still names its hour.
 */
export function HourRail({
  hour,
  onTap,
}: {
  hour: SolarHour | null;
  onTap: (item: SolarHour) => void;
}) {
  const activeIndex = hour ? HOURS.indexOf(hour) : -1;
  return (
    <div
      className="ew-hours"
      data-active={activeIndex}
      role="group"
      aria-label="Solar hour"
    >
      {HOURS.map((item) => (
        <button
          type="button"
          key={item}
          className={`ew-hour${hour === item ? " on" : ""}`}
          data-hour={item.toLowerCase()}
          aria-pressed={hour === item}
          title={`Cities where it is ${item.toLowerCase()} now`}
          onClick={() => onTap(item)}
        >
          <HourIcon hour={item} />
          <span className="ew-hour-label">{item}</span>
          <i className="ew-hour-dot" aria-hidden="true" />
        </button>
      ))}
      <i className="ew-hours-cursor" aria-hidden="true" />
    </div>
  );
}
