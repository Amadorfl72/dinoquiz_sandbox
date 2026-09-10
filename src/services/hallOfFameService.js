'use strict';

/**
 * Hall of Fame local persistence (TRIOFSND, "Salón de la Fama").
 *
 * The implementation lives in public/scripts/hallOfFameService.js because
 * both public/scripts/main.js's game-finish flow and the Hall of Fame
 * screen (public/scripts/hallOfFameScreen.js) have to read/write it live in
 * the browser without a bundler -- it is loaded there as a `<script>` (see
 * public/index.html), the same rationale documented for
 * public/scripts/modeStorage.js. This canonical `src/services/` module
 * re-exports it so Node/Jest keep a single source of truth (mirrors how
 * src/services/modeStorage.js loads public/scripts/modeStorage.js).
 */

module.exports = require('../../public/scripts/hallOfFameService');
