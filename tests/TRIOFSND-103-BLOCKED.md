# TRIOFSND-103 — Pruebas E2E del flujo de rejugar y salir: BLOQUEADO

Este ticket pedía únicamente pruebas E2E (sin tocar producto). Antes de
escribirlas, la historia exige verificar una puerta de contratos (`§2`); si
falta alguno, el resultado correcto es **BLOQUEADO**, registrando el
contrato ausente en vez de fabricarlo desde la prueba. Dos contratos
obligatorios faltan, cada uno suficiente por sí solo para bloquear:

## 1. No hay un ID de dominio estable expuesto en el DOM

`renderQuestionScreen` (`public/scripts/questionScreen.js`) construye el
`.question-screen` con imagen, enunciado (`h2.question-screen__prompt`),
puntuación, opciones, feedback y dato curioso — pero nunca escribe
`question.id` en ningún nodo (ni atributo `data-*`, ni texto, ni `aria-*`).
`question.id` solo se usa puertas adentro, en `public/scripts/main.js`
(líneas 386, 400-403, 496), para analítica/almacenamiento local; nunca
llega al DOM.

Sin ese ID visible, una prueba E2E que solo interactúe con controles
visibles no tiene forma de identificar cada pregunta salvo por su texto,
índice o posición — exactamente lo que la historia prohíbe explícitamente
("no se permite... identificar preguntas mediante sus textos o
posiciones").

## 2. No hay mecanismo soportado por la app que gobierne el RNG del replay real

`startNewGame(container, renderers, questions, doc, fetchFn, randomFn, ...)`
(`public/scripts/main.js:467`) sí acepta un `randomFn` inyectable, reenviado
a `gameFlow.selectGameQuestions` (`public/scripts/gameFlow.js:95-124`). Pero
los dos puntos de invocación reales lo fijan a `undefined`:

- Primera partida desde Inicio: `public/scripts/main.js:980`.
- **"Volver a jugar"** (`onPlayAgain`, el flujo que esta historia debe
  probar): `public/scripts/main.js:438`.

No existe ningún parámetro de URL, hook de `window`, config o fixture
oficial que permita fijar una semilla desde fuera del módulo (búsqueda
exhaustiva de `seed`/hooks de test en `public/` y `src/` sin resultados).
`randomFn` es, en la práctica, un parámetro exclusivo de tests unitarios que
llaman a `startNewGame` directamente — nunca queda conectado al clic real
de "Volver a jugar", que siempre usa `Math.random()` sin forma de
controlarlo. Por tanto no hay manera de "fijar la semilla... antes de
iniciar la primera partida" de forma que "permanezca efectiva en el replay
real", como exige el criterio de determinismo verificable.

(Nota aparte, no compensa lo anterior: la no-repetición entre partidas ya
está garantizada estructuralmente por `selectGameQuestions`'s
`previousQuestionIds` — con el banco real de 40 preguntas, el pool "fresco"
tiene 30 candidatas para 10 huecos, así que todo replay real es
disjunto del anterior sea cual sea el valor de `Math.random()`. Eso no
sustituye el contrato de mecanismo determinista exigido por la puerta, y en
cualquier caso no resuelve el problema del ID del punto 1.)

## Resultado

No se añade ningún archivo de especificación E2E ni se modifica código de
producción, infraestructura, fixtures, page objects o pruebas existentes.
Ambos huecos pertenecen al producto compartido y deben resolverse en
historias funcionales separadas antes de reintentar TRIOFSND-103:

1. Exponer el ID estable de la pregunta activa en el DOM (p.ej. un atributo
   `data-question-id` en `.question-screen`), independiente del texto,
   índice o posición.
2. Proveer un mecanismo soportado por la aplicación (semilla, RNG
   inyectable accesible desde fuera del módulo, o fixture oficial) que
   también gobierne la selección real al pulsar "Volver a jugar", no solo
   las llamadas directas a `startNewGame` desde tests unitarios.
