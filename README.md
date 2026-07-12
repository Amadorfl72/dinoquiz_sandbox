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

El banco de 40 preguntas vive en [`public/data/questions.json`](public/data/questions.json)
y se carga/valida a través de [`src/data/questionBank.js`](src/data/questionBank.js). El JSON
vive bajo `public/` (igual que [`public/i18n/es.json`](public/i18n/es.json)) para que el
navegador pueda hacerle `fetch('/data/questions.json')` en tiempo de ejecución sin duplicarlo
entre `src/` y `public/`; el service worker lo cachea (ver
[`public/service-worker.js`](public/service-worker.js)).

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

## Motor de selección aleatoria de preguntas

[`src/game/questionSelector.js`](src/game/questionSelector.js) implementa la lógica que, al
iniciar una partida, elige `QUESTIONS_PER_GAME` (10) preguntas del banco de 40 de forma
aleatoria:

- `shuffle(items, randomFn)` baraja el banco completo con un Fisher-Yates (sin mutar el
  array de entrada), dando a cada pregunta la misma probabilidad de salir en cualquier
  posición.
- `selectGameQuestions(questions, options)` devuelve los primeros `count` elementos (10 por
  defecto) de ese barajado. Al salir de un `shuffle`, nunca hay dos posiciones con la misma
  pregunta, así que la selección resultante nunca repite ninguna dentro de la misma partida
  (AC-3). Lanza un error si el banco tiene menos preguntas que las solicitadas.
- `randomFn` (por defecto `Math.random`) es inyectable, igual que en
  `selectMotivationalMessage` de la pantalla de Resultados, para que los tests sean
  deterministas.

`src/game/questionSelector.test.js` cubre la ausencia de duplicados dentro de una partida,
que toda pregunta seleccionada pertenezca al banco original, y la distribución: en un número
alto de partidas simuladas, cada pregunta del banco sale seleccionada y a un ritmo similar
al resto (sin preguntas "muertas" que nunca salgan).

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

### Controles globales: mute, política de privacidad y compra in-app

`renderHomeScreen` también monta, junto al botón "¡Jugar!", un grupo de tres botones-icono
(`role="group"`, ver `.home-screen__global-controls` en `main.css`): silenciar sonido, política
de privacidad y eliminar anuncios (compra in-app). Los tres son `<button>` nativos de al menos
48x48dp (`.home-screen__icon-button`), navegables por teclado y con `aria-label` propio, por lo
que cumplen el mismo criterio táctil/accesible que el resto de controles de la app.

- **Mute**: alterna `aria-pressed` y su `aria-label` (silenciar/activar) al pulsarlo. La pantalla
  en sí no persiste nada -- delega en `options.onToggleMute`, igual que `onPlayAgain`/`onExit` en
  `ResultsScreen` -- para seguir siendo un componente DOM puro y testeable. Quien la monta en el
  navegador ([`public/scripts/main.js`](public/scripts/main.js)) lee/escribe el estado inicial en
  `localStorage` bajo la misma clave con namespace (`dinoquiz:muted`, JSON-serializada) que ya usa
  [`src/services/storage`](src/services/storage), de forma que ambos caminos son compatibles.
- **Política de privacidad** y **eliminar anuncios**: cada botón despliega un panel
  (`.home-screen__panel`, patrón WAI-ARIA de disclosure con `aria-expanded`/`aria-controls`) con
  el contenido correspondiente, tomado de las claves `privacy` y `purchase` de `es.json` -- nunca
  hardcodeado (AC-15). Como abrir el panel es un único toque desde Inicio, la política de
  privacidad queda alcanzable en ≤2 taps (AC-16). El panel de compra incluye el precio y un botón
  "Comprar ahora" que invoca `options.onPurchase`: es el punto de entrada al flujo de compra
  in-app, no la integración de cobro en sí (pendiente de la pasarela de pago real). Ambos paneles
  se cierran con su botón "Cerrar", con la tecla Escape, o devolviendo el foco al botón que los
  abrió.

Estos tres controles viven en `homeScreen.js` (no como `src/screens/*Screen.js` independientes)
porque no son una "pantalla" navegable dentro del flujo Inicio → Quiz → Resultados: son paneles
de contenido que se abren y cierran sin salir de Inicio.

## Pantalla de Pregunta/Feedback

La pantalla de Pregunta la renderiza
[`public/scripts/questionScreen.js`](public/scripts/questionScreen.js) (el navegador la
carga como `<script>`, sin bundler; [`src/screens/QuestionScreen.js`](src/screens/QuestionScreen.js)
la re-exporta para Node/Jest). Al pulsar una opción, aplica el feedback visual y el scoring
(TRIOFSND-77):

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

Los tokens de color de cada estado (normal/correcto/neutro/dato curioso) viven en
[`src/theme/questionScreenColors.js`](src/theme/questionScreenColors.js) y
[`src/theme/contrast.js`](src/theme/contrast.js) los valida contra el umbral WCAG AA
(≥4.5:1, AC-13) en `src/theme/contrast.test.js`, en sincronía con las reglas de
`public/styles/main.css`.

### Feedback y dato curioso (TRIOFSND-83)

Tras responder, además del resaltado de la opción correcta, la pantalla muestra:

- La ilustración del dinosaurio de la pregunta (`question-screen__image`), con un `alt`
  descriptivo generado a partir de `question.dinosaur` y el mapa `dinosaurNames` del
  recurso i18n (`question.dinosaurNames` en `es.json`), nunca un texto genérico como
  "imagen".
- El dato curioso en un recuadro amarillo (`question-screen__fun-fact-box`), con
  tipografía ≥20sp y `aria-live="polite"` para que TalkBack/VoiceOver lo lean en cuanto
  aparece.
- El botón "Siguiente" (`question-screen__next-button`, área táctil ≥48x48dp), que se
  muestra deshabilitado y solo se habilita tras `MIN_ADVANCE_DELAY_MS` (4s, ver
  `src/screens/QuestionScreen.js`) para garantizar que el dato curioso esté visible al
  menos ese tiempo (AC-6). El temporizador es un `setTimeout` de reloj de pared, sin
  ninguna dependencia de audio, por lo que el flujo funciona igual en modo silencio.

### CTA opcional de anuncio con recompensa (TRIOFSND-86)

Junto al dato curioso gratuito, la pantalla de feedback ofrece un CTA opcional y
claramente etiquetado ("🎬 Ver anuncio: ¡dato extra!", `question-screen__rewarded-ad-cta`)
para desbloquear un segundo dato curioso viendo un anuncio con recompensa. El CTA llama al
único punto de entrada de anuncios de la app,
[`src/services/ads/rewardedAdService.js`](src/services/ads/rewardedAdService.js), en vez de
hablar con un SDK de anuncios directamente — así, cuando en el futuro se integre una red de
anuncios real, solo hay que sustituir el `provider` de ese servicio, sin tocar la pantalla.

- El CTA solo se muestra si `rewardedAdService.isAvailable()` responde `true`. La v1 no
  integra ningún SDK de anuncios (ver `open_risks` del PRD: "sin SDK publicitario
  comportamental"), así que el proveedor por defecto siempre informa que no hay anuncio
  disponible y el CTA permanece oculto — el mecanismo completo queda implementado y
  probado (con un proveedor simulado inyectable) listo para activarse.
- `rewardedAdService.request()` nunca rechaza la promesa: si el anuncio no está disponible,
  no se completa o el proveedor lanza un error, siempre resuelve
  `{ granted: false, reason: ... }`. La pantalla nunca necesita `try/catch` ni bloquea el
  flujo — "Siguiente" y su temporizador son completamente independientes del CTA.
- Si el niño ve el anuncio hasta el final (`granted: true`), se revela un segundo recuadro
  de dato curioso (`question-screen__extra-fun-fact-box`, azul para diferenciarlo del
  amarillo del dato curioso gratuito) con un dato adicional del mismo dinosaurio
  (`question.rewardedAd.extraFacts` en `es.json`).
- Si no se completa, se muestra un mensaje neutro y no bloqueante
  (`question-screen__rewarded-ad-status`, `aria-live="polite"`) y la partida continúa igual.

Como el resto de pantallas, la implementación real vive en
[`public/scripts/questionScreen.js`](public/scripts/questionScreen.js) (con la misma
resolución `require`-o-`window.DinoQuiz` que usa para scoring/i18n) y
[`src/screens/QuestionScreen.js`](src/screens/QuestionScreen.js) la re-exporta para Node/Jest.

## Pantalla de Resultados

La pantalla de Resultados la renderiza
[`public/scripts/resultsScreen.js`](public/scripts/resultsScreen.js) (cargada por el
navegador como `<script>`, sin bundler; [`src/screens/ResultsScreen.js`](src/screens/ResultsScreen.js)
la re-exporta para Node/Jest) al terminar una partida: puntuación (`X/10`), estrellas por tramos
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
estrellas y el mensaje como una sola frase a los lectores de pantalla. El botón "Volver a
jugar" cumple la altura visual mínima de 64dp (AC-2/AC-23, ver
`.results-screen__play-again-button` en `public/styles/main.css`) y ambos botones cumplen
el área táctil mínima de 48x48dp; el contraste de texto respeta WCAG AA.

### Navegación Inicio → Quiz → Resultados

[`public/scripts/main.js`](public/scripts/main.js) es quien conecta las tres pantallas en
el flujo lineal cerrado del PRD: al pulsar "¡Jugar!" en Inicio (o "Volver a jugar" en
Resultados) arranca una partida nueva con `startNewGame` — que resetea el estado de
partida (puntuación, índice de pregunta y respuestas, ver
[`src/game/gameFlow.js`](src/game/gameFlow.js)) y selecciona un subconjunto aleatorio de
10 preguntas distinto del anterior (AC-9) — y navega a la primera pregunta de esa partida.
Al responder la última pregunta se muestra Resultados; su botón "Salir" vuelve a renderizar
Inicio.

Como no hay bundler, todo lo que el navegador ejecuta (scoring, gameFlow y las tres
pantallas) se carga como `<script>` desde `public/scripts/` y se registra en
`window.DinoQuiz` (ver el orden en [`public/index.html`](public/index.html)). Al arrancar,
`main.js` hace `fetch` de `/i18n/es.json` y `/data/questions.json`, prepara el banco (resuelve
cada `dato_curioso` a su texto de dato curioso) y lo deja en `window.DinoQuiz` para que
`loadQuestions()` y las pantallas lo lean de forma síncrona. `resolveScreenRenderers`,
`resolveGameFlow` y `loadQuestions` resuelven desde `window.DinoQuiz` en el navegador o vía
`require` bajo Node/Jest, por lo que el flujo corre igual en la PWA real y en los tests sin
bundler (ver [`tests/pwa/game-flow.test.js`](tests/pwa/game-flow.test.js)).

### Blindaje contra enlaces externos navegables (TRIOFSND-121)

Ninguna de las tres pantallas del flujo cerrado (ni la política de privacidad) renderiza hoy
un `<a>`, pero el PRD exige que un niño de 6-8 años nunca pueda salir de la app de un toque,
ni siquiera si una futura pantalla, cadena i18n o integración de anuncios/compra introdujera
un enlace por error. [`installExternalLinkGuard`](public/scripts/appShell.js) instala un único
listener de clic en fase de captura sobre la raíz del app-shell (cubre `#app` y
`#mute-toggle`, es decir toda pantalla presente y futura) que cancela cualquier clic sobre un
`<a>` cuyo `href` resuelva a un origen distinto o cuyo `target` sea `_blank`, y neutraliza
`window.open` para que tampoco un popup lanzado por script pueda sacar al niño de la app. La
navegación interna (la ruta por hash de la política de privacidad, TRIOFSND-116) no usa
`<a>` ni `window.open`, así que no se ve afectada. `public/scripts/main.js` lo instala una vez
al arrancar (`installLinkGuard`, en el listener `load`), junto al registro del service worker
(ver [`tests/pwa/external-link-guard.test.js`](tests/pwa/external-link-guard.test.js)).
