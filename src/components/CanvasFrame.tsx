import { Suspense, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";

type Props = {
  children: ReactNode;
  className?: string;
  camera?: { position?: [number, number, number]; fov?: number };
  environment?: boolean;
  /** Solid scene colour. `null` leaves the canvas transparent (CSS shows through). */
  background?: string | null;
};

function SoftEnv() {
  return (
    <Environment resolution={256}>
      <Lightformer
        form="rect"
        intensity={4}
        position={[5, 4, 3]}
        scale={[8, 2, 1]}
        color="#ffffff"
      />
      <Lightformer
        form="rect"
        intensity={2.4}
        position={[-5, 2, 1]}
        scale={[6, 3, 1]}
        color="#dce6ef"
      />
      <Lightformer
        form="rect"
        intensity={1.2}
        position={[0, 5, -4]}
        scale={[10, 2, 1]}
        color="#ffffff"
      />
      <Lightformer
        form="ring"
        intensity={0.7}
        position={[0, -2, -3]}
        scale={6}
        color="#8a9aa8"
      />
    </Environment>
  );
}

export function CanvasFrame({
  children,
  className = "demo-canvas",
  camera = { position: [0, 0.2, 4.2], fov: 42 },
  environment = true,
  background = "#070708",
}: Props) {
  return (
    <div className={className}>
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={camera}
      >
        {background ? <color attach="background" args={[background]} /> : null}
        <ambientLight intensity={0.25} />
        <Suspense fallback={null}>
          {environment ? <SoftEnv /> : null}
          {children}
        </Suspense>
      </Canvas>
    </div>
  );
}
