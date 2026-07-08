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

## Pantalla de Inicio

[`src/screens/HomeScreen.js`](src/screens/HomeScreen.js) renderiza la pantalla de Inicio
(título, botón "¡Jugar!" y un aviso opcional y discreto para madres/padres). El aviso
explica que, al no haber cuenta ni sincronización en la nube, el progreso local
(puntuación, racha y datos curiosos) se pierde si se reinstala la app o se cambia de
dispositivo. Usa `role="note"` y no tiene `tabindex`, por lo que un lector de pantalla
puede alcanzarlo pero nunca interrumpe ni bloquea el flujo del niño hacia el botón de jugar.

Todos los textos se gestionan desde el recurso i18n en [`src/i18n/es.json`](src/i18n/es.json)
(cargado a través de [`src/i18n/index.js`](src/i18n/index.js)); v1 solo expone el locale `es`.
