# AETHER

Marca ficticia de lab creativo digital. Pieza 08: hub de demos 3D interactivas.

> Carpeta / repo: `08-aether` / `mdb-aether` (base path de Pages `/mdb-aether/`).

## Promesa

Materia interactiva. Cinco mundos pequeños — metal líquido, la Tierra real, un reloj que se desarma con el scroll, partículas, forma viva — sin galería de modelos muertos.

## Flujo

`Hub → demo (lazy) → back`

Rutas: `/`, `/liquid-metal`, `/living-planet`, `/exploded-object`, `/particle-universe`, `/organic-matter`.

## Qué demuestra

React Three Fiber con **cinco Canvas lazy** (un solo activo), Environment / Lightformers, metal líquido deformable por cursor, planeta real (mapas 4K, posición del sol por hora UTC, terminador, luces de ciudad, atmósfera), reloj procedural que se desarma con scroll pinneado (leyendas ancladas a cada capa), partículas con remolino / onda de choque / atracción, noise orgánico reactivo al cursor, fallback sin WebGL y `prefers-reduced-motion`. UI bilingüe EN/ES.

No es un configurador de producto (eso es MERIDIAN) ni una narrativa larga como KAI (aquí el scroll solo desarma una pieza): es un lab de materia jugable.

## Paleta

| Nombre | Hex | Uso |
| --- | --- | --- |
| Ink | `#070708` | Fondo |
| Ink 2 | `#121214` | Gradiente |
| Metal | `#C8D0D8` | Texto / acento |
| Metal dim | `#8A9AA8` | Secundario |
| Mute | `#6A737C` | Hints |

## Tipografía

- Display / wordmark: **Syne**
- UI: **DM Sans**

## Caso de estudio

### Problema
Las “galerías 3D” de portfolio suelen ser modelos estáticos. No demuestran interacción ni criterio de materia.

### Decisión de diseño
Fondo casi negro, tipografía geométrica, espacio negativo. El objeto es el protagonista; el copy cabe en cuatro líneas.

### Decisión técnica
Vite + R3F + drei + react-router. Cada demo es un chunk. Assets procedurales + Lightformers (sin GLB pesados en v1).

### Por qué una plantilla no puede
Un tema no entrega cuatro demos R3F con materiales vivos, partículas al cursor y shaders propios en un lab con identidad.

### Métricas objetivo
Un Canvas activo; `dpr` capped; partículas adaptativas en móvil; primer paint usable < 2.5 s en mid-range.

### Créditos
Texturas de planeta: ejemplos de three.js (Earth atmos / lights / clouds / specular).
