import { useAtmosphereStore } from "~/state/atmosphereStore";
import type { Atmosphere } from "~/utils/atmosphere";

const CHOICES: Atmosphere[] = ["night", "day"];

export function AtmospherePin() {
  const atmosphere = useAtmosphereStore((state) => state.atmosphere);
  const setAtmosphere = useAtmosphereStore((state) => state.setAtmosphere);

  return (
    <div className="ew-atmosphere" role="group" aria-label="Room hour">
      {CHOICES.map((choice, index) => (
        <span key={choice} className="contents">
          {index > 0 ? (
            <i className="ew-atmosphere-meridian" aria-hidden />
          ) : null}
          <button
            type="button"
            className={atmosphere === choice ? "is-active" : ""}
            aria-pressed={atmosphere === choice}
            aria-label={choice === "day" ? "Day room" : "Night room"}
            onClick={() => setAtmosphere(choice)}
          >
            {choice === "day" ? "Day" : "Night"}
          </button>
        </span>
      ))}
    </div>
  );
}
