'use strict';

/**
 * Diagnostics screen (TRIOFSND-319).
 *
 * The implementation lives in public/scripts/diagnosticsScreen.js because
 * the browser renders this screen directly, and without a bundler it must
 * be loaded there as a `<script>` (see public/index.html) -- the same
 * rationale documented for public/scripts/homeScreen.js. This canonical
 * `src/screens/` module re-exports it so Node/Jest keep a single source of
 * truth (mirrors src/screens/ModeBlockedScreen.js re-exporting
 * public/scripts/modeBlockedScreen.js).
 */

module.exports = require('../../public/scripts/diagnosticsScreen');
