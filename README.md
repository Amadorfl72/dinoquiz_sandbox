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
