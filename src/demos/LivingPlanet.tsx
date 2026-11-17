import { useMemo, useRef, useState, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, useTexture } from "@react-three/drei";
import {
  AdditiveBlending,
  BackSide,
  Color,
  DirectionalLight,
  Mesh,
  NoColorSpace,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  Vector3,
} from "three";
import { CanvasFrame } from "../components/CanvasFrame";
import { DemoChrome } from "../components/DemoChrome";
import { useI18n } from "../i18n";
import { useReducedMotion } from "../hooks";

const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");
const TEX = [
  `${base}textures/planets/earth_day.jpg`,
  `${base}textures/planets/earth_night.jpg`,
  `${base}textures/planets/earth_water.png`,
  `${base}textures/planets/earth_clouds.png`,
];

const RADIUS = 1.35;
const DEG = Math.PI / 180;

/**
 * Where the sun really is for a given instant.
 * Returns a world-space unit vector for a planet whose texture is mapped the
 * three.js way (lon 0 on +X, north on +Y, east toward -Z).
 */
function sunState(ms: number) {
  const date = new Date(ms);
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = (ms - yearStart) / 86400000;
  const decl = -23.44 * DEG * Math.cos(((2 * Math.PI) / 365) * (day + 10));
  const b = ((2 * Math.PI) / 364) * (day - 81);
  const eotMin = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
  const utcH =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600 +
    date.getUTCMilliseconds() / 3.6e6;
  const lon = -((utcH + eotMin / 60) - 12) * 15 * DEG;
  const dir = new Vector3(
    Math.cos(decl) * Math.cos(lon),
    Math.sin(decl),
    -Math.cos(decl) * Math.sin(lon),
  );
  return { dir, lon: lon / DEG, lat: decl / DEG, utcH };
}

function fromLatLon(latDeg: number, lonDeg: number, r: number) {
  const la = latDeg * DEG;
  const lo = lonDeg * DEG;
  return new Vector3(
    Math.cos(la) * Math.cos(lo) * r,
    Math.sin(la) * r,
    -Math.cos(la) * Math.sin(lo) * r,
  );
}

function fmtLon(v: number) {
  const n = ((((v + 180) % 360) + 360) % 360) - 180;
  return `${Math.abs(n).toFixed(0)}°${n >= 0 ? "E" : "W"}`;
}
function fmtLat(v: number) {
  return `${Math.abs(v).toFixed(0)}°${v >= 0 ? "N" : "S"}`;
}

const earthVertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vN;
varying vec3 vW;
void main(){
  vUv = uv;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const earthFragment = /* glsl */ `
uniform sampler2D uDay;
uniform sampler2D uNight;
uniform sampler2D uWater;
uniform vec3 uSun;
uniform float uLights;
uniform float uAtmos;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vW;

void main(){
  vec3 N = normalize(vN);
  vec3 V = normalize(cameraPosition - vW);
  float ndl = dot(N, uSun);

  vec3 dayCol = texture2D(uDay, vUv).rgb;
  float water = texture2D(uWater, vUv).r;

  // direct sun with a soft terminator
  float lam = smoothstep(-0.04, 0.55, ndl);
  vec3 lit = dayCol * (lam * 1.25);

  // warm band along the terminator
  float tw = smoothstep(-0.12, 0.0, ndl) * (1.0 - smoothstep(0.0, 0.22, ndl));
  lit += vec3(1.0, 0.42, 0.16) * tw * 0.22 * dayCol;

  // ocean glint
  vec3 H = normalize(uSun + V);
  float glint = pow(max(dot(N, H), 0.0), 420.0) * water * smoothstep(0.0, 0.2, ndl);
  lit += vec3(1.0, 0.95, 0.85) * glint * 0.55;
  // broad soft sheen so oceans pick up the light without blowing out
  float sheen = pow(max(dot(N, H), 0.0), 36.0) * water * smoothstep(0.0, 0.3, ndl);
  lit += vec3(0.30, 0.45, 0.75) * sheen * 0.22;

  // faint earthshine so the night side is never flat black
  vec3 col = lit + dayCol * vec3(0.35, 0.5, 0.9) * 0.008;

  // city lights, only in darkness
  float dark = 1.0 - smoothstep(-0.10, 0.14, ndl);
  vec3 city = texture2D(uNight, vUv).rgb;
  col += city * vec3(1.0, 0.74, 0.42) * 1.7 * dark * uLights;

  // limb haze
  float fres = pow(1.0 - max(dot(N, V), 0.0), 3.2);
  float sunSide = smoothstep(-0.30, 0.40, ndl);
  col += vec3(0.22, 0.46, 1.0) * fres * 0.7 * sunSide * uAtmos;

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const atmoVertex = /* glsl */ `
varying vec3 vNv;
varying vec3 vNw;
void main(){
  vNv = normalize(normalMatrix * normal);
  vNw = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const atmoFragment = /* glsl */ `
uniform vec3 uSun;
uniform float uAtmos;
varying vec3 vNv;
varying vec3 vNw;
void main(){
  float rim = pow(max(0.0, 0.64 - dot(vNv, vec3(0.0, 0.0, 1.0))), 3.4);
  float ndl = dot(normalize(vNw), uSun);
  float sunSide = smoothstep(-0.45, 0.45, ndl);
  float dusk = smoothstep(-0.25, 0.0, ndl) * (1.0 - smoothstep(0.0, 0.3, ndl));
  vec3 blue = vec3(0.16, 0.42, 1.0);
  vec3 warm = vec3(1.0, 0.5, 0.25);
  vec3 col = mix(blue, warm, dusk * 0.7);
  float a = rim * (0.06 + sunSide * 1.15) * uAtmos;
  gl_FragColor = vec4(col * a * 1.5, a);
}
`;

type SimMode = 0 | 1;

type SceneProps = {
  clouds: boolean;
  lights: boolean;
  atmosphere: boolean;
  mode: SimMode;
  reduced: boolean;
  clockRef: RefObject<HTMLSpanElement | null>;
  lang: string;
};

function Planet({
  clouds,
  lights,
  atmosphere,
  mode,
  reduced,
  clockRef,
}: SceneProps) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const [day, night, water, cloudMap] = useTexture(TEX, (loaded) => {
    const list = (Array.isArray(loaded) ? loaded : [loaded]) as Texture[];
    const aniso = Math.min(8, gl.capabilities.getMaxAnisotropy());
    list.forEach((tx, i) => {
      tx.colorSpace = i === 2 ? NoColorSpace : SRGBColorSpace;
      tx.anisotropy = aniso;
      tx.needsUpdate = true;
    });
  });

  const sunLight = useRef<DirectionalLight>(null);
  const cloudMesh = useRef<Mesh>(null);
  const simMs = useRef(Date.now());
  const lastWall = useRef(performance.now());
  const lastClock = useRef(0);
  const placed = useRef(false);

  const earthMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: earthVertex,
        fragmentShader: earthFragment,
        uniforms: {
          uDay: { value: day },
          uNight: { value: night },
          uWater: { value: water },
          uSun: { value: new Vector3(1, 0, 0) },
          uLights: { value: 1 },
          uAtmos: { value: 1 },
        },
      }),
    [day, night, water],
  );

  const atmoMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: atmoVertex,
        fragmentShader: atmoFragment,
        uniforms: {
          uSun: { value: new Vector3(1, 0, 0) },
          uAtmos: { value: 1 },
        },
        side: BackSide,
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  useFrame((state, dt) => {
    const wall = performance.now();
    const wallDt = wall - lastWall.current;
    lastWall.current = wall;

    if (mode === 0 || reduced) {
      simMs.current = Date.now();
    } else {
      // one simulated hour per real second
      simMs.current += Math.min(wallDt, 100) * 3600;
    }

    const s = sunState(simMs.current);

    // first frame: park the camera so the terminator is in view
    if (!placed.current) {
      placed.current = true;
      const p = fromLatLon(22, s.lon - 34, 6.4);
      camera.position.copy(p);
      camera.lookAt(0, 0, 0);
    }

    earthMat.uniforms.uSun.value.copy(s.dir);
    earthMat.uniforms.uLights.value = lights ? 1 : 0;
    earthMat.uniforms.uAtmos.value = atmosphere ? 1 : 0;
    atmoMat.uniforms.uSun.value.copy(s.dir);
    atmoMat.uniforms.uAtmos.value = atmosphere ? 1 : 0;

    if (sunLight.current) {
      sunLight.current.position.copy(s.dir).multiplyScalar(10);
    }
    if (cloudMesh.current && !reduced) {
      cloudMesh.current.rotation.y += dt * 0.0035;
    }

    // HUD clock, ~8 Hz
    if (clockRef.current && state.clock.elapsedTime - lastClock.current > 0.12) {
      lastClock.current = state.clock.elapsedTime;
      const d = new Date(simMs.current);
      const hh = String(d.getUTCHours()).padStart(2, "0");
      const mm = String(d.getUTCMinutes()).padStart(2, "0");
      clockRef.current.textContent = `UTC ${hh}:${mm} · ☀ ${fmtLat(s.lat)} ${fmtLon(s.lon)}`;
    }
  });

  return (
    <group>
      <directionalLight ref={sunLight} intensity={2.6} color="#fff6ea" />
      <mesh material={earthMat}>
        <sphereGeometry args={[RADIUS, 128, 96]} />
      </mesh>

      {clouds ? (
        <mesh ref={cloudMesh} scale={1.012}>
          <sphereGeometry args={[RADIUS, 96, 72]} />
          <meshStandardMaterial
            map={cloudMap}
            transparent
            opacity={0.78}
            depthWrite={false}
            roughness={1}
            metalness={0}
            color={new Color("#ffffff")}
          />
        </mesh>
      ) : null}

      <mesh material={atmoMat} scale={1.17}>
        <sphereGeometry args={[RADIUS, 64, 48]} />
      </mesh>
    </group>
  );
}

export function LivingPlanet() {
  const { t, lang } = useI18n();
  const reduced = useReducedMotion();
  const copy = t.demos["living-planet"];
  const clockRef = useRef<HTMLSpanElement>(null);
  const [clouds, setClouds] = useState(true);
  const [lights, setLights] = useState(true);
  const [atmosphere, setAtmosphere] = useState(true);
  const [mode, setMode] = useState<SimMode>(0);

  const toggles = [
    { label: copy.layers?.[0], on: clouds, set: setClouds },
    { label: copy.layers?.[1], on: lights, set: setLights },
    { label: copy.layers?.[2], on: atmosphere, set: setAtmosphere },
  ];

  return (
    <div className="demo-page">
      <CanvasFrame
        environment={false}
        background="#010207"
        camera={{ position: [0, 1, 6.4], fov: 34 }}
      >
        <ambientLight intensity={0.04} />
        <Stars
          radius={90}
          depth={50}
          count={reduced ? 1200 : 4200}
          factor={3.4}
          saturation={0}
          fade
          speed={0}
        />
        <Planet
          clouds={clouds}
          lights={lights}
          atmosphere={atmosphere}
          mode={mode}
          reduced={reduced}
          clockRef={clockRef}
          lang={lang}
        />
        <OrbitControls
          enablePan={false}
          enableDamping
          dampingFactor={0.07}
          rotateSpeed={0.55}
          zoomSpeed={0.6}
          minDistance={2.3}
          maxDistance={11}
        />
      </CanvasFrame>
      <DemoChrome id="living-planet">
        <span className="hud" ref={clockRef} aria-live="off" />
        <div className="material-row" role="group" aria-label="Layers">
          {toggles.map((tg) => (
            <button
              key={tg.label}
              type="button"
              className={tg.on ? "is-active" : ""}
              aria-pressed={tg.on}
              onClick={() => tg.set((v) => !v)}
            >
              {tg.label}
            </button>
          ))}
        </div>
        {!reduced ? (
          <div className="material-row" role="group" aria-label="Time">
            {copy.actions?.map((label, i) => (
              <button
                key={label}
                type="button"
                className={mode === i ? "is-active" : ""}
                aria-pressed={mode === i}
                onClick={() => setMode(i as SimMode)}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </DemoChrome>
    </div>
  );
}
