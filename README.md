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
  "funFact": "...",             // dato curioso mostrado tras responder
  "image": "dinosaurs/trex.png" // referencia a la ilustración del dinosaurio
}
```

`loadQuestionBank()` lee el JSON y valida el esquema de cada pregunta (opciones, índice de
respuesta correcta, ids únicos, etc.). El banco cubre los 7 dinosaurios con al menos 3-4
preguntas cada uno.

## Pantalla de Inicio

[`src/screens/HomeScreen.js`](src/screens/HomeScreen.js) renderiza la pantalla de Inicio:
título "DinoQuiz", ilustración de la mascota, botón "¡Jugar!" y un aviso opcional y
discreto para madres/padres. El aviso explica que, al no haber cuenta ni sincronización
en la nube, el progreso local (puntuación, racha y datos curiosos) se pierde si se
reinstala la app o se cambia de dispositivo. Usa `role="note"` y no tiene `tabindex`, por
lo que un lector de pantalla puede alcanzarlo pero nunca interrumpe ni bloquea el flujo
del niño hacia el botón de jugar.

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

Todos los textos se gestionan desde el recurso i18n en [`src/i18n/es.json`](src/i18n/es.json)
(cargado a través de [`src/i18n/index.js`](src/i18n/index.js)); v1 solo expone el locale `es`.
