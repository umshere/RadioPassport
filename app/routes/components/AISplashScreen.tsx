import { useEffect, useMemo, useState } from "react";

import { useHydrated } from "~/hooks/useHydrated";

type AISplashScreenProps = {
  onComplete: () => void;
};

type SignalDot = {
  id: number;
  x: number;
  y: number;
  delay: number;
  duration: number;
  strength: number;
};

const SPLASH_STORAGE_KEY = "rp.aiSplashSeen";
const SPLASH_DURATION_MS = 3200;
const DOT_ROWS = 9;
const DOT_COLUMNS = 15;

function createSignalDots() {
  const dots: SignalDot[] = [];

  for (let row = 0; row < DOT_ROWS; row += 1) {
    for (let column = 0; column < DOT_COLUMNS; column += 1) {
      const index = row * DOT_COLUMNS + column;
      const x = (column / (DOT_COLUMNS - 1)) * 100;
      const y = (row / (DOT_ROWS - 1)) * 100;
      const centerBias =
        1 -
        Math.min(
          1,
          Math.hypot(column - (DOT_COLUMNS - 1) / 2, row - (DOT_ROWS - 1) / 2) /
            8
        );

      dots.push({
        id: index,
        x,
        y,
        delay: (index % 9) * 0.12,
        duration: 3.2 + (index % 5) * 0.22,
        strength: 0.35 + centerBias * 0.75,
      });
    }
  }

  return dots;
}

const SIGNAL_DOTS = createSignalDots();

export function AISplashScreen({ onComplete }: AISplashScreenProps) {
  const hydrated = useHydrated();
  const [pointer, setPointer] = useState({ x: 50, y: 42 });

  useEffect(() => {
    if (!hydrated) return;

    const timeout = window.setTimeout(() => {
      window.sessionStorage.setItem(SPLASH_STORAGE_KEY, "true");
      onComplete();
    }, SPLASH_DURATION_MS);

    return () => window.clearTimeout(timeout);
  }, [hydrated, onComplete]);

  useEffect(() => {
    if (!hydrated) return;

    const handlePointerMove = (event: PointerEvent) => {
      const x = (event.clientX / window.innerWidth) * 100;
      const y = (event.clientY / window.innerHeight) * 100;
      setPointer({ x, y });
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [hydrated]);

  const background = useMemo(
    () =>
      [
        "radial-gradient(circle at 12% 18%, rgba(31,90,170,0.22), transparent 28%)",
        "radial-gradient(circle at 84% 20%, rgba(245,177,45,0.15), transparent 24%)",
        "radial-gradient(circle at 50% 62%, rgba(214,128,41,0.12), transparent 32%)",
        "linear-gradient(180deg, #05070d 0%, #090d17 32%, #0b111d 62%, #070a12 100%)",
      ].join(", "),
    []
  );

  const fieldGlow = useMemo(
    () =>
      `radial-gradient(circle at ${pointer.x}% ${pointer.y}%, rgba(246, 192, 77, 0.22), transparent 18%)`,
    [pointer.x, pointer.y]
  );

  if (!hydrated) return null;

  return (
    <div
      className="fixed inset-0 z-[250] overflow-hidden text-white"
      style={{
        background,
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Radio Passport intro"
    >
      <style>{`
        @keyframes rp-signal-pulse {
          0%, 100% {
            opacity: 0.3;
            transform: translate(-50%, -50%) scale(0.9);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.18);
          }
        }

        @keyframes rp-panel-rise {
          0% {
            opacity: 0;
            transform: translateY(18px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes rp-field-drift {
          0%, 100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(0, -8px, 0);
          }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 opacity-70" style={{ background: fieldGlow }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,transparent,rgba(0,0,0,0.48))]" />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-7xl flex-col justify-between px-5 py-5 sm:px-8 sm:py-7">
        <div className="flex items-start justify-between gap-4">
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.34em] text-white/65 backdrop-blur-md">
            Radio Passport
          </div>
          <div className="hidden rounded-full border border-[#f5b12d]/20 bg-[#0f1726]/70 px-4 py-2 text-[11px] uppercase tracking-[0.26em] text-[#f4d08f] shadow-[0_0_40px_rgba(245,177,45,0.08)] backdrop-blur-md sm:block">
            Passport Control Open
          </div>
        </div>

        <div className="relative flex flex-1 items-center justify-center py-10">
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className="relative h-[min(60vw,28rem)] w-[min(88vw,62rem)]"
              style={{ animation: "rp-field-drift 7s ease-in-out infinite" }}
            >
              <div className="absolute inset-[6%] rounded-[2rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] shadow-[0_0_120px_rgba(13,45,92,0.22)] backdrop-blur-[2px]" />
              <div className="absolute inset-[10%] rounded-[1.7rem] border border-[#f5b12d]/10 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02),transparent_68%)]" />

              {SIGNAL_DOTS.map((dot) => (
                <span
                  key={dot.id}
                  className="absolute h-2.5 w-2.5 rounded-full"
                  style={{
                    left: `${dot.x}%`,
                    top: `${dot.y}%`,
                    background:
                      dot.id % 6 === 0
                        ? "rgba(245,177,45,0.95)"
                        : "rgba(120,174,255,0.92)",
                    boxShadow:
                      dot.id % 6 === 0
                        ? "0 0 16px rgba(245,177,45,0.65)"
                        : "0 0 16px rgba(120,174,255,0.55)",
                    opacity: 0.28 + dot.strength * 0.44,
                    animation: `rp-signal-pulse ${dot.duration}s ease-in-out ${dot.delay}s infinite`,
                    transform: "translate(-50%, -50%)",
                  }}
                />
              ))}

              <div className="absolute left-1/2 top-1/2 h-[52%] w-[36%] -translate-x-1/2 -translate-y-1/2 rounded-[999px] border border-white/10 bg-[radial-gradient(circle_at_center,rgba(91,154,230,0.28),rgba(9,15,27,0.04)_58%,transparent_78%)] blur-[2px]" />
              <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#f5b12d]/20 bg-[radial-gradient(circle_at_center,rgba(246,196,89,0.34),rgba(246,196,89,0.07)_45%,transparent_72%)] shadow-[0_0_120px_rgba(246,196,89,0.18)]" />
            </div>
          </div>

          <div
            className="relative z-10 mx-auto max-w-3xl text-center"
            style={{ animation: "rp-panel-rise 700ms ease-out both" }}
          >
            <p className="text-[10px] uppercase tracking-[0.42em] text-[#c8d1e0] sm:text-[11px]">
              Stampbook For Live Radio
            </p>
            <h1 className="mx-auto mt-4 max-w-4xl text-[clamp(2.5rem,7.4vw,6rem)] font-semibold leading-[0.95] tracking-[-0.04em] text-[#f7f3ea]">
              Carry the dial
              <span className="block text-[#d5deeb]">like a passport.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-[clamp(1rem,2.2vw,1.2rem)] leading-relaxed text-white/66">
              Collect stations like border stamps, retune across cities, and turn
              every frequency change into a new arrival.
            </p>
          </div>
        </div>

        <div
          className="mx-auto w-full max-w-4xl"
          style={{ animation: "rp-panel-rise 820ms ease-out both" }}
        >
          <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(10,15,26,0.88),rgba(7,10,18,0.94))] p-3 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-[1.25fr_1fr_1fr_1fr_auto] md:items-center">
              <div className="col-span-2 rounded-[1.4rem] border border-white/8 bg-white/4 px-4 py-4 md:col-span-1">
                <div className="text-[10px] uppercase tracking-[0.32em] text-white/42">
                  Radio Passport
                </div>
                <div className="mt-2 text-lg font-medium text-[#f8f1e6]">
                  Your listening visa is ready.
                </div>
                <div className="mt-1 text-sm text-white/48">
                  Tune in, stamp a destination, move to the next border.
                </div>
              </div>

              {[
                { label: "Stations", value: "51k+" },
                { label: "Countries", value: "80" },
                { label: "Borderless", value: "24/7" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] px-4 py-4 text-center"
                >
                  <div className="text-lg font-semibold tracking-[-0.03em] text-[#f5d18b]">
                    {item.value}
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.28em] text-white/45">
                    {item.label}
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => {
                  window.sessionStorage.setItem(SPLASH_STORAGE_KEY, "true");
                  onComplete();
                }}
                className="col-span-2 rounded-[1.4rem] border border-[#f5b12d]/30 bg-[linear-gradient(135deg,#f0b333,#d88c2f)] px-5 py-4 text-sm font-semibold uppercase tracking-[0.24em] text-[#0b0d13] transition hover:brightness-105 md:col-span-1"
              >
                Start Journey
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function shouldShowAISplash() {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(SPLASH_STORAGE_KEY) !== "true";
}
