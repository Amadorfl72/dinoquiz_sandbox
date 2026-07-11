'use strict';

/**
 * Answer scoring for the Pregunta/Feedback screen (TRIOFSND-77, TRIOFSND-88).
 *
 * The implementation lives in public/scripts/scoring.js because, without a
 * bundler, the browser must load it directly as a `<script>` (see
 * public/index.html) — the same rationale documented for
 * public/scripts/homeScreen.js. This canonical `src/game/` module re-exports
 * it so Node/Jest and other `src/` modules keep a single source of truth
 * (mirrors how src/i18n/index.js loads public/i18n/es.json).
 */

module.exports = require('../../public/scripts/scoring');
