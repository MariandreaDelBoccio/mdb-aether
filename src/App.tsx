import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { SiteHeader } from "./components/SiteHeader";
import { NoWebGL } from "./components/NoWebGL";
import { Hub } from "./pages/Hub";
import { useI18n } from "./i18n";
import { hasWebGL } from "./webgl";

const LiquidMetal = lazy(() =>
  import("./demos/LiquidMetal").then((m) => ({ default: m.LiquidMetal })),
);
const LivingPlanet = lazy(() =>
  import("./demos/LivingPlanet").then((m) => ({ default: m.LivingPlanet })),
);
const ExplodedObject = lazy(() =>
  import("./demos/ExplodedObject").then((m) => ({ default: m.ExplodedObject })),
);
const ParticleUniverse = lazy(() =>
  import("./demos/ParticleUniverse").then((m) => ({
    default: m.ParticleUniverse,
  })),
);
const OrganicMatter = lazy(() =>
  import("./demos/OrganicMatter").then((m) => ({ default: m.OrganicMatter })),
);

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function DemoGate({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const [webgl, setWebgl] = useState(true);

  useEffect(() => {
    setWebgl(hasWebGL());
  }, []);

  if (!webgl) {
    return (
      <div className="demo-page">
        <NoWebGL />
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="demo-page">
          <div className="loading-veil">
            <div>
              <h2>{t.brand}</h2>
              <p>{t.loading}</p>
            </div>
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

const gate = (node: React.ReactNode) => <DemoGate>{node}</DemoGate>;

export default function App() {
  return (
    <div className="aether">
      <ScrollToTop />
      <SiteHeader />
      <Routes>
        <Route path="/" element={<Hub />} />
        <Route path="/liquid-metal" element={gate(<LiquidMetal />)} />
        <Route path="/living-planet" element={gate(<LivingPlanet />)} />
        <Route path="/exploded-object" element={gate(<ExplodedObject />)} />
        <Route path="/particle-universe" element={gate(<ParticleUniverse />)} />
        <Route path="/organic-matter" element={gate(<OrganicMatter />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
