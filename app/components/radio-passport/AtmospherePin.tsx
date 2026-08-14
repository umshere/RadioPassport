import { useAtmosphereStore } from "~/state/atmosphereStore";
import { nextAtmosphere, type Atmosphere } from "~/utils/atmosphere";

const CHOICES: Atmosphere[] = ["night", "day"];

export function AtmospherePin() {
  const atmosphere = useAtmosphereStore((state) => state.atmosphere);
  const setAtmosphere = useAtmosphereStore((state) => state.setAtmosphere);
  const next = nextAtmosphere(atmosphere);

  return (
    <>
      <div className="ew-atmosphere ew-atmosphere--split" role="group" aria-label="Room hour">
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
      <button
        type="button"
        className={`ew-atmosphere-icon is-${atmosphere}`}
        aria-label={
          atmosphere === "day"
            ? "Day room. Switch to night."
            : "Night room. Switch to day."
        }
        onClick={() => setAtmosphere(next)}
      >
        <span className="ew-atmosphere-icon__track" aria-hidden>
          <i />
        </span>
      </button>
    </>
  );
}
