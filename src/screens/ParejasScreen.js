'use strict';

/**
 * Parejas jurásicas board screen (TRIOFSND-274).
 *
 * The implementation lives in public/scripts/parejasScreen.js because the
 * browser renders this screen directly, and without a bundler it must be
 * loaded there as a `<script>` (see public/index.html) — the same rationale
 * documented for public/scripts/mazeScreen.js. This canonical `src/screens/`
 * module re-exports it so Node/Jest keep a single source of truth.
 */

module.exports = require('../../public/scripts/parejasScreen');
