import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import {
  CanvasTexture,
  Color,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  LatheGeometry,
  Object3D,
  Path,
  RepeatWrapping,
  Shape,
  SRGBColorSpace,
  Vector2,
  Vector3,
} from "three";
import { CanvasFrame } from "../components/CanvasFrame";
import { StudioEnv } from "../components/StudioEnv";
import { useI18n } from "../i18n";
import { useReducedMotion } from "../hooks";

/* ------------------------------------------------------------------ */
/* Timeline helpers                                                    */
/* ------------------------------------------------------------------ */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const ease = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const DEG = Math.PI / 180;

const T = {
  explodeFrom: 0.08,
  explodeStagger: 0.026,
  explodeDur: 0.16,
  rebuildFrom: 0.64,
  rebuildStagger: 0.024,
  rebuildDur: 0.16,
  legendsIn: 0.27,
  legendStagger: 0.032,
  legendsOut: [0.575, 0.625] as const,
};

/** Top → bottom. Order matches `parts` in the copy. */
type LayerDef = {
  id: string;
  rest: number;
  lift: number;
  twist: number;
  side: 1 | -1;
  anchorX: number;
};

const LAYERS: LayerDef[] = [
  { id: "crystal", rest: 0.78, lift: 5.0, twist: 0.0, side: 1, anchorX: 1.3 },
  { id: "hands", rest: 0.7, lift: 4.0, twist: 0.7, side: -1, anchorX: 0.95 },
  { id: "bezel", rest: 0.58, lift: 3.1, twist: -0.5, side: 1, anchorX: 1.5 },
  { id: "upper", rest: 0.46, lift: 2.3, twist: 0.45, side: -1, anchorX: 1.25 },
  { id: "lower", rest: 0.34, lift: 1.55, twist: -0.4, side: 1, anchorX: 1.2 },
  { id: "gears", rest: 0.2, lift: 0.8, twist: 0.3, side: -1, anchorX: 1.15 },
  { id: "case", rest: 0.0, lift: 0.0, twist: 0, side: 1, anchorX: 1.55 },
];

const N = LAYERS.length;

/* ------------------------------------------------------------------ */
/* Geometry builders                                                   */
/* ------------------------------------------------------------------ */

function circlePath(x: number, y: number, r: number) {
  const p = new Path();
  p.absarc(x, y, r, 0, Math.PI * 2, true);
  return p;
}

/** Extruded profile, centred on its thickness, with the axis along +Y. */
function flatten(shape: Shape, depth: number, curve = 24): ExtrudeGeometry {
  const g = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: curve,
  });
  g.translate(0, 0, -depth / 2);
  g.rotateX(Math.PI / 2);
  return g;
}

function gearGeometry(
  teeth: number,
  ro: number,
  ri: number,
  hole: number,
  depth: number,
) {
  const s = new Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pt = (f: number, r: number): [number, number] => [
      Math.cos(a + f * step) * r,
      Math.sin(a + f * step) * r,
    ];
    const pts = [pt(0, ri), pt(0.13, ro), pt(0.37, ro), pt(0.5, ri)];
    pts.forEach(([x, y], k) => {
      if (i === 0 && k === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    });
  }
  s.closePath();
  s.holes.push(circlePath(0, 0, hole));
  const web = ri - hole;
  if (web > 0.09) {
    const n = teeth >= 16 ? 6 : 5;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.3;
      s.holes.push(circlePath(Math.cos(a) * (ri + hole) * 0.5, Math.sin(a) * (ri + hole) * 0.5, web * 0.26));
    }
  }
  return flatten(s, depth, 4);
}

type Hole = { a: number; d: number; r: number };

function plateGeometry(
  ro: number,
  hub: number,
  holes: Hole[],
  depth: number,
) {
  const s = new Shape();
  s.absarc(0, 0, ro, 0, Math.PI * 2, false);
  s.holes.push(circlePath(0, 0, hub));
  holes.forEach((h) =>
    s.holes.push(circlePath(Math.cos(h.a) * h.d, Math.sin(h.a) * h.d, h.r)),
  );
  const g = flatten(s, depth, 40);

  // spectrum finish: anodised titanium, hue walks around the plate
  const stops = ["#ffc247", "#ff3d8a", "#8a3dff", "#2f7bff", "#ffc247"].map(
    (c) => new Color(c),
  );
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const ang = (Math.atan2(z, x) / Math.PI + 1) / 2; // 0..1
    const f = ang * (stops.length - 1);
    const k = Math.min(stops.length - 2, Math.floor(f));
    c.copy(stops[k]).lerp(stops[k + 1], f - k);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new Float32BufferAttribute(col, 3));
  return g;
}

function handGeometry(len: number, width: number, depth: number) {
  const s = new Shape();
  s.moveTo(-width, -0.16);
  s.lineTo(width, -0.16);
  s.lineTo(width * 0.62, len * 0.82);
  s.lineTo(0, len);
  s.lineTo(-width * 0.62, len * 0.82);
  s.closePath();
  // skeleton cut-out
  const cut = new Path();
  cut.moveTo(-width * 0.32, 0.05);
  cut.lineTo(width * 0.32, 0.05);
  cut.lineTo(width * 0.2, len * 0.62);
  cut.lineTo(-width * 0.2, len * 0.62);
  cut.closePath();
  s.holes.push(cut);
  return flatten(s, depth, 4);
}

function carbonTexture() {
  const size = 128;
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#0b0c0e";
  ctx.fillRect(0, 0, size, size);
  const cell = size / 8;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const g = ctx.createLinearGradient(x * cell, y * cell, (x + 1) * cell, (y + 1) * cell);
      const flip = (x + y) % 2 === 0;
      g.addColorStop(0, flip ? "#2a2d33" : "#101114");
      g.addColorStop(1, flip ? "#101114" : "#2a2d33");
      ctx.fillStyle = g;
      ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
    }
  }
  const tex = new CanvasTexture(cv);
  tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.repeat.set(5, 5);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/* ------------------------------------------------------------------ */
/* Layers                                                              */
/* ------------------------------------------------------------------ */

type Spin = MutableRefObject<number>;

function Crystal() {
  const R = 1.46;
  const cap = 0.42;
  return (
    <group>
      <mesh position={[0, -R * Math.cos(cap), 0]}>
        <sphereGeometry args={[R, 72, 20, 0, Math.PI * 2, 0, cap]} />
        <meshPhysicalMaterial
          color="#d6e8ff"
          transparent
          opacity={0.2}
          roughness={0.02}
          metalness={0}
          clearcoat={1}
          clearcoatRoughness={0}
          envMapIntensity={2.6}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation-x={Math.PI / 2}>
        <torusGeometry args={[R * Math.sin(cap), 0.035, 16, 96]} />
        <meshStandardMaterial color="#c8d0d8" metalness={1} roughness={0.15} />
      </mesh>
    </group>
  );
}

function Hands({ spin }: { spin: Spin }) {
  const hour = useRef<Group>(null);
  const minute = useRef<Group>(null);
  const hGeo = useMemo(() => handGeometry(0.78, 0.085, 0.022), []);
  const mGeo = useMemo(() => handGeometry(1.2, 0.06, 0.018), []);
  useFrame(() => {
    // the watch "runs" while you scroll
    if (minute.current) minute.current.rotation.y = -spin.current * Math.PI * 14;
    if (hour.current) hour.current.rotation.y = -spin.current * Math.PI * 1.2 - 0.6;
  });
  const steel = (
    <meshStandardMaterial color="#cfd6dd" metalness={1} roughness={0.22} />
  );
  return (
    <group>
      <group ref={hour} position={[0, 0, 0]}>
        <mesh geometry={hGeo}>{steel}</mesh>
        <mesh position={[0, 0.012, 0.66]}>
          <sphereGeometry args={[0.045, 16, 12]} />
          <meshStandardMaterial color="#c8ffd8" emissive="#7dffa8" emissiveIntensity={1.4} />
        </mesh>
      </group>
      <group ref={minute} position={[0, 0.028, 0]}>
        <mesh geometry={mGeo}>{steel}</mesh>
        <mesh position={[0, 0.012, 1.08]}>
          <sphereGeometry args={[0.04, 16, 12]} />
          <meshStandardMaterial color="#c8ffd8" emissive="#7dffa8" emissiveIntensity={1.4} />
        </mesh>
      </group>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.075, 0.075, 0.09, 24]} />
        <meshStandardMaterial color="#e8eef4" metalness={1} roughness={0.12} />
      </mesh>
    </group>
  );
}

function Bezel() {
  const ticks = useRef<InstancedMesh>(null);
  const ring = useMemo(() => {
    const pts = [
      [1.16, -0.05],
      [1.5, -0.05],
      [1.56, 0.0],
      [1.56, 0.07],
      [1.5, 0.11],
      [1.16, 0.11],
    ].map(([x, y]) => new Vector2(x, y));
    return new LatheGeometry(pts, 96);
  }, []);

  useLayoutEffect(() => {
    const m = ticks.current;
    if (!m) return;
    const o = new Object3D();
    const c = new Color();
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const big = i % 5 === 0;
      o.position.set(Math.sin(a) * 1.36, 0.115, Math.cos(a) * 1.36);
      o.rotation.set(0, a, 0);
      o.scale.set(big ? 0.045 : 0.018, 0.012, big ? 0.17 : 0.09);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.set(big ? "#ff7a2a" : "#aeb7c0"));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, []);

  return (
    <group>
      <mesh geometry={ring}>
        <meshStandardMaterial color="#1b1d22" metalness={0.9} roughness={0.34} side={DoubleSide} />
      </mesh>
      <instancedMesh ref={ticks} args={[undefined, undefined, 60]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial metalness={0.2} roughness={0.5} />
      </instancedMesh>
      {/* skeleton dial: hub + six spokes */}
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        return (
          <mesh
            key={i}
            position={[Math.sin(a) * 0.64, 0.02, Math.cos(a) * 0.64]}
            rotation={[0, a, 0]}
          >
            <boxGeometry args={[0.1, 0.045, 1.0]} />
            <meshStandardMaterial color="#14161a" metalness={0.9} roughness={0.35} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.06, 40]} />
        <meshStandardMaterial color="#14161a" metalness={0.9} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.02, 0]} rotation-x={Math.PI / 2}>
        <torusGeometry args={[1.12, 0.04, 12, 96]} />
        <meshStandardMaterial color="#14161a" metalness={0.9} roughness={0.35} />
      </mesh>
    </group>
  );
}

const UPPER_HOLES: Hole[] = [
  { a: 0.3, d: 0.74, r: 0.17 },
  { a: 1.25, d: 0.8, r: 0.12 },
  { a: 2.15, d: 0.72, r: 0.2 },
  { a: 3.25, d: 0.8, r: 0.14 },
  { a: 4.05, d: 0.74, r: 0.18 },
  { a: 5.0, d: 0.8, r: 0.13 },
  { a: 5.7, d: 0.7, r: 0.1 },
];

const LOWER_HOLES: Hole[] = [
  { a: 0.1, d: 0.7, r: 0.15 },
  { a: 0.95, d: 0.78, r: 0.19 },
  { a: 2.0, d: 0.72, r: 0.12 },
  { a: 2.9, d: 0.8, r: 0.17 },
  { a: 3.85, d: 0.7, r: 0.15 },
  { a: 4.7, d: 0.78, r: 0.2 },
  { a: 5.5, d: 0.72, r: 0.12 },
];

function Bridge({
  radius,
  holes,
  depth,
  screws,
}: {
  radius: number;
  holes: Hole[];
  depth: number;
  screws: number;
}) {
  const geo = useMemo(
    () => plateGeometry(radius, 0.17, holes, depth),
    [radius, holes, depth],
  );
  return (
    <group>
      <mesh geometry={geo}>
        <meshStandardMaterial
          vertexColors
          metalness={1}
          roughness={0.26}
          envMapIntensity={1.3}
        />
      </mesh>
      {Array.from({ length: screws }, (_, i) => {
        const a = (i / screws) * Math.PI * 2 + 0.2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * (radius - 0.1), depth / 2 + 0.018, Math.sin(a) * (radius - 0.1)]}
          >
            <cylinderGeometry args={[0.05, 0.05, 0.036, 16]} />
            <meshStandardMaterial color="#d9dee4" metalness={1} roughness={0.2} />
          </mesh>
        );
      })}
    </group>
  );
}

type GearDef = {
  x: number;
  z: number;
  teeth: number;
  ro: number;
  dir: 1 | -1;
  tint: string;
};

const GEAR_DEFS: GearDef[] = [
  { x: 0, z: 0, teeth: 22, ro: 0.46, dir: 1, tint: "#aab3bc" },
  { x: 0.7, z: 0.4, teeth: 14, ro: 0.29, dir: -1, tint: "#c8d0d8" },
  { x: -0.66, z: 0.46, teeth: 16, ro: 0.33, dir: -1, tint: "#98a2ac" },
  { x: -0.3, z: -0.72, teeth: 18, ro: 0.37, dir: -1, tint: "#b8c0c8" },
  { x: 0.56, z: -0.62, teeth: 12, ro: 0.24, dir: 1, tint: "#d2d8de" },
  { x: 1.0, z: -0.08, teeth: 10, ro: 0.17, dir: 1, tint: "#a4adb6" },
  { x: -1.02, z: -0.2, teeth: 10, ro: 0.18, dir: 1, tint: "#a4adb6" },
];

function Gear({ def, spin }: { def: GearDef; spin: Spin }) {
  const ref = useRef<Group>(null);
  const geo = useMemo(
    () => gearGeometry(def.teeth, def.ro, def.ro * 0.84, def.ro * 0.18, 0.07),
    [def],
  );
  useFrame(() => {
    if (ref.current)
      ref.current.rotation.y = def.dir * spin.current * Math.PI * 9 * (22 / def.teeth);
  });
  return (
    <group position={[def.x, 0.04, def.z]}>
      <group ref={ref}>
        <mesh geometry={geo}>
          <meshStandardMaterial color={def.tint} metalness={1} roughness={0.28} />
        </mesh>
      </group>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[def.ro * 0.13, def.ro * 0.13, 0.12, 14]} />
        <meshStandardMaterial color="#e8eef4" metalness={1} roughness={0.15} />
      </mesh>
    </group>
  );
}

function Gears({ spin }: { spin: Spin }) {
  const carbon = useMemo(() => carbonTexture(), []);
  useEffect(() => () => carbon.dispose(), [carbon]);
  return (
    <group>
      <mesh position={[0, -0.04, 0]}>
        <cylinderGeometry args={[1.24, 1.24, 0.06, 72]} />
        <meshStandardMaterial map={carbon} metalness={0.4} roughness={0.45} />
      </mesh>
      {GEAR_DEFS.map((g, i) => (
        <Gear key={i} def={g} spin={spin} />
      ))}
    </group>
  );
}

function Case() {
  const shell = useMemo(() => {
    const pts = [
      [1.18, -0.16],
      [1.48, -0.16],
      [1.62, -0.06],
      [1.62, 0.2],
      [1.5, 0.3],
      [1.4, 0.3],
      [1.4, 0.08],
      [1.18, 0.08],
    ].map(([x, y]) => new Vector2(x, y));
    return new LatheGeometry(pts, 120);
  }, []);
  const carbon = useMemo(() => carbonTexture(), []);
  useEffect(() => () => carbon.dispose(), [carbon]);
  return (
    <group>
      <mesh geometry={shell}>
        <meshStandardMaterial
          color="#8d97a2"
          metalness={1}
          roughness={0.3}
          envMapIntensity={1.2}
          side={DoubleSide}
        />
      </mesh>
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[1.2, 1.2, 0.05, 72]} />
        <meshStandardMaterial map={carbon} metalness={0.4} roughness={0.5} />
      </mesh>
      {/* crown */}
      <mesh position={[1.74, 0.08, 0]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.1, 0.1, 0.22, 24]} />
        <meshStandardMaterial color="#c8d0d8" metalness={1} roughness={0.25} />
      </mesh>
      {/* lugs */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            position={[sx * 0.62, 0.06, sz * 1.72]}
            rotation={[0, 0, 0]}
          >
            <boxGeometry args={[0.34, 0.22, 0.34]} />
            <meshStandardMaterial color="#7f8993" metalness={1} roughness={0.34} />
          </mesh>
        )),
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Piece + camera + legends                                            */
/* ------------------------------------------------------------------ */

const ANCHOR = new Vector3();

function Piece({
  progress,
  labels,
  still,
}: {
  progress: MutableRefObject<number>;
  labels: MutableRefObject<(HTMLDivElement | null)[]>;
  still: boolean;
}) {
  const { camera, size } = useThree();
  const root = useRef<Group>(null);
  const posRefs = useRef<(Group | null)[]>([]);
  const yawRefs = useRef<(Group | null)[]>([]);
  const smooth = useRef(0);
  const spin = useRef(0);

  useFrame((state, dt) => {
    const target = still ? 0 : progress.current;
    smooth.current +=
      (target - smooth.current) * (1 - Math.exp(-Math.min(dt, 0.1) * 7));
    const p = smooth.current;
    spin.current = p;

    let ex = 0;
    LAYERS.forEach((def, i) => {
      const out = ease(
        seg(
          p,
          T.explodeFrom + i * T.explodeStagger,
          T.explodeFrom + i * T.explodeStagger + T.explodeDur,
        ),
      );
      const bi = N - 1 - i;
      const back = ease(
        seg(
          p,
          T.rebuildFrom + bi * T.rebuildStagger,
          T.rebuildFrom + bi * T.rebuildStagger + T.rebuildDur,
        ),
      );
      const e = out * (1 - back);
      if (def.lift > 0) ex += e;
      const pos = posRefs.current[i];
      const yaw = yawRefs.current[i];
      if (pos) pos.position.y = def.rest + def.lift * e;
      if (yaw) yaw.rotation.y = def.twist * e;
    });
    ex /= N - 1;

    const aspect = size.width / size.height;
    const portrait = aspect < 0.85;
    const dist = lerp(8.6, 15.2, ex) * (portrait ? 1.45 : 1);
    const elev = lerp(30, 17, ex) * DEG;
    const ty = lerp(0.35, 2.75, ex);
    camera.position.set(0, ty + dist * Math.sin(elev), dist * Math.cos(elev));
    camera.lookAt(0, ty, 0);

    if (root.current) {
      root.current.rotation.y = 0.5 + (still ? 0 : Math.sin(state.clock.elapsedTime * 0.35) * 0.06);
      root.current.updateMatrixWorld(true);
    }
    camera.updateMatrixWorld();

    // legends: project each layer's anchor into the DOM overlay
    LAYERS.forEach((def, i) => {
      const el = labels.current[i];
      const pos = posRefs.current[i];
      if (!el || !pos) return;
      const lin = seg(
        p,
        T.legendsIn + i * T.legendStagger,
        T.legendsIn + i * T.legendStagger + 0.03,
      );
      const lout = 1 - seg(p, T.legendsOut[0], T.legendsOut[1]);
      const o = still ? 0 : lin * lout;
      el.style.opacity = o.toFixed(3);
      el.style.visibility = o < 0.01 ? "hidden" : "visible";
      if (o < 0.01) return;
      ANCHOR.set(def.side * def.anchorX, 0, 0);
      pos.localToWorld(ANCHOR);
      ANCHOR.project(camera);
      const x = (ANCHOR.x * 0.5 + 0.5) * size.width;
      const y = (-ANCHOR.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    });
  });

  const nodes = [
    <Crystal key="crystal" />,
    <Hands key="hands" spin={spin} />,
    <Bezel key="bezel" />,
    <Bridge key="upper" radius={1.3} holes={UPPER_HOLES} depth={0.05} screws={6} />,
    <Bridge key="lower" radius={1.24} holes={LOWER_HOLES} depth={0.05} screws={5} />,
    <Gears key="gears" spin={spin} />,
    <Case key="case" />,
  ];

  return (
    <group ref={root}>
      <ContactShadows
        position={[0, -0.2, 0]}
        opacity={0.5}
        scale={10}
        blur={2.6}
        far={4}
        color="#000"
      />
      {LAYERS.map((def, i) => (
        <group
          key={def.id}
          ref={(g) => {
            posRefs.current[i] = g;
          }}
          position={[0, def.rest, 0]}
        >
          <group
            ref={(g) => {
              yawRefs.current[i] = g;
            }}
          >
            {nodes[i]}
          </group>
        </group>
      ))}
    </group>
  );
}

function Scene({
  progress,
  labels,
  still,
}: {
  progress: MutableRefObject<number>;
  labels: MutableRefObject<(HTMLDivElement | null)[]>;
  still: boolean;
}) {
  return (
    <>
      <StudioEnv intensity={0.9} />
      <directionalLight position={[4, 8, 5]} intensity={1.1} color="#fff6ea" />
      <Suspense fallback={null}>
        <Piece progress={progress} labels={labels} still={still} />
      </Suspense>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

const PHASE_FROM = [0, 0.08, 0.63, 0.9];

function phaseAt(p: number) {
  let idx = 0;
  PHASE_FROM.forEach((from, i) => {
    if (p >= from) idx = i;
  });
  return idx;
}

function ScrollStory() {
  const { t } = useI18n();
  const copy = t.demos["exploded-object"];
  const section = useRef<HTMLElement>(null);
  const progress = useRef(0);
  const labels = useRef<(HTMLDivElement | null)[]>([]);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = section.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = Math.max(1, rect.height - window.innerHeight);
      const p = clamp01(-rect.top / total);
      progress.current = p;
      const hero = 1 - clamp01((p - 0.03) / 0.1);
      el.style.setProperty("--hero", String(hero));
      const next = phaseAt(p);
      setPhase((prev) => (prev === next ? prev : next));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <section className="story" ref={section} aria-label={copy.title}>
      <div className="story-sticky">
        <div className="stage" aria-hidden="true">
          <CanvasFrame
            className="stage-canvas"
            environment={false}
            background={null}
            camera={{ position: [0, 4, 8.6], fov: 30 }}
          >
            <Scene progress={progress} labels={labels} still={false} />
          </CanvasFrame>
        </div>

        <div className="legends" aria-hidden="true">
          {LAYERS.map((def, i) => (
            <div
              key={def.id}
              className="legend-anchor"
              data-side={def.side === 1 ? "right" : "left"}
              ref={(el) => {
                labels.current[i] = el;
              }}
            >
              <div className="legend">
                <div>
                  <span className="legend-name">{copy.parts?.[i]?.name}</span>
                  <span className="legend-line">{copy.parts?.[i]?.line}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="captions">
          {copy.phases?.map((ph, i) => (
            <div
              key={ph.title}
              className={`caption${phase === i ? " is-active" : ""}`}
              aria-hidden={phase !== i}
            >
              <h2>{ph.title}</h2>
              <p>{ph.text}</p>
            </div>
          ))}
        </div>

        <p className="scroll-hint" aria-hidden="true">
          {copy.scroll}
          <span />
        </p>
      </div>
    </section>
  );
}

function StaticWatch() {
  const { t } = useI18n();
  const copy = t.demos["exploded-object"];
  const progress = useRef(0);
  const labels = useRef<(HTMLDivElement | null)[]>([]);
  return (
    <div className="static-watch">
      <div className="static-stage">
        <CanvasFrame
          className="stage-canvas"
          environment={false}
          background={null}
          camera={{ position: [0, 4, 8.6], fov: 30 }}
        >
          <Scene progress={progress} labels={labels} still />
        </CanvasFrame>
      </div>
      <div className="static-copy">
        <h1>{copy.title}</h1>
        <p>{copy.staticNote}</p>
        <ul>
          {copy.parts?.map((part) => (
            <li key={part.name}>
              <strong>{part.name}</strong>
              <span>{part.line}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function ExplodedObject() {
  const reduced = useReducedMotion();
  return reduced ? <StaticWatch /> : <ScrollStory />;
}

