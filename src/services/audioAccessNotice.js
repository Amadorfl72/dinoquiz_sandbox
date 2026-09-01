'use strict';

/**
 * Documented accessibility contracts for interactive game modes (TRIOFSND-314).
 *
 * Two independent, PRD-mandated contracts live here so a mode doesn't have
 * to re-derive either rule from a sibling screen's implementation:
 *
 * 1. AUDIO_MUTED_NOTICE_CONTRACT -- PRD: "cualquier reproducción debe
 *    respetar dinoquiz:muted desde el primer intento". Any mode where the
 *    audio itself IS the content the player must hear (Oído Jurásico today,
 *    any future audio mode) must, before attempting playback, check
 *    `dinoquiz:muted` and -- if active -- show an accessible notice with
 *    exactly the two actions below instead of attempting silent/blocked
 *    playback. The reusable check itself lives in
 *    `public/scripts/soundService.js`'s `checkMutedBeforeAudioMode(strings)`
 *    (`src/services/sound` re-exports it); this module documents the shape
 *    that check's result must satisfy so a screen and its tests can assert
 *    against one shared source instead of inventing their own.
 *
 * 2. DRAG_SELECTION_ALTERNATIVE_CONTRACT -- PRD: "todos los modos deben ser
 *    navegables con teclado y anunciables por lector de pantalla". Any mode
 *    whose primary interaction is drag/swipe (Laberinto, Ordena por tamaño,
 *    Parejas jurásicas today; any future mode with the same shape) must also
 *    expose a fully operable "select, then confirm" alternative -- the same
 *    tap-to-select pattern the quiz's own answer options already use
 *    (`public/scripts/questionScreen.js`) -- so a keyboard/switch/no-drag
 *    player can complete the mode without ever performing a drag gesture.
 *    `public/scripts/sizeOrderScreen.js` already ships this (its own doc
 *    comment cites the AC "sin arrastrar ni deslizar"): tapping/activating a
 *    creature selects it, activating a second one swaps them, with no
 *    `dragstart`/`drop` listener anywhere in the module; `mazeScreen.js` and
 *    `parejasScreen.js` follow the same rule structurally (native
 *    `<button>`s driven by tap/click/Enter/Space, `mazeScreen.js`
 *    additionally mapping arrow keys) rather than any drag/pointer-capture
 *    API. This module doesn't re-implement that pattern -- it's the single
 *    documented reference so a new mode design doesn't ship a drag-only
 *    interaction and only discover the gap during manual accessibility
 *    testing.
 */

const AUDIO_MUTED_NOTICE_CONTRACT = Object.freeze({
  id: 'audio-muted-notice',
  rule:
    'Before any playback attempt, check dinoquiz:muted (soundService.js ' +
    'checkMutedBeforeAudioMode) and, when muted, render the notice instead ' +
    'of the playable board -- never call Audio.play() while muted.',
  requiredActions: Object.freeze(['unmuteButton', 'backButton']),
  requiredStringKeys: Object.freeze(['heading', 'message', 'unmuteButton', 'backButton']),
  sharedDefaultStringsPath: 'audioAccessNotice',
  appliesTo: Object.freeze(['oidoJurasico']),
});

const DRAG_SELECTION_ALTERNATIVE_CONTRACT = Object.freeze({
  id: 'drag-selection-alternative',
  rule:
    'Any drag/swipe interaction must also be fully completable via ' +
    'tap-to-select (the same pattern the quiz answer options use), so ' +
    'keyboard/switch/no-drag players can finish the mode without ever ' +
    'performing a drag gesture.',
  referenceImplementation: 'public/scripts/questionScreen.js (quiz answer options)',
  appliesTo: Object.freeze(['maze', 'sizeOrder', 'parejas']),
});

module.exports = {
  AUDIO_MUTED_NOTICE_CONTRACT,
  DRAG_SELECTION_ALTERNATIVE_CONTRACT,
};
