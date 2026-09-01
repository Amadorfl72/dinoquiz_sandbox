'use strict';

/**
 * Launch-gate status screen (TRIOFSND-325).
 *
 * The implementation lives in public/scripts/launchGateScreen.js because
 * the browser renders this screen directly, and without a bundler it must
 * be loaded there as a `<script>` (see public/index.html) -- the same
 * rationale documented for public/scripts/diagnosticsScreen.js. This
 * canonical `src/screens/` module re-exports it so Node/Jest keep a single
 * source of truth (mirrors src/screens/DiagnosticsScreen.js re-exporting
 * public/scripts/diagnosticsScreen.js).
 */

module.exports = require('../../public/scripts/launchGateScreen');
