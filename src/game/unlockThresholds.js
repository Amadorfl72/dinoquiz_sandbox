'use strict';

/**
 * Per-mode/level unlock-threshold configuration (TRIOFSND-248).
 *
 * The implementation lives in public/scripts/unlockThresholds.js because
 * gameFlow.js (public/scripts/gameFlow.js) has to look it up live in the
 * browser without a bundler — it is loaded there as a `<script>` (see
 * public/index.html), following the same pattern as
 * public/scripts/homeScreen.js. This canonical `src/game/` module re-exports
 * it so Node/Jest keep a single source of truth (mirrors how
 * src/i18n/index.js loads public/i18n/es.json).
 */

module.exports = require('../../public/scripts/unlockThresholds');
