import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { Mesh } from "three";

import { useHydrated } from "~/hooks/useHydrated";

type AISplashScreenProps = {
  onComplete: () => void;
};

const SPLASH_STORAGE_KEY = "rp.aiSplashSeen";
const SPLASH_DURATION_MS = 3200;

function PulsingOrb() {
  const orbRef = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (orbRef.current) {
      orbRef.current.rotation.y += 0.004;
      orbRef.current.rotation.x = Math.sin(t * 0.45) * 0.18;
      const scale = 1 + Math.sin(t * 1.35) * 0.05;
      orbRef.current.scale.setScalar(scale);
    }

    if (ringRef.current) {
      ringRef.current.rotation.x += 0.007;
      ringRef.current.rotation.z += 0.0045;
      const ringScale = 1 + Math.sin(t * 1.1) * 0.08;
      ringRef.current.scale.setScalar(ringScale);
    }
  });

  return (
    <group position={[0, 0.1, 0]}>
      <mesh ref={orbRef}>
        <icosahedronGeometry args={[1.22, 3]} />
        <meshStandardMaterial
          color="#79aeff"
          emissive="#1f5faa"
          emissiveIntensity={0.56}
          roughness={0.36}
          metalness={0.45}
        />
      </mesh>
      <mesh ref={ringRef}>
        <torusGeometry args={[2.05, 0.07, 24, 120]} />
        <meshStandardMaterial
          color="#f3f7ff"
          emissive="#8ab7ff"
          emissiveIntensity={0.26}
          transparent
          opacity={0.74}
        />
      </mesh>
    </group>
  );
}

export function AISplashScreen({ onComplete }: AISplashScreenProps) {
  const hydrated = useHydrated();

  useEffect(() => {
    if (!hydrated) return;

    const timeout = window.setTimeout(() => {
      window.sessionStorage.setItem(SPLASH_STORAGE_KEY, "true");
      onComplete();
    }, SPLASH_DURATION_MS);

    return () => window.clearTimeout(timeout);
  }, [hydrated, onComplete]);

  const background = useMemo(
    () =>
      "radial-gradient(120% 96% at 52% 60%, rgba(245,177,45,0.2), rgba(245,177,45,0) 56%), radial-gradient(85% 65% at 15% 22%, rgba(80,140,204,0.35), rgba(80,140,204,0) 63%), linear-gradient(165deg, #060b1f 0%, #121c35 42%, #1f1c16 68%, #2a1f10 100%)",
    []
  );

  const overlay = useMemo(
    () =>
      "radial-gradient(circle at 50% 54%, rgba(245,177,45,0.14), transparent 45%), radial-gradient(circle at 50% 48%, rgba(93,154,222,0.18), transparent 52%)",
    []
  );

  if (!hydrated) return null;

  return (
    <div
      className="fixed inset-0 z-[250] overflow-y-auto text-white"
      style={{
        background,
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        paddingBottom: "max(1.1rem, env(safe-area-inset-bottom))",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="AI Radio Browser intro"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: overlay }}
      />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col items-center justify-center px-6 py-6 text-center">
        <div className="relative h-[180px] w-[180px] sm:h-[220px] sm:w-[220px]">
          <Canvas camera={{ position: [0, 0, 5], fov: 42 }}>
            <ambientLight intensity={0.65} />
            <directionalLight position={[2, 3, 4]} intensity={1.05} />
            <directionalLight position={[-2, -3, -4]} intensity={0.32} />
            <PulsingOrb />
          </Canvas>
        </div>

        <p className="mt-3 text-[10px] uppercase tracking-[0.34em] text-[#c9d5e9]">
          AI Radio Browser
        </p>
        <h1 className="mt-2 max-w-xl text-[clamp(1.9rem,7vw,3.2rem)] font-semibold leading-[1.08] tracking-tight text-[#f4f0e8]">
          Discover unknown tracks. Understand every station.
        </h1>
        <p className="mt-3 max-w-lg text-[clamp(1rem,3.8vw,1.15rem)] leading-relaxed text-[#d1d8e7]">
          We use AI to identify what is playing, surface artist context, and
          turn passive listening into a guided music journey.
        </p>

        <button
          type="button"
          onClick={() => {
            window.sessionStorage.setItem(SPLASH_STORAGE_KEY, "true");
            onComplete();
          }}
          className="mt-7 rounded-full border border-[#f5b12d]/50 bg-[#10182f]/50 px-7 py-2.5 text-xs font-semibold uppercase tracking-[0.22em] text-[#f7e8ca] transition hover:bg-[#142242]/60"
        >
          Enter experience
        </button>
      </div>
    </div>
  );
}

export function shouldShowAISplash() {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(SPLASH_STORAGE_KEY) !== "true";
}
