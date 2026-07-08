# Convenciones de estructura — DinoQuiz

> **Contrato de arquitectura del proyecto.** Toda tarea DEBE respetar estas
> ubicaciones canónicas. No dupliques un concepto en dos sitios ni inventes un
> layout nuevo: extiende el que hay. El objetivo es que ramas independientes no
> coloquen el mismo fichero en rutas distintas (causa merges irresolubles).

## Modelo de runtime

DinoQuiz es una **PWA frontend sin paso de build** (no hay bundler). Regla base:

- **Todo lo que el NAVEGADOR carga o hace `fetch()` en runtime vive bajo `public/`**
  (es la raíz web servida; el service worker la precachea).
- **`src/` es código de módulos (`require`/CommonJS) probado con jest** — lógica
  pura y componentes testeables. El puente src→navegador es responsabilidad del
  app-shell en `public/`.

## Ubicaciones canónicas

| Concepto | Ruta canónica | Notas |
|---|---|---|
| App-shell / HTML | `public/index.html` | ÚNICA entrada. `offline.html` al lado. |
| Manifest / SW | `public/manifest.json`, `public/service-worker.js` | En raíz web. |
| Iconos / imágenes | `public/icons/`, `public/assets/images/` | |
| Estilos | `public/styles/` | CSS servido. |
| **i18n (DATOS)** | **`public/i18n/<locale>.json`** | El navegador los hace `fetch('/i18n/es.json')` y el SW los precachea → DEBEN estar en `public/`. NUNCA en `src/i18n/*.json`. |
| **i18n (loader)** | **`src/i18n/index.js`** | `getStrings(locale)`; hace `require('../../public/i18n/es.json')`. El código y los tests obtienen strings por AQUÍ, no leyendo el JSON a mano. |
| Pantallas | `src/screens/<Nombre>Screen.js` | Una pantalla = un fichero. NO en `public/scripts/`. |
| Lógica de juego | `src/game/` | scoring, flujo. |
| Datos (banco preguntas) | `src/data/` | `questionBank.js`, `questions.json`. |
| Servicios (storage, analytics) | `src/services/` | Client-side; sin backend. |
| Theme / colores | `src/theme/` | |
| App entry navegador | `public/scripts/main.js` | Arranca la app en el navegador. |
| Tests unitarios | junto al código: `foo.js` → `foo.test.js` | |
| Tests transversales (PWA, e2e) | `tests/` | p.ej. `tests/pwa/`. |

## Reglas duras

1. **Un concepto, una ruta.** Antes de crear un fichero, comprueba si ya existe
   bajo la ruta canónica y EXTIÉNDELO en vez de duplicarlo en otra carpeta.
2. **i18n:** datos SOLO en `public/i18n/`; acceso SOLO vía `src/i18n` (loader).
3. **Sin backend.** Analytics/observabilidad/persistencia son client-side
   (`localStorage`/`IndexedDB`), nunca servicios de servidor.
4. **`npm test` debe quedar VERDE** tras tu cambio (el QA lo ejecuta de verdad).
