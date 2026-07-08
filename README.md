# DinoQuiz

PWA de quiz de dinosaurios — **frontend puro** (React/JS web + localStorage, sin backend ni servidor).

Piloto sintético de la plataforma TrioForge. Este `main` es el esqueleto de arranque:
gate de seguridad CI + arnés de tests en verde. El resto lo construye el pipeline de agentes,
una tarea por PR, sobre esta base.

## Desarrollo

```bash
npm install
npm test
```

## Banco de preguntas

El banco de 40 preguntas vive en [`src/data/questions.json`](src/data/questions.json) y se
carga/valida a través de [`src/data/questionBank.js`](src/data/questionBank.js).

Cada pregunta sigue este esquema:

```jsonc
{
  "id": "trex-01",              // identificador único
  "dinosaur": "trex",           // uno de: trex, triceratops, velociraptor,
                                 // estegosaurio, braquiosaurio, ankylosaurus, pteranodon
  "question": "...",            // enunciado
  "options": ["...", "..."],    // 3-4 opciones de respuesta
  "correctAnswerIndex": 0,      // índice de la opción correcta
  "dato_curioso": "funFacts.trex-01", // clave i18n (ver src/i18n/es.json) del dato curioso
                                 // mostrado tras responder; el texto nunca va hardcodeado aquí
  "image": "dinosaurs/trex.png" // referencia a la ilustración del dinosaurio
}
```

`loadQuestionBank()` lee el JSON y valida el esquema de cada pregunta (opciones, índice de
respuesta correcta, ids únicos, que cada `dato_curioso` resuelva a un texto no vacío en el
recurso i18n, etc.). El banco cubre los 7 dinosaurios con al menos 3-4 preguntas cada uno, y
cada una de esas preguntas tiene su propio dato curioso.

El texto de cada dato curioso vive en [`src/i18n/es.json`](src/i18n/es.json) bajo la clave
`funFacts.<id-de-pregunta>`, siguiendo el mismo criterio de "sin strings hardcodeados" que el
resto de textos de la UI.

## Pantalla de Inicio

[`public/scripts/homeScreen.js`](public/scripts/homeScreen.js) renderiza la pantalla de
Inicio: título "DinoQuiz", ilustración de la mascota, botón "¡Jugar!" y un aviso opcional y
discreto para madres/padres. El aviso explica que, al no haber cuenta ni sincronización
en la nube, el progreso local (puntuación, racha y datos curiosos) se pierde si se
reinstala la app o se cambia de dispositivo. Usa `role="note"` y no tiene `tabindex`, por
lo que un lector de pantalla puede alcanzarlo pero nunca interrumpe ni bloquea el flujo
del niño hacia el botón de jugar.

El archivo vive en `public/scripts/` (no en `src/`) porque, al no haber bundler, es el
propio navegador quien lo carga como `<script>` (ver [`public/index.html`](public/index.html)):
sigue el mismo patrón dual CommonJS/global que [`public/scripts/main.js`](public/scripts/main.js),
por lo que también se puede `require`-ar directamente desde los tests de Node (ver
[`tests/pwa/home-screen.test.js`](tests/pwa/home-screen.test.js)). Al arrancar, `main.js`
hace `fetch('/i18n/es.json')` y llama a `renderHomeScreen(document.getElementById('app'), { strings })`,
por lo que la pantalla de Inicio sí se pinta dentro de `#app` (antes solo se registraba el
service worker y `#app` quedaba vacío).

El layout (definido en [`public/styles/main.css`](public/styles/main.css)) es tablet-first
(el objetivo principal es una tablet en horizontal) y degrada de forma gradual en móvil y
escritorio no tablet: el título y la mascota escalan con `clamp()` y el botón "¡Jugar!"
nunca baja de 64px de alto, 48px de ancho mínimo ni 24px (1.5rem) de texto, cumpliendo los
tamaños táctiles y de legibilidad mínimos en todos los tamaños de pantalla. Los colores de
texto (`#1b5e20` sobre `#fff8e1`, texto blanco sobre `#2e7d32`) cumplen el contraste WCAG AA.

La ilustración de la mascota ([`public/assets/images/mascot.svg`](public/assets/images/mascot.svg))
es un SVG ligero con `alt` descriptivo tomado del recurso i18n y está incluida en la
precarga del service worker (ver [`public/service-worker.js`](public/service-worker.js))
junto al resto del app shell, para que la pantalla de Inicio pinte por completo sin red en
menos de 2 segundos.

Todos los textos se gestionan desde el recurso i18n en [`public/i18n/es.json`](public/i18n/es.json)
(cargado en Node a través de [`src/i18n/index.js`](src/i18n/index.js), y en el navegador con
`fetch` desde `main.js`); v1 solo expone el locale `es`.

## Pantalla de Pregunta/Feedback

[`src/screens/QuestionScreen.js`](src/screens/QuestionScreen.js) renderiza una pregunta y,
al pulsar una opción, aplica el feedback visual y el scoring (TRIOFSND-77):

- La opción correcta siempre se resalta en verde con borde grueso
  (`question-screen__option--correct`), acierte o falle el niño.
- Si acierta, además reproduce una animación alegre (`question-screen__option--celebrate`,
  ver `public/styles/main.css`) y suma +1 punto vía
  [`src/game/scoring.js`](src/game/scoring.js).
- Si falla, la opción elegida se marca en un color neutro
  (`question-screen__option--neutral`, sin rojo ni lenguaje negativo) y no se descuenta ni
  se suma ningún punto — `applyAnswerToScore` nunca resta.
- Todas las opciones quedan deshabilitadas tras responder, evitando un segundo toque que
  altere la puntuación.

Rendimiento (AC-5, feedback en <300ms): las clases de feedback se aplican de forma síncrona
dentro del propio manejador de clic (sin `setTimeout` ni trabajo asíncrono) y la única
animación es un `@keyframes` CSS que solo anima `transform` (compositor, sin reflow).
`warmUpFeedbackAnimation()` resuelve ese keyframe una vez, fuera de pantalla, justo al montar
la pregunta, para que el primer toque real del niño no pague ese coste.

Los tokens de color de cada estado (normal/correcto/neutro) viven en
[`src/theme/questionScreenColors.js`](src/theme/questionScreenColors.js) y
[`src/theme/contrast.js`](src/theme/contrast.js) los valida contra el umbral WCAG AA
(≥4.5:1, AC-13) en `src/theme/contrast.test.js`, en sincronía con las reglas de
`public/styles/main.css`.

## Pantalla de Resultados

[`src/screens/ResultsScreen.js`](src/screens/ResultsScreen.js) renderiza la pantalla de
Resultados al terminar una partida: puntuación (`X/10`), estrellas por tramos
(0-3 → 1 estrella, 4-6 → 2 estrellas, 7-10 → 3 estrellas, ver `calculateStars`), un mensaje
motivador siempre positivo elegido al azar entre `results.messages` (`es.json`), un botón
prominente "Volver a jugar" y un botón secundario opcional "Salir".

`validateMotivationalMessages` actúa como guardarraíl de contenido: comprueba que ningún
mensaje contenga lenguaje negativo (comparando palabras completas, sin acentos, contra una
lista de términos prohibidos) para que la guía de contenido se cumpla también en tiempo de
test, no solo por revisión manual.

Accesibilidad: además de los elementos visibles (puntuación, estrellas con
`role="img"`/`aria-label`, mensaje), la pantalla incluye una región `role="status"` con
`aria-live="polite"` (oculta visualmente con `.sr-only`) que anuncia la puntuación, las
estrellas y el mensaje como una sola frase a los lectores de pantalla. Los botones cumplen
el área táctil mínima de 48x48dp y el contraste de texto respeta WCAG AA.
