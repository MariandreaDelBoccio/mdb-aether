import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import {
  Color,
  Mesh,
  MeshPhysicalMaterial,
  Vector3,
  type WebGLProgramParametersWithUniforms,
} from "three";
import { CanvasFrame } from "../components/CanvasFrame";
import { DemoChrome } from "../components/DemoChrome";
import { StudioEnv } from "../components/StudioEnv";
import { useI18n } from "../i18n";
import { useReducedMotion } from "../hooks";
import { SIMPLEX_NOISE } from "../glsl";

type MatKey = 0 | 1 | 2;

const MATS = [
  // Chrome — mirror, white
  {
    color: "#f4f7fb",
    metalness: 1,
    roughness: 0.09,
    clearcoat: 0,
    env: 1.6,
  },
  // Gold
  {
    color: "#f2c26b",
    metalness: 1,
    roughness: 0.07,
    clearcoat: 0.3,
    env: 1.5,
  },
  // Obsidian — glossy black glass: reads through its highlights
  {
    color: "#060608",
    metalness: 0.15,
    roughness: 0.04,
    clearcoat: 1,
    env: 2.4,
  },
] as const;

const R = 1.15;

/** Object-space displacement for the liquid blob. */
const DISPLACE = /* glsl */ `
uniform float uTime;
uniform vec3 uPoint;
uniform float uHover;
uniform vec3 uSplashDir;
uniform float uSplashT;
uniform float uSplashAmp;
uniform float uFlow;

vec3 aeDisplace(vec3 n){
  float flow =
    snoise(n * 0.85 + vec3(0.0, uTime * 0.12, 0.0)) * 0.13 +
    snoise(n * 1.7 - vec3(uTime * 0.16, 0.0, 0.0)) * 0.035;
  flow *= uFlow;

  float d = acos(clamp(dot(n, normalize(uPoint)), -1.0, 1.0));
  float ripple = sin(d * 15.0 - uTime * 7.0) * exp(-d * 3.4) * uHover * 0.085;
  float bump = exp(-d * d * 9.0) * uHover * 0.17;

  float sd = acos(clamp(dot(n, normalize(uSplashDir)), -1.0, 1.0));
  float age = max(uTime - uSplashT, 0.0);
  float splash = sin(sd * 13.0 - age * 10.0) * exp(-sd * 1.9) * exp(-age * 1.5) * uSplashAmp * 0.2;
  splash += exp(-sd * sd * 5.0) * exp(-age * 2.2) * uSplashAmp * 0.2;

  return n * (${R.toFixed(2)} + flow + ripple + bump + splash);
}
`;

type Uniforms = {
  uTime: { value: number };
  uPoint: { value: Vector3 };
  uHover: { value: number };
  uSplashDir: { value: Vector3 };
  uSplashT: { value: number };
  uSplashAmp: { value: number };
  uFlow: { value: number };
};

function useLiquidMaterial(uniforms: Uniforms) {
  return useMemo(() => {
    const m = new MeshPhysicalMaterial();
    m.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>\n${SIMPLEX_NOISE}\n${DISPLACE}`,
        )
        .replace(
          "#include <beginnormal_vertex>",
          /* glsl */ `
          vec3 aeN = normalize(position);
          vec3 aeT = normalize(cross(aeN, abs(aeN.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
          vec3 aeB = cross(aeN, aeT);
          vec3 aeP0 = aeDisplace(aeN);
          vec3 aeP1 = aeDisplace(normalize(aeN + aeT * 0.012));
          vec3 aeP2 = aeDisplace(normalize(aeN + aeB * 0.012));
          vec3 objectNormal = normalize(cross(aeP1 - aeP0, aeP2 - aeP0));
          `,
        )
        .replace(
          "#include <begin_vertex>",
          "vec3 transformed = aeP0;",
        );
    };
    m.customProgramCacheKey = () => "aether-liquid-v1";
    return m;
  }, [uniforms]);
}

function Blob({ mat, reduced }: { mat: MatKey; reduced: boolean }) {
  const mesh = useRef<Mesh>(null);
  const uniforms = useMemo<Uniforms>(
    () => ({
      uTime: { value: 0 },
      uPoint: { value: new Vector3(0, 0, 1) },
      uHover: { value: 0 },
      uSplashDir: { value: new Vector3(0, 0, 1) },
      uSplashT: { value: -100 },
      uSplashAmp: { value: 0 },
      uFlow: { value: reduced ? 0.25 : 1 },
    }),
    [reduced],
  );
  const material = useLiquidMaterial(uniforms);

  const hoverTarget = useRef(0);
  const pointTarget = useMemo(() => new Vector3(0, 0, 1), []);
  const tmp = useMemo(() => new Vector3(), []);

  useEffect(() => {
    const c = MATS[mat];
    material.color = new Color(c.color);
    material.metalness = c.metalness;
    material.roughness = c.roughness;
    material.clearcoat = c.clearcoat;
    material.clearcoatRoughness = 0.04;
    material.envMapIntensity = c.env;
    material.needsUpdate = true;
  }, [mat, material]);

  useFrame((state, dt) => {
    const k = 1 - Math.exp(-Math.min(dt, 0.1) * 7);
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uHover.value += (hoverTarget.current - uniforms.uHover.value) * k;
    uniforms.uPoint.value.lerp(pointTarget, k).normalize();
  });

  const toLocal = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    const m = mesh.current;
    if (!m) return null;
    tmp.copy(e.point);
    m.worldToLocal(tmp);
    return tmp.normalize();
  };

  return (
    <mesh
      ref={mesh}
      material={material}
      frustumCulled={false}
      onPointerOver={() => {
        if (!reduced) hoverTarget.current = 1;
      }}
      onPointerOut={() => {
        hoverTarget.current = 0;
      }}
      onPointerMove={(e) => {
        if (reduced) return;
        const p = toLocal(e);
        if (p) pointTarget.copy(p);
      }}
      onClick={(e) => {
        if (reduced) return;
        const p = toLocal(e);
        if (!p) return;
        uniforms.uSplashDir.value.copy(p);
        uniforms.uSplashT.value = uniforms.uTime.value;
        uniforms.uSplashAmp.value = 1;
      }}
    >
      <sphereGeometry args={[1, 256, 192]} />
    </mesh>
  );
}

export function LiquidMetal() {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const [mat, setMat] = useState<MatKey>(0);
  const labels = t.demos["liquid-metal"].materials ?? [];

  return (
    <div className="demo-page demo-liquid">
      <CanvasFrame
        environment={false}
        background={null}
        camera={{ position: [0, 0.35, 5.9], fov: 36 }}
      >
        <StudioEnv />
        <Blob mat={mat} reduced={reduced} />
        <ContactShadows
          position={[0, -1.5, 0]}
          opacity={0.55}
          scale={9}
          blur={2.8}
          far={3}
          color="#000"
        />
        <OrbitControls
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={3.4}
          maxDistance={8.5}
          rotateSpeed={0.9}
          autoRotate={!reduced}
          autoRotateSpeed={0.5}
          maxPolarAngle={Math.PI * 0.62}
        />
      </CanvasFrame>
      <DemoChrome id="liquid-metal">
        <div className="material-row" role="group" aria-label="Material">
          {labels.map((label, i) => (
            <button
              key={label}
              type="button"
              className={mat === i ? "is-active" : ""}
              aria-pressed={mat === i}
              onClick={() => setMat(i as MatKey)}
            >
              {label}
            </button>
          ))}
        </div>
      </DemoChrome>
    </div>
  );
}
