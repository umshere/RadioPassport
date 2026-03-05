import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import type { Mesh } from "three";

import { useHydrated } from "~/hooks/useHydrated";

type AISplashScreenProps = {
  onComplete: () => void;
};

const SPLASH_STORAGE_KEY = "rp.aiSplashSeen";
const SPLASH_DURATION_MS = 2800;

function PulsingOrb() {
  const orbRef = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (orbRef.current) {
      orbRef.current.rotation.y += 0.003;
      orbRef.current.rotation.x = Math.sin(t * 0.35) * 0.2;
      const scale = 1 + Math.sin(t * 1.4) * 0.04;
      orbRef.current.scale.setScalar(scale);
    }

    if (ringRef.current) {
      ringRef.current.rotation.x += 0.006;
      ringRef.current.rotation.z += 0.004;
      const ringScale = 1 + Math.sin(t * 1.1) * 0.08;
      ringRef.current.scale.setScalar(ringScale);
    }
  });

  return (
    <group>
      <mesh ref={orbRef}>
        <icosahedronGeometry args={[1.25, 2]} />
        <meshStandardMaterial color="#7dd3fc" emissive="#1d4ed8" emissiveIntensity={0.55} roughness={0.35} metalness={0.45} />
      </mesh>
      <mesh ref={ringRef}>
        <torusGeometry args={[2.05, 0.07, 24, 120]} />
        <meshStandardMaterial color="#bfdbfe" emissive="#60a5fa" emissiveIntensity={0.35} transparent opacity={0.7} />
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
      "radial-gradient(circle at 20% 20%, rgba(56,189,248,0.28), transparent 45%), radial-gradient(circle at 80% 0%, rgba(59,130,246,0.18), transparent 50%), linear-gradient(145deg, #020617 0%, #0b1120 45%, #172554 100%)",
    []
  );

  if (!hydrated) return null;

  return (
    <div
      className="fixed inset-0 z-[250] flex flex-col items-center justify-center px-6 text-center text-white"
      style={{ background }}
      role="dialog"
      aria-label="AI Radio Browser intro"
    >
      <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(circle_at_center,rgba(148,163,184,0.2),transparent_55%)]" />

      <div className="relative h-[200px] w-[200px] md:h-[250px] md:w-[250px]">
        <Canvas camera={{ position: [0, 0, 5], fov: 42 }}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[2, 3, 4]} intensity={1.1} />
          <directionalLight position={[-2, -3, -4]} intensity={0.35} />
          <PulsingOrb />
        </Canvas>
      </div>

      <p className="mt-6 text-[10px] uppercase tracking-[0.35em] text-sky-200/90">AI Radio Browser</p>
      <h1 className="mt-2 max-w-xl text-2xl font-semibold tracking-tight md:text-4xl">Discover unknown tracks. Understand every station.</h1>
      <p className="mt-3 max-w-lg text-sm text-slate-200/85 md:text-base">
        We use AI to identify what is playing, surface artist context, and turn passive listening into a guided music journey.
      </p>

      <button
        type="button"
        onClick={() => {
          window.sessionStorage.setItem(SPLASH_STORAGE_KEY, "true");
          onComplete();
        }}
        className="mt-8 rounded-full border border-sky-200/45 bg-slate-950/35 px-5 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-100 transition hover:bg-slate-950/60"
      >
        Enter experience
      </button>
    </div>
  );
}

export function shouldShowAISplash() {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(SPLASH_STORAGE_KEY) !== "true";
}
