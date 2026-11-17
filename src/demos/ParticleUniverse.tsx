import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  ShaderMaterial,
  Vector2,
  Vector3,
} from "three";
import { CanvasFrame } from "../components/CanvasFrame";
import { DemoChrome } from "../components/DemoChrome";
import { useReducedMotion } from "../hooks";

const SHOCKS = 6;

const vertexShader = /* glsl */ `
uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uVel;
uniform float uHover;
uniform float uPress;
uniform vec3 uShock[${SHOCKS}];
attribute float aSeed;
varying float vLift;
varying float vGlow;
varying float vDist;

void main() {
  vec3 pos = position;
  vec2 base = position.xz;

  float wave =
    sin(base.x * 0.55 + uTime * 0.9 + aSeed * 0.3) * 0.55 +
    cos(base.y * 0.48 - uTime * 0.7) * 0.4 +
    sin((base.x + base.y) * 0.22 + uTime * 0.35) * 0.35;

  vec2 rel = base - uMouse;
  float d = length(rel);

  // hover: the field swirls around the pointer
  float fall = exp(-d * d * 0.085) * uHover;
  float ang = fall * (1.15 + uPress * 1.2);
  float c = cos(ang);
  float s = sin(ang);
  vec2 swirled = mat2(c, -s, s, c) * rel;

  // hold: everything is drawn toward the pointer
  float pull = exp(-d * d * 0.045) * uPress;
  swirled *= 1.0 - pull * 0.62;

  vec2 xz = uMouse + swirled;

  // wake: motion drags a ridge of light behind the cursor
  float speed = length(uVel);
  float wake = exp(-d * d * 0.16) * min(speed * 0.35, 1.6) * uHover;

  float lift =
    exp(-d * d * 0.16) * uHover * 0.85 +
    sin(d * 4.2 - uTime * 5.5) * exp(-d * 0.45) * uHover * 0.2 +
    wake * 0.5 -
    pull * 0.95;

  // click: shock rings travelling outward
  float ring = 0.0;
  for (int i = 0; i < ${SHOCKS}; i++) {
    vec3 sh = uShock[i];
    float age = uTime - sh.z;
    if (age > 0.0 && age < 7.0) {
      vec2 toS = base - sh.xy;
      float sd = length(toS);
      float r = age * 5.2;
      float band = exp(-pow(sd - r, 2.0) * 1.15) * exp(-age * 0.75);
      ring += band;
      xz += normalize(toS + 0.0001) * band * 0.42;
    }
  }

  pos.xz = xz;
  pos.y = wave + lift + ring * 1.7;
  vLift = pos.y;
  vGlow = fall * 0.6 + ring * 0.9 + wake * 0.7 + pull * 0.6;
  vDist = d;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  float size = 120.0 + vLift * 26.0 + vGlow * 80.0;
  gl_PointSize = size * (1.1 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uHot;
varying float vLift;
varying float vGlow;
varying float vDist;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float r = length(uv);
  if (r > 0.5) discard;
  float glow = smoothstep(0.5, 0.0, r);
  float core = smoothstep(0.22, 0.0, r);
  vec3 col = mix(uColorA, uColorB, clamp(vLift * 0.5 + 0.55, 0.0, 1.0));
  col = mix(col, uHot, clamp(vGlow, 0.0, 1.0));
  float alpha = glow * 0.7 + core * 1.0;
  alpha *= smoothstep(14.0, 2.0, vDist) * 0.35 + 0.65;
  gl_FragColor = vec4(col, alpha);
}
`;

function WaveField({
  cols,
  rows,
  reduced,
}: {
  cols: number;
  rows: number;
  reduced: boolean;
}) {
  const field = useRef<Group>(null);
  const mouse = useMemo(() => new Vector2(0, 0), []);
  const target = useMemo(() => new Vector2(0, 0), []);
  const vel = useMemo(() => new Vector2(0, 0), []);
  const tmp = useMemo(() => new Vector3(), []);
  const hover = useRef(0);
  const press = useRef(0);
  const pressTarget = useRef(0);
  const shockIdx = useRef(0);

  const { geometry, material } = useMemo(() => {
    const count = cols * rows;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const spreadX = 17;
    const spreadZ = 12.5;
    let i = 0;
    for (let z = 0; z < rows; z++) {
      for (let x = 0; x < cols; x++) {
        const jx = (Math.random() - 0.5) * 0.7 * (spreadX / cols);
        const jz = (Math.random() - 0.5) * 0.7 * (spreadZ / rows);
        positions[i * 3] = (x / (cols - 1) - 0.5) * spreadX + jx;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = (z / (rows - 1) - 0.5) * spreadZ + jz;
        seeds[i] = Math.random() * Math.PI * 2;
        i++;
      }
    }
    const geo = new BufferGeometry();
    geo.setAttribute("position", new BufferAttribute(positions, 3));
    geo.setAttribute("aSeed", new BufferAttribute(seeds, 1));

    const mat = new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uMouse: { value: mouse },
        uVel: { value: vel },
        uHover: { value: 0 },
        uPress: { value: 0 },
        uShock: {
          value: Array.from({ length: SHOCKS }, () => new Vector3(0, 0, -100)),
        },
        uColorA: { value: new Color("#2c78c0") },
        uColorB: { value: new Color("#b8e2ff") },
        uHot: { value: new Color("#ffffff") },
      },
      vertexShader,
      fragmentShader,
    });
    return { geometry: geo, material: mat };
  }, [cols, rows, mouse, vel]);

  useEffect(() => {
    const up = () => {
      pressTarget.current = 0;
    };
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  const shock = (x: number, z: number, t: number) => {
    const arr = material.uniforms.uShock.value as Vector3[];
    arr[shockIdx.current % SHOCKS].set(x, z, t);
    shockIdx.current += 1;
  };

  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05);
    const t = state.clock.elapsedTime;
    material.uniforms.uTime.value = reduced ? 0.8 : t;

    // follow the pointer, derive a smoothed velocity
    const px = mouse.x;
    const pz = mouse.y;
    const k = 1 - Math.exp(-d * 9);
    mouse.x += (target.x - mouse.x) * k;
    mouse.y += (target.y - mouse.y) * k;
    const vx = (mouse.x - px) / Math.max(d, 1e-3);
    const vz = (mouse.y - pz) / Math.max(d, 1e-3);
    vel.x += (vx - vel.x) * (1 - Math.exp(-d * 8));
    vel.y += (vz - vel.y) * (1 - Math.exp(-d * 8));

    press.current += (pressTarget.current - press.current) * (1 - Math.exp(-d * 6));
    material.uniforms.uHover.value = hover.current;
    material.uniforms.uPress.value = press.current;

    if (field.current) {
      field.current.rotation.x = 0;
      field.current.position.y = -0.6;
    }
  });

  const place = (e: ThreeEvent<PointerEvent>) => {
    const f = field.current;
    if (!f) return;
    tmp.copy(e.point);
    f.worldToLocal(tmp);
    target.set(tmp.x, tmp.z);
  };

  return (
    <group ref={field}>
      <points geometry={geometry} material={material} frustumCulled={false} />
      {/* invisible catcher in the field's own plane */}
      <mesh
        rotation-x={-Math.PI / 2}
        visible={false}
        onPointerMove={(e) => {
          if (reduced) return;
          place(e);
          hover.current = 1;
        }}
        onPointerOut={() => {
          hover.current = 0;
        }}
        onPointerDown={(e) => {
          if (reduced) return;
          place(e);
          hover.current = 1;
          pressTarget.current = 1;
          shock(target.x, target.y, material.uniforms.uTime.value as number);
        }}
      >
        <planeGeometry args={[40, 30]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}

function Rig() {
  useFrame(({ camera, pointer }) => {
    camera.position.x += (pointer.x * 0.9 - camera.position.x) * 0.03;
    camera.lookAt(0, -0.5, 0.4);
  });
  return null;
}

export function ParticleUniverse() {
  const reduced = useReducedMotion();
  const isMobile =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 720px)").matches;
  const cols = reduced ? 48 : isMobile ? 70 : 110;
  const rows = reduced ? 36 : isMobile ? 52 : 80;

  return (
    <div className="demo-page demo-particles">
      <CanvasFrame
        environment={false}
        camera={{ position: [0, 6.4, 8.6], fov: 42 }}
        background="#03060c"
      >
        <Rig />
        <WaveField cols={cols} rows={rows} reduced={reduced} />
      </CanvasFrame>
      <DemoChrome id="particle-universe" />
    </div>
  );
}
