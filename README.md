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

## Pantalla de Resultados

[`src/screens/ResultsScreen.js`](src/screens/ResultsScreen.js) renderiza la pantalla de
Resultados: puntuación (`X de 10`), estrellas (1-3, según los tramos 0-3 / 4-6 / 7-10 de
AC-8) con un mensaje motivador siempre positivo, el botón principal "Volver a jugar"
(altura mínima 64dp, área táctil ≥48x48dp y texto ≥24sp, per AC-2/AC-23) y el botón
secundario "Salir".

Al pulsar "Volver a jugar" la pantalla llama a `resetGameState()`
([`src/game/gameState.js`](src/game/gameState.js)), que reinicia puntuación, índice de
pregunta y respuestas, y a `navigateTo(SCREENS.QUESTION)`
([`src/navigation/navigator.js`](src/navigation/navigator.js)) para ir a la primera
pregunta de la nueva partida; al pulsar "Salir" navega a `SCREENS.HOME`. En ambos casos,
tras disparar ese reinicio/navegación real, se invoca el callback opcional
`onPlayAgain`/`onExit` que le pase quien integre la pantalla (por ejemplo para además
sustituir la pantalla renderizada en el DOM). Esto mantiene la pantalla testeable de forma
aislada, con `role="img"` y `aria-label` en las estrellas para TalkBack/VoiceOver y
contraste WCAG AA (`#ffffff` sobre `#2e7d32` ~5.1:1; `#1b5e20` sobre `#fff8e1` ~7.4:1). Los
textos viven en `results` dentro de [`src/i18n/es.json`](src/i18n/es.json).
