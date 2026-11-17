import { Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Canvas } from "@react-three/fiber";
import { Environment, Float, Lightformer } from "@react-three/drei";
import { DEMO_ORDER, useI18n } from "../i18n";
import { hasWebGL } from "../webgl";
import { useReducedMotion } from "../hooks";
import { HubIdle } from "../components/HubIdle";

export function Hub() {
  const { t } = useI18n();
  const reduced = useReducedMotion();
  const [webgl, setWebgl] = useState(false);

  useEffect(() => {
    setWebgl(hasWebGL());
  }, []);

  const showScene = webgl && !reduced;

  return (
    <main className="hub">
      {showScene ? (
        <div className="hub-canvas" aria-hidden>
          <Canvas
            dpr={[1, 1.5]}
            gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
            camera={{ position: [0, 0, 5.5], fov: 40 }}
          >
            <color attach="background" args={["#070708"]} />
            <ambientLight intensity={0.3} />
            <Suspense fallback={null}>
              <Environment resolution={128}>
                <Lightformer
                  form="rect"
                  intensity={2}
                  position={[3, 2, 2]}
                  scale={[5, 3, 1]}
                  color="#e8eef4"
                />
                <Lightformer
                  form="rect"
                  intensity={0.8}
                  position={[-3, 0, -1]}
                  scale={[4, 3, 1]}
                  color="#8a9aa8"
                />
              </Environment>
              <Float speed={0.6} rotationIntensity={0.25} floatIntensity={0.4}>
                <HubIdle />
              </Float>
            </Suspense>
          </Canvas>
        </div>
      ) : (
        <div className="hub-canvas fallback-still" aria-hidden />
      )}

      <div className="hub-copy">
        <div>
          <h1 className="hub-wordmark">{t.brand}</h1>
          <p className="hub-tagline">{t.tagline}</p>
          <p className="hub-tagline" style={{ marginTop: 12 }}>
            {t.hub.lead}
          </p>
        </div>

        <ul className="hub-list">
          {DEMO_ORDER.map((id) => {
            const demo = t.demos[id];
            return (
              <li key={id} className="hub-item">
                <Link to={`/${id}`}>
                  <span className="num">{demo.number}</span>
                  <span className="title">{demo.title}</span>
                  <p className="blurb">{demo.blurb}</p>
                  <span className="enter">{t.hub.enter} →</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
