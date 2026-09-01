'use strict';

/**
 * Local diagnostics service (TRIOFSND-317/TRIOFSND-319, PRD "Diagnóstico y
 * métricas agregadas almacenadas únicamente en el dispositivo"): aggregated
 * counters, seven-day retention and structured error codes, all local-only.
 *
 * The implementation lives in public/scripts/diagnostics.js because the
 * diagnostics screen (public/scripts/diagnosticsScreen.js) renders directly
 * in the browser and, without a bundler, must load it there as a `<script>`
 * (see public/index.html) -- the same rationale documented for
 * public/scripts/offlineStatus.js and public/scripts/homeScreen.js. This
 * canonical `src/services/` module re-exports it so Node/Jest and other
 * `src/` modules keep a single source of truth (mirrors
 * src/services/roundDiagnosticsService.js re-exporting
 * public/scripts/roundDiagnosticsService.js).
 *
 * Each concept lives under its own `dinoquiz:metrics:*`/
 * `dinoquiz:diagnostics:*` key, plain localStorage like
 * nicknameService.js/hallOfFameService.js -- a handful of small aggregated
 * values, not a whole game session. Every write degrades to an in-memory
 * store when localStorage is unavailable or throws, so counters/errors/
 * retention keep accumulating for the rest of this page load instead of
 * being silently lost.
 *
 * `incrementCounter(name)` never interprets `name` -- it is only ever an
 * opaque aggregation key a caller chooses, e.g. `selectorOpen`,
 * `gameStarted:parejas`, `gamesByModeLevel:clasifica:2`,
 * `correctAnswers:oidoJurasico`, `starsEarned:timeline` (called once per
 * star to add an amount), `unlocks:laberinto` -- covering aperturas del
 * selector, partidas iniciadas/completadas/abandonadas por modo, partidas
 * por modo y nivel, aciertos/estrellas agregados por modo y desbloqueos por
 * modo, without this module needing to know about modes or levels at all.
 *
 * Privacy (PRD "ningún dato generado por el jugador puede salir del
 * dispositivo", "analítica remota ... fuera del dispositivo" out of scope):
 * counters are aggregated names/counts only, never round content;
 * `recordError` persists only today's local date, mode, category and a
 * stable code, never the player's answer/selection. Retention is derived
 * purely from local calendar dates already recorded on this device -- no
 * install/advertising id is read, generated or sent anywhere.
 */

module.exports = require('../../public/scripts/diagnostics');
