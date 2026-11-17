import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshDistortMaterial } from "@react-three/drei";
import type { Mesh } from "three";

/** Lightweight idle sculpture for the hub background. */
export function HubIdle() {
  const ref = useRef<Mesh>(null);

  useFrame((state) => {
    const m = ref.current;
    if (!m) return;
    m.rotation.y = state.clock.elapsedTime * 0.12;
    m.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.15;
  });

  return (
    <mesh ref={ref} position={[2.1, 0.05, -0.4]} scale={1.65}>
      <icosahedronGeometry args={[1.1, 1]} />
      <MeshDistortMaterial
        color="#c8d0d8"
        metalness={1}
        roughness={0.1}
        distort={0.32}
        speed={1.4}
        envMapIntensity={1.35}
      />
    </mesh>
  );
}
