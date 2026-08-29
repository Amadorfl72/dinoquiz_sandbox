# Checklist de revisión manual de accesibilidad (TRIOFSND-315)

> Complemento manual explícito que exige la Definition of Done junto a la auditoría
> automatizada. La auditoría automática ([`tests/e2e/accessibility.test.js`](../e2e/accessibility.test.js),
> `npm run test:a11y` — ver README "Auditoría de accesibilidad automática (TRIOFSND-137)") cubre
> con axe-core el contraste de color, los roles/atributos ARIA y la presencia de labels/alt-text
> en 4 pantallas, pero **no puede verificar** si la navegación por teclado sigue un orden
> comprensible, si lo que anuncia un lector de pantalla tiene sentido para quien lo escucha, ni si
> alguna pantalla depende en exclusiva de color/sonido/animación para transmitir información —
> eso requiere una persona (QA o la persona adulta responsable de contenido) probando la app de
> verdad. Este documento es esa checklist manual.

Esta revisión responde directamente a los criterios de aceptación de la historia y a las
restricciones del PRD (`constraints`):

- "Ninguna información o estado puede comunicarse únicamente mediante color."
- "Todos los modos deben ser navegables con teclado y anunciables por lector de pantalla."
- "El texto debe cumplir WCAG AA con una relación de contraste mínima de 4.5:1" (ya cubierto por
  la auditoría automática; aquí solo se re-confirma visualmente donde el axe-core no llega, p.ej.
  estados `:hover`/`:focus` y contenido dinámico tras interacción).
- "Todo texto visible o anunciado debe proceder de `public/i18n/`."
- "Cualquier reproducción debe respetar `dinoquiz:muted` desde el primer intento" (relevante para
  no depender exclusivamente del sonido).

## Cuándo aplicarla

Antes de desplegar cualquier modo nuevo o cualquier cambio de UI en un modo existente, y como
mínimo una vez por modo antes de que ese modo salga de detrás de su control interno (PRD
`delivery`: "podrán implementarse y validarse como fases independientes detrás de controles
internos hasta completar la iniciativa"). Quien apruebe la PR deja constancia de haber repasado
esta checklist en la propia revisión (comentario o aprobación de PR), igual que el checklist de
revisión humana de contenido científico descrito en el README ("Revisión humana de contenido
científico").

## Modos a cubrir

Cada partida (`shared_game_structure`) es un flujo Inicio → selector de modo → 10 rondas →
Resultados. La checklist de abajo se repite para cada uno de los ocho modos:

| Modo | Pantalla (`public/scripts/`) |
|---|---|
| Quiz | `questionScreen.js` |
| Laberinto | `mazeScreen.js` |
| Adivina la sombra | `shadowGuessScreen.js` |
| Oído Jurásico | `oidoJurasicoScreen.js` |
| Parejas jurásicas | `parejasScreen.js` |
| Clasifica | `classifyScreen.js` |
| Ordena por tamaño | `sizeOrderScreen.js` |
| Línea del tiempo | `timelineScreen.js` |

Además, repetir el bloque 1 (navegación por teclado) y el bloque 2 (lector de pantalla) sobre las
pantallas comunes del flujo: Inicio, selector de edad, selector de modo, confirmación de cambio de
modo, Resultados y política de privacidad.

## 1. Navegación completa solo con teclado

Sin tocar la pantalla ni usar el ratón/trackpad, para cada modo/pantalla de la tabla:

- [ ] Se puede completar una partida entera (las 10 rondas) usando solo `Tab`/`Shift+Tab` para
      moverse entre controles y `Enter`/`Espacio` para activarlos.
- [ ] El orden de foco (`Tab`) sigue el orden visual/lógico de la pantalla — nunca salta de forma
      sorprendente ni se queda atrapado en un control (sin "trampas de foco").
- [ ] Todo control interactivo (opción de respuesta, casilla del laberinto/tablero, carta de
      Parejas, botón "Siguiente"/"Repetir sonido"/"Reproducir de nuevo") es alcanzable y
      accionable por teclado, no solo por gesto táctil (`constraints`: "Todos los modos deben ser
      navegables con teclado").
- [ ] El indicador visual de foco (contorno/resaltado) es visible en todo momento sobre cada
      control, con contraste suficiente para distinguirlo del estado sin foco.
- [ ] Tras responder una ronda, el foco se mueve a un lugar predecible (p.ej. el botón
      "Siguiente" o el feedback), en vez de perderse o volver al principio de la página.
- [ ] Se puede salir de la partida (volver a Inicio/selector de modo) y navegar la pantalla de
      Resultados enteramente por teclado.

## 2. Comprensión de los anuncios del lector de pantalla

Con un lector de pantalla real (VoiceOver en macOS/iOS, TalkBack en Android, o NVDA en Windows),
navegando cada modo/pantalla de la tabla de principio a fin:

- [ ] El nombre del modo, la instrucción de la ronda actual y el número de ronda (p.ej. "ronda 3
      de 10") se anuncian de forma comprensible al entrar en la pantalla, sin depender de leer la
      pantalla visualmente.
- [ ] Cada control interactivo se anuncia con un nombre accesible que basta por sí solo para
      entender qué hace (p.ej. no "botón" a secas, ni "imagen" sin descripción) — confirmar que
      ese nombre proviene de una clave de `public/i18n/es.json`, nunca de un texto generado ad
      hoc (`constraints`: "Todo texto visible o anunciado debe proceder de `public/i18n/`").
- [ ] El feedback de acierto/error de cada ronda se anuncia automáticamente (región `aria-live`)
      sin que la persona tenga que buscarlo manualmente con el lector, y el mensaje anunciado
      tiene sentido escuchado en voz alta (no es solo un icono o un color descrito de forma
      ambigua).
- [ ] En pantallas con contenido visual complejo (sombra a adivinar, tablero de Clasifica, cartas
      de Parejas, línea temporal), lo que anuncia el lector permite entender la opción sin haberla
      visto — si no es así, anotar la pantalla como hallazgo, no dar el check por bueno.
- [ ] La pantalla de Resultados anuncia la puntuación normalizada (porcentaje/estrellas) y si se
      desbloqueó el siguiente nivel, de forma comprensible sin ver la pantalla.

## 3. Ausencia de dependencia exclusiva de color, sonido o animación

Para cada modo/pantalla de la tabla, confirmar que ninguna información o estado se comunica
**únicamente** por uno de estos tres canales (`constraints`: "Ninguna información o estado puede
comunicarse únicamente mediante color"):

- [ ] **Color**: los estados de acierto/error, bloqueado/desbloqueado y selección/no-selección se
      distinguen también por texto, icono o forma (no solo por el color de fondo/borde). Probar
      con un simulador de daltonismo (p.ej. las herramientas de accesibilidad de DevTools) o en
      escala de grises: la pantalla sigue siendo utilizable.
- [ ] **Sonido**: en Oído Jurásico en particular (y en cualquier feedback sonoro de acierto/error
      de otros modos), la información también está disponible en texto/visual cuando el audio
      está silenciado — activar `dinoquiz:muted` (silenciar desde el control global) y confirmar
      que se puede seguir jugando y entendiendo el resultado de cada ronda sin oír nada
      (`constraints`: "Cualquier reproducción debe respetar `dinoquiz:muted` desde el primer
      intento").
- [ ] **Animación**: ninguna mecánica exige percibir un movimiento o una transición para
      completarse (p.ej. algo que aparece y desaparece demasiado rápido) — probar con
      `prefers-reduced-motion` activado en el sistema operativo y confirmar que el modo sigue
      siendo jugable y comprensible con las animaciones reducidas/desactivadas.

## Registro de la revisión

Quien complete esta checklist debe anotar, en el comentario o aprobación de la PR correspondiente:

- Fecha de la revisión y modos cubiertos.
- Lector de pantalla y plataforma usados (p.ej. "VoiceOver, iOS Safari").
- Cualquier incumplimiento encontrado, como hallazgo bloqueante hasta corregirse — esta checklist
  no sustituye a la auditoría automática (`npm run test:a11y`), la complementa: ambas deben
  quedar en verde/conformes antes de desplegar.
