import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "es";

export type DemoId =
  | "liquid-metal"
  | "living-planet"
  | "exploded-object"
  | "particle-universe"
  | "organic-matter";

type DemoCopy = {
  number: string;
  title: string;
  blurb: string;
  hint: string;
  materials?: string[];
  layers?: string[];
  actions?: string[];
  parts?: { name: string; line: string }[];
  scroll?: string;
  staticNote?: string;
  phases?: { title: string; text: string }[];
};

const en = {
  brand: "AETHER",
  tagline: "Interactive matter.",
  lang: { en: "EN", es: "ES" },
  langLabel: "Language",
  back: "All demos",
  loading: "Loading scene…",
  noWebGL: {
    title: "WebGL is unavailable",
    text: "This lab needs a browser with WebGL. Try another browser or enable hardware acceleration.",
  },
  hub: {
    lead: "Five small interactive worlds — metal, planet, mechanism, particles, living form.",
    enter: "Enter",
  },
  demos: {
    "liquid-metal": {
      number: "01",
      title: "Liquid Metal",
      blurb: "Mercury you can touch. It ripples under the cursor and splashes on click.",
      hint: "Hover to ripple · click to splash · drag to turn",
      materials: ["Chrome", "Gold", "Obsidian"],
    },
    "living-planet": {
      number: "02",
      title: "Living Planet",
      blurb: "Earth as it is right now: the sun sits where it really is.",
      hint: "Drag to orbit · scroll to zoom",
      layers: ["Clouds", "City lights", "Atmosphere"],
      actions: ["Live", "Time-lapse"],
    },
    "exploded-object": {
      number: "03",
      title: "Exploded Object",
      blurb: "A watch, taken apart layer by layer as you scroll.",
      hint: "Scroll to take it apart",
      scroll: "Scroll",
      staticNote:
        "Motion is reduced, so the watch stays whole. Its parts are listed below.",
      phases: [
        { title: "One watch. Seven layers.", text: "Scroll to take it apart." },
        { title: "Every layer in plain sight.", text: "Nothing hides under the crystal." },
        { title: "And back in its place.", text: "Bottom to top, one by one." },
        { title: "Seven layers. One movement.", text: "Scroll up to take it apart again." },
      ],
      parts: [
        { name: "Crystal", line: "Domed sapphire, anti-reflective." },
        { name: "Hands", line: "Skeleton blades with a lume tip." },
        { name: "Bezel & dial", line: "Machined ring with a minute track." },
        { name: "Upper bridge", line: "Anodised titanium, spectrum finish." },
        { name: "Lower bridge", line: "Holds the gear train in place." },
        { name: "Gear train", line: "Steel wheels, one tooth at a time." },
        { name: "Case", line: "Brushed steel with a carbon floor." },
      ],
    },
    "particle-universe": {
      number: "04",
      title: "Particle Universe",
      blurb: "A glowing wave field. Hover to swirl, click to send a shockwave, hold to pull it in.",
      hint: "Hover · click · hold",
    },
    "organic-matter": {
      number: "05",
      title: "Organic Matter",
      blurb: "A living form that leans toward you and swells where you point.",
      hint: "Move over it · click to pulse · drag to turn",
    },
  } satisfies Record<DemoId, DemoCopy>,
};

const es: typeof en = {
  brand: "AETHER",
  tagline: "Materia interactiva.",
  lang: { en: "EN", es: "ES" },
  langLabel: "Idioma",
  back: "Todas las demos",
  loading: "Cargando escena…",
  noWebGL: {
    title: "WebGL no disponible",
    text: "Este lab necesita un navegador con WebGL. Prueba otro o activa la aceleración por hardware.",
  },
  hub: {
    lead: "Cinco mundos interactivos — metal, planeta, mecanismo, partículas, forma viva.",
    enter: "Entrar",
  },
  demos: {
    "liquid-metal": {
      number: "01",
      title: "Liquid Metal",
      blurb: "Mercurio que se toca. Ondula bajo el cursor y salpica al hacer clic.",
      hint: "Pasa el cursor · clic para salpicar · arrastra para girar",
      materials: ["Cromo", "Oro", "Obsidiana"],
    },
    "living-planet": {
      number: "02",
      title: "Living Planet",
      blurb: "La Tierra tal como está ahora mismo: el sol está donde de verdad está.",
      hint: "Arrastra para orbitar · scroll para zoom",
      layers: ["Nubes", "Luces de ciudad", "Atmósfera"],
      actions: ["En vivo", "Time-lapse"],
    },
    "exploded-object": {
      number: "03",
      title: "Exploded Object",
      blurb: "Un reloj que se desarma capa a capa mientras haces scroll.",
      hint: "Haz scroll para desarmarlo",
      scroll: "Scroll",
      staticNote:
        "El movimiento está reducido, así que el reloj se queda entero. Sus piezas van listadas debajo.",
      phases: [
        { title: "Un reloj. Siete capas.", text: "Haz scroll para desarmarlo." },
        { title: "Cada capa, a la vista.", text: "Nada se esconde bajo el cristal." },
        { title: "Y vuelve a su sitio.", text: "De abajo arriba, una a una." },
        { title: "Siete capas. Un movimiento.", text: "Sube para desarmarlo otra vez." },
      ],
      parts: [
        { name: "Cristal", line: "Zafiro abombado, antirreflejo." },
        { name: "Agujas", line: "Esqueleto con punta luminiscente." },
        { name: "Bisel y esfera", line: "Anillo mecanizado con minutero." },
        { name: "Puente superior", line: "Titanio anodizado, acabado espectro." },
        { name: "Puente inferior", line: "Sujeta el tren de engranajes." },
        { name: "Tren de engranajes", line: "Ruedas de acero, diente a diente." },
        { name: "Caja", line: "Acero cepillado con fondo de carbono." },
      ],
    },
    "particle-universe": {
      number: "04",
      title: "Particle Universe",
      blurb: "Un campo de ondas luminoso. Pasa el cursor para arremolinar, clic para una onda de choque, mantén para atraer.",
      hint: "Pasa · clic · mantén",
    },
    "organic-matter": {
      number: "05",
      title: "Organic Matter",
      blurb: "Una forma viva que se inclina hacia ti y se hincha donde apuntas.",
      hint: "Muévete encima · clic para latir · arrastra para girar",
    },
  },
};

const dicts = { en, es };

export const DEMO_ORDER: DemoId[] = [
  "liquid-metal",
  "living-planet",
  "exploded-object",
  "particle-universe",
  "organic-matter",
];

type I18nValue = {
  lang: Lang;
  t: typeof en;
  setLang: (lang: Lang) => void;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("aether-lang");
    return saved === "en" || saved === "es" ? saved : "es";
  });

  const setLang = (next: Lang) => {
    setLangState(next);
    localStorage.setItem("aether-lang", next);
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo(() => ({ lang, t: dicts[lang], setLang }), [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
