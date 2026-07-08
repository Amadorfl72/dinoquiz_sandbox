'use strict';

/**
 * Per-game state and new-game setup (TRIOFSND-100).
 *
 * The implementation lives in public/scripts/gameFlow.js because the app
 * shell (public/scripts/main.js) has to drive it in the browser without a
 * bundler — it is loaded there as a `<script>` (see public/index.html),
 * following the same pattern as public/scripts/homeScreen.js. This canonical
 * `src/game/` module re-exports it so Node/Jest keep a single source of truth
 * (mirrors how src/i18n/index.js loads public/i18n/es.json).
 */

module.exports = require('../../public/scripts/gameFlow');
