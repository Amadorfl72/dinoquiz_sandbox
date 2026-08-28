# Créditos y licencia — imágenes de cartas (modo Parejas jurásicas)

El modo "Parejas jurásicas" (memoria de criaturas prehistóricas, PRD G3) usa
dos tipos de imagen por carta:

- **Anverso (cara de la criatura):** reutiliza directamente las catorce
  ilustraciones cartoon ya existentes en
  [`public/assets/images/dinosaurs/`](../dinosaurs) (ver el `CREDITS.md` de
  esa carpeta) — una ficha, una única fuente para el quiz y para Parejas, sin
  duplicar el asset ni su licencia.
- **Reverso (dorso común de toda carta boca abajo):** único fichero nuevo de
  esta tarea, `back.svg`.

`back.svg` es obra original creada específicamente para DinoQuiz: un dorso de
carta decorativo con el marco y la paleta ya usados en el resto de la app
(verde `#2E7D32`/`#1B5E20`, crema `#FFF8E1`) más un óvalo con manchas que
evoca un huevo de dinosaurio, sin texto incrustado ni información que varíe
entre criaturas — es intencionadamente idéntico para cualquier carta boca
abajo, ya que identificar qué criatura hay debajo es el propio objetivo del
juego. Se referenciará como `<img alt="" aria-hidden="true">` (igual que los
iconos de `public/assets/images/modes/`, ver ese `CREDITS.md`): la etiqueta
accesible de cada carta ("carta boca abajo, posición N", "carta con
[criatura]") vendrá del botón que la envuelve y de `public/i18n/es.json`, no
de la imagen.

| Fichero | Descripción | Autor | Licencia |
|---|---|---|---|
| back.svg | Dorso común de carta (huevo decorativo) | DinoQuiz | CC0 1.0 (dominio público) |

CC0 1.0: https://creativecommons.org/publicdomain/zero/1.0/deed.es — uso, copia y
modificación libres, sin atribución requerida.

Esta tarea (TRIOFSND-275) solo añade y confirma las imágenes; el cableado de
`PRECACHE_URLS` en `public/service-worker.js` (con el incremento de
`SW_VERSION` correspondiente) y la integración visual en el tablero de
Parejas se hacen en la tarea de integración del modo, que depende de esta.
