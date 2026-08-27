'use strict';

/**
 * Last-selected mode persistence (TRIOFSND-230).
 *
 * The implementation lives in public/scripts/modeStorage.js because the
 * illustrated mode selector (public/scripts/modeSelectorScreen.js,
 * TRIOFSND-231) has to read/write it live in the browser without a bundler —
 * it is loaded there as a `<script>` (see public/index.html), the same
 * rationale documented for public/scripts/homeScreen.js. This canonical
 * `src/services/` module re-exports it so Node/Jest keep a single source of
 * truth (mirrors how src/i18n/index.js loads public/i18n/es.json).
 */

module.exports = require('../../public/scripts/modeStorage');
