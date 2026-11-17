import { Environment, Lightformer } from "@react-three/drei";
import { BackSide } from "three";

/** Bright studio: lots of hard strips so polished metal has something to reflect. */
export function StudioEnv({ intensity = 1 }: { intensity?: number }) {
  return (
    <Environment resolution={512} environmentIntensity={intensity}>
      {/* mid-grey dome: gives polished metal tonal range between the strips */}
      <mesh scale={60}>
        <sphereGeometry args={[1, 32, 16]} />
        <shaderMaterial
          side={BackSide}
          toneMapped={false}
          vertexShader={`varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`}
          fragmentShader={`varying vec3 vP; void main(){ float h = vP.y * 0.5 + 0.5; vec3 lo = vec3(0.01,0.012,0.016); vec3 mid = vec3(0.10,0.115,0.14); vec3 hi = vec3(0.55,0.6,0.68); vec3 c = mix(lo, mid, smoothstep(0.1,0.55,h)); c = mix(c, hi, smoothstep(0.55,1.0,h)); gl_FragColor = vec4(c,1.0); }`}
        />
      </mesh>
      <Lightformer
        form="rect"
        intensity={5}
        position={[0, 6, 1]}
        rotation-x={Math.PI / 2}
        scale={[12, 5, 1]}
        color="#ffffff"
      />
      <Lightformer
        form="rect"
        intensity={3.4}
        position={[-6, 1.5, 1]}
        rotation-y={Math.PI / 2}
        scale={[2.2, 8, 1]}
        color="#ffffff"
      />
      <Lightformer
        form="rect"
        intensity={3.4}
        position={[6, 1.5, -1]}
        rotation-y={-Math.PI / 2}
        scale={[2.2, 8, 1]}
        color="#dfe9ff"
      />
      <Lightformer
        form="rect"
        intensity={3.2}
        position={[0, 2, -7]}
        scale={[14, 3, 1]}
        color="#ffffff"
      />
      <Lightformer
        form="ring"
        intensity={4}
        position={[3, 3, 5]}
        scale={3}
        color="#fff4e0"
      />
      <Lightformer
        form="rect"
        intensity={0.7}
        position={[0, -4, 2]}
        rotation-x={-Math.PI / 2}
        scale={[10, 6, 1]}
        color="#8a9aa8"
      />
    </Environment>
  );
}
