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

## Docker

DinoQuiz también puede ejecutarse contenerizado con [Docker](https://docs.docker.com/get-docker/)
(versión con soporte de `docker compose`), sirviendo el contenido de `public/` con nginx
(ver [`Dockerfile`](Dockerfile) y [`docker/nginx.conf`](docker/nginx.conf)). No hace falta tener
Node ni ninguna otra dependencia instalada en la máquina: basta con Docker.

**Requisitos previos:** tener Docker instalado y en ejecución.

**Construir la imagen:**

```bash
docker compose build
```

**Levantar el contenedor:**

```bash
docker compose up -d
```

La app queda disponible en [http://localhost:8080](http://localhost:8080) (ver el mapeo de
puertos `8080:80` en [`docker-compose.yml`](docker-compose.yml)).

**Parar el contenedor:**

```bash
docker compose down
```

**Reconstruir tras cambios:** `docker compose build` usa la caché de capas de Docker, así que
solo reconstruye las capas afectadas por los ficheros que hayan cambiado (por ejemplo, si solo
cambia algo bajo `public/`, la capa de la imagen base de nginx no se vuelve a descargar ni
reconstruir). Para forzar una reconstrucción completa e ignorar la caché:

```bash
docker compose build --no-cache
```

**Sin credenciales:** la imagen no requiere ni embebe ningún secreto, credencial, API key o
variable de entorno — coherente con que DinoQuiz es una PWA sin backend ni cuentas de usuario
(ver `out_of_scope` del PRD). `docker-compose.yml` no define ninguna variable `environment` ni
fichero `.env`.

## PWA: instalación y despliegue (TRIOFSND-139)

DinoQuiz cumple los tres criterios de instalabilidad de una PWA:

- **Manifest** ([`public/manifest.json`](public/manifest.json)): `name`/`short_name`,
  `start_url`, `display: "standalone"`, `background_color`/`theme_color` e iconos
  192x192/512x512 (ver [`tests/pwa/manifest.test.js`](tests/pwa/manifest.test.js)).
  Enlazado desde [`public/index.html`](public/index.html) vía `<link rel="manifest">`.
- **Service worker** ([`public/service-worker.js`](public/service-worker.js)): precachea el
  app shell completo (HTML/CSS/JS, manifest, iconos, i18n, banco de preguntas) en el
  evento `install` y sirve en **cache-first** cualquier asset que se añada después (imágenes
  de dinosaurios, audio, JSON), cacheándolo la primera vez que se pide (ver
  [`tests/pwa/service-worker.test.js`](tests/pwa/service-worker.test.js)). Las navegaciones
  HTML son network-first con caída a caché y, si no hay nada cacheado, a
  [`public/offline.html`](public/offline.html) — así una partida ya iniciada sigue jugable sin
  red. Se registra desde [`public/scripts/main.js`](public/scripts/main.js) (`registerServiceWorker`,
  ver [`tests/pwa/registration.test.js`](tests/pwa/registration.test.js)).
- **HTTPS**: los service workers solo se registran en un
  [contexto seguro](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts)
  (HTTPS, o `http://localhost` en desarrollo); sin HTTPS el navegador ignora el registro y la
  PWA deja de ser instalable y de funcionar offline. Al no haber backend, cualquier hosting
  estático con HTTPS gestionado (GitHub Pages, Netlify, Vercel, Cloudflare Pages, etc.) sirve:
  basta con desplegar el contenido de `public/` tal cual (no requiere build) detrás de ese
  hosting. `npm test` no puede verificar la configuración de HTTPS del entorno de despliegue en
  sí (no forma parte del código fuente), pero si se sirve la app por HTTP en producción el
  navegador desactivará el service worker aunque el resto de la implementación sea correcta.

## Banco de preguntas

El banco de 300 preguntas (30 por cada uno de los 10 niveles) vive en
[`public/data/questions.json`](public/data/questions.json)
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
                                 // estegosaurio, braquiosaurio, ankylosaurus, pteranodon,
                                 // spinosaurus, dilophosaurus, pachycephalosaurus,
                                 // compsognathus, diplodocus, iguanodon, parasaurolophus
  "question": "...",            // enunciado
  "options": ["...", "..."],    // 3-4 opciones de respuesta
  "correctAnswerIndex": 0,      // índice de la opción correcta
  "dato_curioso": "funFacts.trex-01", // clave i18n (ver src/i18n/es.json) del dato curioso
                                 // mostrado tras responder; el texto nunca va hardcodeado aquí
  "image": "dinosaurs/trex.svg",          // ilustración cartoon del dinosaurio
  "imageRealistic": "realistic/trex.jpg", // variante de estilo realista del mismo dinosaurio
  "imageFallback": "fallback/trex.svg",   // asset local de respaldo por dinosaurio, para cuando
                                 // la imagen principal no llega a cargar
  "imageAlt": "...",            // alt educativo y neutral, compartido por las tres variantes
  "level": 1                    // nivel de dificultad, entero de 1 a 10
}
```

`loadQuestionBank()` lee el JSON y valida el esquema de cada pregunta (opciones, índice de
respuesta correcta, ids únicos, que cada `dato_curioso` resuelva a un texto no vacío en el
recurso i18n, etc.). El banco cubre los 14 dinosaurios con al menos 3-4 preguntas cada uno, y
cada una de esas preguntas tiene su propio dato curioso.

**TRIOFSND-202 — niveles y `getQuestionsByLevel()`:** el banco contiene exactamente 300
preguntas, 30 por cada uno de los 10 niveles (`level`, entero 1-10); `getLevelCoverageErrors()`
comprueba ese reparto y `loadQuestionBank()` lo exige junto a la cobertura por dinosaurio.
`getQuestionsByLevel(level, options)` en
[`src/data/questionBank.js`](src/data/questionBank.js) valida los campos obligatorios de cada
entrada (esquema más las variantes de imagen AW5) y, por cada entrada inválida, emite un evento
`content_validation_failed` (con el id técnico, el nivel y la regla incumplida) a través del
servicio de logging ([`src/services/logging`](src/services/logging)) en lugar de incluirla en
el resultado — una entrada incompleta nunca bloquea el resto del nivel.

**AW5 — variantes de imagen obligatorias:** `loadQuestionBank()` excluye del banco cualquier
pregunta a la que le falte `imageRealistic`, `imageFallback` o `imageAlt` (ver
`hasImageVariants`/`filterQuestionsWithImageVariants` en
[`src/data/questionBank.js`](src/data/questionBank.js)), en vez de invalidar todo el banco por
una única entrada incompleta; `src/data/questionBank.test.js` cubre tanto ese filtrado como el
resto de validaciones sobre el banco real.

Las ilustraciones referenciadas por `image` viven en
[`public/assets/images/dinosaurs/`](public/assets/images/dinosaurs) — un SVG cartoon por
especie (las 14: trex, triceratops, velociraptor, estegosaurio, braquiosaurio, ankylosaurus,
pteranodon, spinosaurus, dilophosaurus, pachycephalosaurus, compsognathus, diplodocus,
iguanodon, parasaurolophus), en el mismo estilo que la mascota. Las variantes `imageRealistic`
viven en [`public/assets/images/realistic/`](public/assets/images/realistic) — paleoarte con
licencia libre de Wikimedia Commons para las 14 especies (ver ese `CREDITS.md` para el detalle
de autor/licencia/fuente por fichero) — y las `imageFallback` en
[`public/assets/images/fallback/`](public/assets/images/fallback) (siluetas de un solo color).
Los siete dinosaurios originales tienen cada uno su propio fichero de fallback; los siete
añadidos en los niveles 6-10 no incorporan uno nuevo por especie y reutilizan en su lugar
`fallback/generic.svg`, la silueta genérica ya existente. Cada una de esas dos carpetas
documenta la licencia de sus SVG en su propio `CREDITS.md`. Todas son ligeras y no requieren
red, por lo que quedan cubiertas por
el runtime-cache del service worker bajo `/assets/images/` (ver
[`public/service-worker.js`](public/service-worker.js)) y disponibles offline tras el primer
uso; `src/data/questionBank.test.js` verifica que `image`, `imageRealistic` e `imageFallback`
de cada pregunta del banco resuelvan a un fichero real bajo `public/assets/images/`.

El texto de cada dato curioso vive en [`src/i18n/es.json`](src/i18n/es.json) bajo la clave
`funFacts.<id-de-pregunta>`, siguiendo el mismo criterio de "sin strings hardcodeados" que el
resto de textos de la UI.

## Motor de selección aleatoria de preguntas

[`src/game/questionSelector.js`](src/game/questionSelector.js) implementa la lógica que, al
iniciar una partida, elige `QUESTIONS_PER_GAME` (10) preguntas del banco de forma
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

### Transición Pregunta → Dato Curioso → Siguiente Pregunta (TRIOFSND-84)

`renderQuestionAt` en `main.js` es el controlador de flujo que conecta la pantalla de
Pregunta/Feedback (dato curioso incluido, TRIOFSND-83) con el avance a la siguiente
pregunta o a Resultados. Cada respuesta puede avanzar el juego de dos formas, ambas
resueltas por la misma función interna `advance()` para que una partida nunca avance dos
veces por la misma pregunta:

- **Manual**: el niño pulsa "Siguiente" una vez que deja de estar deshabilitado (pasado
  `MIN_ADVANCE_DELAY_MS`, ver [`public/scripts/questionScreen.js`](public/scripts/questionScreen.js)).
- **Automático**: si no pulsa nada, un `setTimeout` programado justo tras revelar el
  feedback avanza la partida por su cuenta pasados `MIN_ADVANCE_DELAY_MS +
  AUTO_ADVANCE_GRACE_MS` (el temporizador propio de la pantalla, más un margen extra para
  que el botón haya estado pulsable un rato antes de que la app decida por el niño; PRD
  main_workflow paso 5: "botón 'Siguiente' (o avance automático) lleva a la siguiente
  pregunta"). Un tap manual cancela el temporizador pendiente.

Al responder la pregunta 10 (última del set), ambos caminos navegan a Resultados en lugar
de a una pregunta siguiente. Los escenarios de acierto y fallo, tanto por avance manual
como automático, están cubiertos en
[`tests/pwa/game-flow.test.js`](tests/pwa/game-flow.test.js).

`public/scripts/questionScreen.js` es la implementación canónica de la pantalla de
Pregunta/Feedback que el navegador carga como `<script>` (ver
[`public/index.html`](public/index.html)); `src/screens/QuestionScreen.js` la re-exporta
para Node/Jest, igual que el resto de pantallas (`resultsScreen.js`, `homeScreen.js`).

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

## Fallback funcional sin Service Worker / manifest (TRIOFSND-113)

La matriz de soporte oficial de DinoQuiz son las últimas 2 versiones mayores de Chrome, Edge
y Safari, que soportan Service Worker y manifest instalable. Algunas tablets antiguas o
navegadores embebidos/in-app quedan fuera de esa matriz y no soportan ninguno de los dos, así
que la app debe seguir siendo jugable en "modo navegador normal" (sin instalación ni caché
avanzada) también ahí.

[`src/services/platformSupport.js`](src/services/platformSupport.js) centraliza la detección
de capacidades (`isServiceWorkerSupported`, `isManifestSupported`, `detectPwaSupport`): cada
comprobación degrada a `false` en vez de lanzar cuando falta el global correspondiente, así
que nunca bloquea el arranque. [`public/scripts/main.js`](public/scripts/main.js) expone el
mismo cálculo como `resolvePlatformSupport` (vía `require` bajo Node/Jest, duplicado en línea
para el navegador real sin bundler, mismo patrón dual que `loadDinoQuizStorage`/
`createBrowserHomeStorage`) y, si el navegador no tiene soporte completo,
`logPlatformSupportFallback` deja un `console.info` de diagnóstico -- sin evento de analytics
nuevo (los eventos enviados son exactamente los de AC-18) y sin ningún dato personal.

La garantía de que el juego sigue funcionando no depende de ese diagnóstico: `registerServiceWorker`
ya hace feature-detection (`'serviceWorker' in nav`) y es "fire and forget" en el arranque, y
`bootstrapBrowserApp` carga `/i18n/es.json` y `/data/questions.json` con `fetch` normal,
independientemente de si hay service worker registrado. Un navegador sin soporte PWA
simplemente no obtiene instalación ni caché offline avanzada -- pero completa igual el flujo
Inicio -> Quiz -> Resultados por red, como demuestra
[`tests/pwa/pwa-fallback.test.js`](tests/pwa/pwa-fallback.test.js) simulando un `navigator`
sin `serviceWorker`.

## Auditoría de accesibilidad automática (TRIOFSND-137)

El PRD (`mvp_scope`) exige "accesibilidad básica: contraste WCAG AA, controles grandes y
compatibilidad con lectores de pantalla" y una "política de privacidad accesible desde la
pantalla de inicio". Hasta ahora esto se verificaba solo con tests unitarios puntuales (p.ej.
[`src/theme/contrast.js`](src/theme/contrast.js)/`contrast.test.js` para pares de color
concretos) y comentarios de diseño en cada pantalla, sin una auditoría automática de extremo a
extremo. [`tests/e2e/accessibility.test.js`](tests/e2e/accessibility.test.js) añade esa
auditoría con [axe-core](https://github.com/dequelabs/axe-core) (vía
[`@axe-core/playwright`](https://www.npmjs.com/package/@axe-core/playwright)) contra las 4
pantallas principales de la PWA renderizadas en un Chromium real (`tests/e2e/server.js` sirve
`public/`, igual que `tests/e2e/offline-full-game.spec.js`). Es un test de **Jest** (no solo de
Playwright): sobrescribe `testEnvironment` a `node` (jsdom no puede pintar layout real para que
axe calcule contraste) y lanza Chromium directamente vía `chromium` de `@playwright/test`, sin
pasar por su test runner. Esto permite que la auditoría corra dentro de `jest`, que es lo que
ejecuta el pipeline de CI/build del frontend:

1. **Inicio** (`/`).
2. **Quiz** (pantalla de pregunta, tras pulsar "¡Jugar!").
3. **Resultados** (tras completar las 10 preguntas de una partida).
4. **Política de privacidad** (`#/privacidad`, enlazada desde Inicio).

Cada pantalla se analiza contra las reglas WCAG 2.0/2.1 A y AA de axe-core
(`wcag2a`/`wcag2aa`/`wcag21a`/`wcag21aa`), que cubren exactamente lo que pide esta historia:
contraste de color (`color-contrast`), roles/atributos ARIA (`aria-*`, `button-name`,
`aria-allowed-attr`...) y presencia de labels/alt-text (`image-alt`, `label`, `link-name`...).
El test falla si axe reporta **cualquier** violación en esas reglas para la pantalla
correspondiente — el listado de violaciones (regla, impacto y nodo afectado) queda en el
`expect` fallido.

**Cómo ejecutarla en local:**

```bash
npm run test:e2e:install   # una vez, instala Chromium para Playwright/axe
npm run test:a11y          # solo la auditoría de accesibilidad (jest)
npm test                   # toda la suite (unitarios + auditoría de accesibilidad)
```

**Resultado de la auditoría inicial (base para el Definition of Done "auditoría de
accesibilidad básica"):** las 4 pantallas pasan sin violaciones WCAG 2.0/2.1 A/AA — consistente
con el trabajo previo de contraste (`src/theme/contrast.js`), `alt`/`aria-label` explícitos en
imágenes e iconos (`homeScreen.js`, `questionScreen.js`) y el patrón de disclosure ARIA de los
controles globales (`aria-expanded`/`aria-controls`). Si una PR futura introduce una regresión,
`npm run test:a11y` la reproduce en local con el mismo detalle que en el `expect` de la suite.

**Enganchada al pipeline de CI:** el workflow gestionado por TrioForge
(`.github/workflows/trioforge-tests.yml`) ejecuta `npx jest --ci` contra todo el repo, y
`tests/e2e/accessibility.test.js` cae dentro de `testMatch` (`tests/**/*.test.js`) como un test
de Jest más — por eso una regresión de contraste, rol ARIA o label/alt-text hace fallar ese gate
igual que cualquier otro test, sin necesitar un paso de CI dedicado a Playwright. Lo único que el
pipeline necesita para poder lanzar Chromium es el binario del navegador: el script
`postinstall` (`npm run test:e2e:install`) lo instala automáticamente en cada `npm ci`/`npm
install`, antes de que corra `jest`.

## Auditoría de privacidad y tráfico de red (TRIOFSND-119)

El PRD (G7) exige evitar cuentas, PII, publicidad, tracking individual y cualquier transmisión
del progreso del niño fuera del dispositivo. DinoQuiz no tiene backend (ver arriba), así que esa
garantía se reduce a tres afirmaciones concretas, cada una con su propia prueba automatizada:

1. **Ninguna llamada de red sale del propio origen** (nada de dominios publicitarios/tracking).
2. **No hay SDK publicitario ni identificador de dispositivo/publicidad (IDFA/GAID)** en el bundle.
3. **Los eventos de analytics emitidos coinciden exactamente con una lista aprobada** y no
   llevan campos no validados (PII).

### Suite automatizada

| Comprueba | Cómo | Fichero |
|---|---|---|
| (1) Dominios de red | Escaneo estático de todo `.js` de `public/`+`src/` en busca de dominios de una lista de bloqueo (Google/Meta Ads, Mixpanel, AppsFlyer, Unity Ads...) y de cualquier URL absoluta fuera de un allowlist mínimo; también verifica que `public/index.html` sólo carga recursos del propio origen y que `LogService.sendLogs` (el único punto que podría hacer POST fuera del dispositivo) nunca se invoca desde código shippeado | [`tests/privacy-audit/network-domains.test.js`](tests/privacy-audit/network-domains.test.js) |
| (1) Dinámico, navegador real | Playwright juega una partida completa (Inicio -> edad -> 10 preguntas -> Resultados -> Volver a jugar) y registra *toda* petición de red del `page`; falla si alguna tiene un origen distinto al de la app | [`tests/e2e/privacy-network-audit.spec.js`](tests/e2e/privacy-network-audit.spec.js) |
| (2) SDK publicitario / IDFA-GAID | Revisa `package.json` contra una lista de paquetes de ads/atribución conocidos, escanea el código en busca de identificadores tipo IDFA/GAID/AdMob/AppsFlyer/etc., y confirma que `rewardedAdService` (`public/scripts/adsService.js`) sigue usando únicamente el proveedor `unavailableProvider` | [`tests/privacy-audit/no-ad-tracking-sdk.test.js`](tests/privacy-audit/no-ad-tracking-sdk.test.js) |
| (3) Lista aprobada de eventos + campos | Extrae de forma estática todo nombre de evento realmente emitido (`recordEvent`/`recordEventOnce`/`recordGameCompleted`/`logEvent`) y lo compara, en ambas direcciones, contra la lista aprobada; valida que el evento `pregunta_respondida` y cualquier `metadata` de `logEvent`/`recordEvent` sólo llevan campos permitidos (nunca nombre/edad/email/IP/IDFA/GAID/etc.) | [`tests/privacy-audit/analytics-events.test.js`](tests/privacy-audit/analytics-events.test.js) |

La lista aprobada de eventos, los campos permitidos por evento y la lista de campos PII
prohibidos viven en un único sitio, **fuente de verdad** que la suite de arriba usa como
referencia: [`src/services/analytics/approvedEvents.js`](src/services/analytics/approvedEvents.js)
(`APPROVED_ANALYTICS_EVENTS`, `QUESTION_ANSWERED_EVENT_FIELDS`, `APPROVED_LOG_EVENT_TYPES`,
`PII_FIELD_DENYLIST`). Añadir un evento nuevo requiere declararlo ahí explícitamente -- si el
código emite un nombre que no está en la lista (o dejar de emitir uno que sí lo está), la suite
falla.

Ejecución:

```bash
npm test -- tests/privacy-audit                 # auditoría estática (parte de `npm test`)
npm run test:e2e:install && npm run test:e2e -- tests/e2e/privacy-network-audit.spec.js  # auditoría dinámica, navegador real
```

### Procedimiento de auditoría trimestral manual

La suite automatizada detecta regresiones dentro de lo que ya sabe buscar (una lista de
dominios/paquetes/eventos conocidos), pero no sustituye una revisión humana periódica. Cada
trimestre, quien haga la auditoría debe:

1. **Revisar dependencias nuevas**: `git diff` de `package.json`/`package-lock.json` desde la
   última auditoría; para cualquier paquete nuevo, comprobar que no es un SDK de ads/analytics/
   atribución (aunque su nombre no esté todavía en `AD_TRACKING_PACKAGES` de
   [`tests/privacy-audit/no-ad-tracking-sdk.test.js`](tests/privacy-audit/no-ad-tracking-sdk.test.js) --
   si lo es, añadirlo a esa lista aunque no se vaya a usar, para que la próxima vez la suite lo
   detecte sola).
2. **Revisar eventos nuevos**: `git log -p -- src/services/analytics/approvedEvents.js` desde la
   última auditoría para ver qué eventos se añadieron y por qué; para cada uno, confirmar que su
   justificación de producto sigue vigente y que ningún campo asociado es identificable
   individualmente.
3. **Ampliar las listas de bloqueo**: revisar si han aparecido nuevos dominios/SDKs de
   publicidad o tracking relevantes para el ecosistema web/PWA infantil desde la última revisión,
   y añadirlos a `AD_TRACKING_DOMAINS` ([`tests/privacy-audit/network-domains.test.js`](tests/privacy-audit/network-domains.test.js))
   y `AD_TRACKING_PACKAGES`/`AD_TRACKING_IDENTIFIERS`
   ([`tests/privacy-audit/no-ad-tracking-sdk.test.js`](tests/privacy-audit/no-ad-tracking-sdk.test.js))
   antes de re-ejecutar la suite -- una lista de bloqueo desactualizada no detecta lo que no
   conoce.
4. **Ejecutar la auditoría dinámica con DevTools abierto**: además de
   `npm run test:e2e -- tests/e2e/privacy-network-audit.spec.js`, abrir la app en un navegador
   real con la pestaña Network de DevTools, jugar una partida completa (incluida la instalación
   de la PWA) y confirmar visualmente que la columna "Domain" no muestra más origen que el de la
   propia app -- esto detecta peticiones que el test automatizado no capturaría por
   condición de carrera o por depender de una interacción no cubierta (p.ej. un flujo nuevo).
5. **Releer `ageGateScreen.js` y la política de privacidad**: confirmar que la banda de edad
   sigue siendo estrictamente en memoria (nunca pasa a `analyticsStorage`/`LogService`/
   `localStorage`) y que el texto de `public/i18n/es.json` (claves `privacy.*`) describe con
   precisión los datos que el dispositivo guarda localmente.
6. **Dejar constancia**: registrar fecha, quién audita, hallazgos y qué listas se actualizaron
   (idealmente en el PR que actualiza este README y las listas del punto 3).
