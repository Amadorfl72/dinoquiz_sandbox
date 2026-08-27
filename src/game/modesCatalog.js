'use strict';

/**
 * Canonical catalog of the eight DinoQuiz game modes and the pure per-mode
 * availability evaluator (TRIOFSND-228).
 *
 * The implementation lives in public/scripts/modesCatalog.js because the
 * illustrated mode selector (public/scripts/modeSelectorScreen.js,
 * TRIOFSND-231) has to evaluate it live in the browser without a bundler —
 * it is loaded there as a `<script>` (see public/index.html), the same
 * rationale documented for public/scripts/homeScreen.js. This canonical
 * `src/game/` module re-exports it so Node/Jest and other `src/` modules
 * keep a single source of truth (mirrors how src/i18n/index.js loads
 * public/i18n/es.json).
 */

module.exports = require('../../public/scripts/modesCatalog');
