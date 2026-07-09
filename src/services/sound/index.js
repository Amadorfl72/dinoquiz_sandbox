'use strict';

/**
 * The implementation lives in public/scripts/soundService.js because the
 * browser plays these effects directly, and without a bundler it must be
 * loaded there as a `<script>` (see public/index.html) — the same rationale
 * documented for public/scripts/homeScreen.js. This canonical
 * `src/services/sound` module re-exports it so Node/Jest and other `src/`
 * modules (e.g. `src/screens/QuestionScreen.js`) keep a single source of
 * truth (mirrors how src/game/scoring.js loads public/scripts/scoring.js).
 */
module.exports = require('../../../public/scripts/soundService');
