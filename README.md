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

[`src/screens/HomeScreen.js`](src/screens/HomeScreen.js) renderiza la pantalla de Inicio
(título, botón "¡Jugar!" y un aviso opcional y discreto para madres/padres). El aviso
explica que, al no haber cuenta ni sincronización en la nube, el progreso local
(puntuación, racha y datos curiosos) se pierde si se reinstala la app o se cambia de
dispositivo. Usa `role="note"` y no tiene `tabindex`, por lo que un lector de pantalla
puede alcanzarlo pero nunca interrumpe ni bloquea el flujo del niño hacia el botón de jugar.

Todos los textos se gestionan desde el recurso i18n en [`src/i18n/es.json`](src/i18n/es.json)
(cargado a través de [`src/i18n/index.js`](src/i18n/index.js)); v1 solo expone el locale `es`.
