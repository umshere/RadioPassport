import { Suspense, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group, Mesh } from "three";
import { Vector3 } from "three";

import type { SceneComponent } from "./types";

const GLOBE_RADIUS = 2.4;
const MARKER_BASE_SCALE = 0.055;

function getAnimationPreset(animation?: string | null) {
  const key = animation?.trim().toLowerCase().replace(/[_\s]+/g, "-") ?? "";

  switch (key) {
    case "slow-pan":
      return { rotationSpeed: 0.08, markerColor: "#e9ecef" };
    case "cascade-drop":
      return { rotationSpeed: 0.18, markerColor: "#ffd8a8" };
    case "sunrise-spin":
      return { rotationSpeed: 0.22, markerColor: "#fff3bf" };
    case "slow-orbit":
    default:
      return { rotationSpeed: 0.12, markerColor: "#f8f9fa" };
  }
}

function hashToRange(seed: string, min: number, max: number) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const normalized = (Math.sin(hash) + 1) / 2;
  return min + normalized * (max - min);
}

function latLongFromStation(seed: string) {
  const lat = hashToRange(seed, -60, 75);
  const lon = hashToRange(`${seed}-lon`, -180, 180);
  return { lat, lon };
}

function pointFromLatLong(lat: number, lon: number, radius: number) {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  const x = radius * Math.cos(latRad) * Math.cos(lonRad);
  const y = radius * Math.sin(latRad);
  const z = radius * Math.cos(latRad) * Math.sin(lonRad);
  return new Vector3(x, y, z);
}

type StationMarkerProps = {
  position: Vector3;
  isActive: boolean;
  onClick: () => void;
  color: string;
};

const StationMarker = ({ position, isActive, onClick, color }: StationMarkerProps) => {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const scale = useMemo(() => {
    const base = MARKER_BASE_SCALE * (isActive ? 1.9 : 1);
    return base + (hovered ? MARKER_BASE_SCALE * 0.7 : 0);
  }, [isActive, hovered]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.lookAt(0, 0, 0);
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      scale={scale}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[1, 12, 12]} />
      <meshStandardMaterial color={isActive ? "#ffec99" : color} emissive={isActive ? "#ffd43b" : color} />
    </mesh>
  );
};

type GlobeSurfaceProps = {
  mood?: string | null;
};

const GlobeSurface = ({ mood }: GlobeSurfaceProps) => {
  const palette = useMemo(() => {
    switch ((mood ?? "").toLowerCase()) {
      case "night":
        return { color: "#1f2b3a", emissive: "#0b1020" };
      case "sunrise":
        return { color: "#ff9e80", emissive: "#ff6b6b" };
      case "lush":
        return { color: "#88c0d0", emissive: "#5e81ac" };
      default:
        return { color: "#6fb3f2", emissive: "#1c7ed6" };
    }
  }, [mood]);

  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
      <meshStandardMaterial color={palette.color} emissive={palette.emissive} metalness={0.2} roughness={0.7} />
    </mesh>
  );
};

const GlobeContent = ({
  descriptor,
  onStationSelect,
  activeStationId,
}: {
  descriptor: Parameters<SceneComponent>[0]["descriptor"];
  onStationSelect?: Parameters<SceneComponent>[0]["onStationSelect"];
  activeStationId?: Parameters<SceneComponent>[0]["activeStationId"];
}) => {
  const rotationGroup = useRef<Group>(null);
  const animationPreset = useMemo(() => getAnimationPreset(descriptor.animation), [descriptor.animation]);

  const rotationSpeed = animationPreset.rotationSpeed;

  useFrame((_, delta) => {
    if (rotationGroup.current) {
      rotationGroup.current.rotation.y += delta * rotationSpeed;
    }
  });

  const markerColor = animationPreset.markerColor;

  const markerPositions = useMemo(() => {
    return descriptor.stations.map((station) => {
      const seed = `${station.uuid}-${station.countryCode ?? station.country ?? station.name}`;
      const { lat, lon } = latLongFromStation(seed);
      const position = pointFromLatLong(lat, lon, GLOBE_RADIUS + 0.22);
      return { station, position };
    });
  }, [descriptor.stations]);

  return (
    <group ref={rotationGroup}>
      <GlobeSurface mood={descriptor.mood} />
      {markerPositions.map(({ station, position }) => (
        <StationMarker
          key={station.uuid}
          position={position}
          color={markerColor}
          isActive={station.uuid === activeStationId}
          onClick={() => onStationSelect?.(station)}
        />
      ))}
    </group>
  );
};

const GlobeScene: SceneComponent = ({ descriptor, onStationSelect, activeStationId, className }) => {
  const gradientBackground = useMemo(() => {
    switch ((descriptor.mood ?? "").toLowerCase()) {
      case "night":
        return "radial-gradient(circle at 30% 30%, #1f2933, #0b1020)";
      case "sunrise":
        return "radial-gradient(circle at 70% 20%, #ffe066, #f76707)";
      case "lush":
        return "radial-gradient(circle at 50% 50%, #81c784, #1b5e20)";
      default:
        return "radial-gradient(circle at 50% 50%, #74c0fc, #1c7ed6)";
    }
  }, [descriptor.mood]);

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: gradientBackground,
        overflow: "hidden",
        borderRadius: "1.5rem",
        boxShadow: "0 25px 60px rgba(15, 35, 70, 0.35)",
      }}
    >
      <Canvas camera={{ position: [0, 0, 7], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1.1} />
        <directionalLight position={[-5, -5, -5]} intensity={0.4} />
        <Suspense fallback={null}>
          <GlobeContent descriptor={descriptor} onStationSelect={onStationSelect} activeStationId={activeStationId} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default GlobeScene;
