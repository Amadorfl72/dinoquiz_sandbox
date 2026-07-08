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

[`src/screens/HomeScreen.js`](src/screens/HomeScreen.js) renderiza la pantalla de Inicio
(título, botón "¡Jugar!" y un aviso opcional y discreto para madres/padres). El aviso
explica que, al no haber cuenta ni sincronización en la nube, el progreso local
(puntuación, racha y datos curiosos) se pierde si se reinstala la app o se cambia de
dispositivo. Usa `role="note"` y no tiene `tabindex`, por lo que un lector de pantalla
puede alcanzarlo pero nunca interrumpe ni bloquea el flujo del niño hacia el botón de jugar.

Todos los textos se gestionan desde el recurso i18n en [`src/i18n/es.json`](src/i18n/es.json)
(cargado a través de [`src/i18n/index.js`](src/i18n/index.js)); v1 solo expone el locale `es`.

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
