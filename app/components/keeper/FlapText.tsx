import { Fragment, useLayoutEffect, useMemo, useState } from "react";
import { flapTextPlan } from "./flapTextPlan";

/**
 * A line of the keeper's voice arriving like the board: each character a
 * flap dropping into place, sentence after sentence, then — once every flap
 * has landed — the same words rest as plain serif text. Screen readers get
 * the plain copy only (like FlipBoard). Reduced motion shows it at once.
 */
export function FlapText({
  text,
  className,
  id,
}: {
  text: string;
  className?: string;
  id?: string;
}) {
  const plan = useMemo(() => flapTextPlan(text), [text]);
  const [rolling, setRolling] = useState(false);

  // Layout effect: the new words never paint flat for a frame before rolling.
  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !plan.totalMs) {
      setRolling(false);
      return;
    }
    setRolling(true);
    const timer = window.setTimeout(() => setRolling(false), plan.totalMs + 40);
    return () => window.clearTimeout(timer);
  }, [plan]);

  return (
    <p className={className} id={id}>
      {rolling ? (
        <>
          <span className="sr-only">{text}</span>
          <span className="ew-flaptext" aria-hidden="true">
            {plan.lines.map((line, lineIndex) => (
              <span className="ew-flaptext-line" key={lineIndex}>
                {lineIndex > 0 ? " " : null}
                {line.words.map((word, wordIndex) => (
                  <Fragment key={wordIndex}>
                    {wordIndex > 0 ? " " : null}
                    <span className="ew-flaptext-word">
                      {word.chars.map((char, charIndex) => (
                        <span
                          className="ew-flaptext-char"
                          key={charIndex}
                          style={{ animationDelay: `${char.delay}ms` }}
                        >
                          {char.ch}
                        </span>
                      ))}
                    </span>
                  </Fragment>
                ))}
              </span>
            ))}
          </span>
        </>
      ) : (
        text
      )}
    </p>
  );
}
