import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Color, Group, Mesh, ShaderMaterial, Vector3 } from "three";
import { CanvasFrame } from "../components/CanvasFrame";
import { DemoChrome } from "../components/DemoChrome";
import { useReducedMotion } from "../hooks";
import { SIMPLEX_NOISE } from "../glsl";

const vertexShader = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform float uHover;
uniform vec3 uPoint;
uniform float uPulseT;
varying vec3 vNv;
varying float vDisp;
varying float vGlow;

${SIMPLEX_NOISE}

// returns xyz = displaced position, and writes disp/glow through globals
float gDisp;
float gGlow;

vec3 organic(vec3 n){
  float t = uTime * (0.32 + uHover * 0.85);
  float a = snoise(n * 1.35 + t * vec3(0.7, 0.5, 0.3));
  float b = snoise(n * 3.1 - t * 0.8) * 0.35;
  float d = (a + b) * uAmp * (0.65 + uHover * 0.95);

  float k = max(dot(n, normalize(uPoint)), 0.0);
  float bulge = pow(k, 5.0) * uHover * 0.36;

  float ang = acos(clamp(dot(n, normalize(uPoint)), -1.0, 1.0));
  float age = max(uTime - uPulseT, 0.0);
  float pulse = sin(ang * 9.0 - age * 9.0) * exp(-ang * 1.6) * exp(-age * 1.7) * 0.2;

  gDisp = d + bulge + pulse;
  gGlow = pow(k, 6.0) * uHover + abs(pulse) * 2.0;
  return n * (1.2 + gDisp);
}

void main(){
  vec3 n = normalize(position);
  vec3 t1 = normalize(cross(n, abs(n.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
  vec3 t2 = cross(n, t1);

  vec3 p0 = organic(n);
  vDisp = gDisp;
  vGlow = gGlow;
  vec3 p1 = organic(normalize(n + t1 * 0.012));
  vec3 p2 = organic(normalize(n + t2 * 0.012));
  vec3 nn = normalize(cross(p1 - p0, p2 - p0));

  vNv = normalize(normalMatrix * nn);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p0, 1.0);
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uHot;
varying vec3 vNv;
varying float vDisp;
varying float vGlow;

void main(){
  vec3 N = normalize(vNv);
  vec3 V = vec3(0.0, 0.0, 1.0);
  vec3 L = normalize(vec3(-0.5, 0.75, 0.8));
  float diff = max(dot(N, L), 0.0) * 0.8 + 0.2;
  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.6);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), 56.0);

  vec3 base = mix(uColorA, uColorB, smoothstep(-0.35, 0.5, vDisp));
  vec3 col = base * diff;
  col += vec3(0.7, 0.82, 0.95) * fres * 0.55;
  col += vec3(1.0) * spec * 0.85;
  col = mix(col, uHot, clamp(vGlow, 0.0, 1.0) * 0.55);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

function Organism({ reduced }: { reduced: boolean }) {
  const group = useRef<Group>(null);
  const mesh = useRef<Mesh>(null);
  const { camera } = useThree();

  const mat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uAmp: { value: reduced ? 0.08 : 0.3 },
          uHover: { value: 0 },
          uPoint: { value: new Vector3(0, 0, 1) },
          uPulseT: { value: -100 },
          uColorA: { value: new Color("#2a323a") },
          uColorB: { value: new Color("#c8d0d8") },
          uHot: { value: new Color("#8fc4ff") },
        },
      }),
    [reduced],
  );

  // global pointer: the form reacts anywhere on the page, strongest near it
  const ptr = useRef({ x: 0, y: 0, last: -1e9 });
  useEffect(() => {
    if (reduced) return;
    const move = (e: PointerEvent) => {
      ptr.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      ptr.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
      ptr.current.last = performance.now();
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [reduced]);

  const tmp = useMemo(() => new Vector3(), []);
  const smooth = useRef({ x: 0, y: 0, hover: 0 });

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.1);
    const t = state.clock.elapsedTime;
    mat.uniforms.uTime.value = reduced ? 0.5 : t;
    if (reduced) return;

    const p = ptr.current;
    const s = smooth.current;
    const active = performance.now() - p.last < 2600;
    const near = Math.max(0, 1.15 - Math.hypot(p.x * 0.9, p.y) * 0.8);
    const hoverTarget = active ? 0.35 + 0.65 * Math.min(1, near) : 0;
    const k = 1 - Math.exp(-d * 5);
    s.x += (p.x - s.x) * k;
    s.y += (p.y - s.y) * k;
    s.hover += (hoverTarget - s.hover) * (1 - Math.exp(-d * 3.5));
    mat.uniforms.uHover.value = s.hover;

    // the whole form leans toward the pointer
    if (group.current) {
      group.current.rotation.x += (-s.y * 0.32 - group.current.rotation.x) * k;
      group.current.rotation.y += (s.x * 0.42 - group.current.rotation.y) * k;
    }

    // pointer direction on the sphere, in object space
    tmp.set(s.x * 1.25, s.y * 1.25, 1.15).applyQuaternion(camera.quaternion);
    if (mesh.current) {
      mesh.current.updateWorldMatrix(true, false);
      tmp.transformDirection(mesh.current.matrixWorld.clone().invert());
    }
    mat.uniforms.uPoint.value.lerp(tmp.normalize(), k);
  });

  return (
    <group ref={group}>
      <mesh
        ref={mesh}
        material={mat}
        frustumCulled={false}
        onClick={() => {
          if (!reduced) mat.uniforms.uPulseT.value = mat.uniforms.uTime.value;
        }}
      >
        <sphereGeometry args={[1, 192, 144]} />
      </mesh>
    </group>
  );
}

export function OrganicMatter() {
  const reduced = useReducedMotion();

  return (
    <div className="demo-page">
      <CanvasFrame
        environment={false}
        camera={{ position: [0, 0.2, 5.8], fov: 40 }}
      >
        <Organism reduced={reduced} />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          enableDamping
          dampingFactor={0.08}
          autoRotate={!reduced}
          autoRotateSpeed={0.35}
        />
      </CanvasFrame>
      <DemoChrome id="organic-matter" />
    </div>
  );
}
